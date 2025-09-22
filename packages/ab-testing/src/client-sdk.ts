import mitt, { Handler } from 'mitt';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  UserContext,
  Assignment,
  ExposureEvent,
  ConversionEvent
} from './types.js';

type ABTestingClientEvents = {
  ready: undefined;
  error: unknown;
  assignment: { experimentId: string; assignment: Assignment };
  flag: { flagId: string; value: boolean | unknown };
  conversion: ConversionEvent;
  track: { eventName: string; properties?: Record<string, unknown> };
  exposure: ExposureEvent;
  flush: { count: number };
  user_update: UserContext;
};

export class ABTestingClient {
  private apiUrl: string;
  private apiKey: string;
  private context: UserContext;
  private assignments: Map<string, Assignment> = new Map();
  private featureFlags: Map<string, boolean | unknown> = new Map();
  private eventQueue: Array<ExposureEvent | ConversionEvent> = [];
  private flushTimer?: NodeJS.Timeout;
  private emitter = mitt<ABTestingClientEvents>();
  private initialized = false;

  constructor(config: ABTestingConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.context = this.buildContext(config.user);

    if (config.autoFlush !== false) {
      this.startAutoFlush(config.flushInterval || 10000);
    }

    if (config.autoTrackPageViews !== false) {
      this.trackPageViews();
    }

    this.initialize();
  }

  private async initialize() {
    try {
      // Fetch active experiments and feature flags
      await this.fetchActiveExperiments();
      await this.fetchFeatureFlags();
      this.initialized = true;
      this.emitter.emit('ready');
    } catch (error) {
      console.error('Failed to initialize A/B testing client:', error);
      this.emitter.emit('error', error);
    }
  }

  private buildContext(user?: Partial<UserContext>): UserContext {
    const context: UserContext = {
      sessionId: this.getOrCreateSessionId(),
      ...user
    };

    // Add browser context if in browser environment
    if (typeof window !== 'undefined') {
      context.device = {
        type: this.getDeviceType(),
        browser: this.getBrowser(),
        os: this.getOS()
      };

      context.geo = {
        // Would be fetched from IP geolocation service
      };

      context.referrer = document.referrer;
      context.utm = this.getUTMParams();
    }

    return context;
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') {
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    const key = 'ab_session_id';
    let sessionId = sessionStorage.getItem(key);
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(key, sessionId);
    }

    return sessionId;
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';

    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private getBrowser(): string {
    if (typeof window === 'undefined') return 'unknown';

    const userAgent = navigator.userAgent;
    
    if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
    if (userAgent.indexOf('Safari') > -1) return 'Safari';
    if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
    if (userAgent.indexOf('Edge') > -1) return 'Edge';
    
    return 'Other';
  }

  private getOS(): string {
    if (typeof window === 'undefined') return 'unknown';

    const userAgent = navigator.userAgent;
    
    if (userAgent.indexOf('Windows') > -1) return 'Windows';
    if (userAgent.indexOf('Mac') > -1) return 'macOS';
    if (userAgent.indexOf('Linux') > -1) return 'Linux';
    if (userAgent.indexOf('Android') > -1) return 'Android';
    if (userAgent.indexOf('iOS') > -1) return 'iOS';
    
    return 'Other';
  }

  private getUTMParams(): UserContext['utm'] {
    if (typeof window === 'undefined') return {};

    const params = new URLSearchParams(window.location.search);
    
    return {
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
      term: params.get('utm_term') || undefined,
      content: params.get('utm_content') || undefined
    };
  }

  // Get variant assignment for an experiment
  public async getVariant(experimentId: string): Promise<string> {
    // Check cache first
    if (this.assignments.has(experimentId)) {
      return this.assignments.get(experimentId)!.variantId;
    }

    try {
      const response = await fetch(`${this.apiUrl}/experiments/${experimentId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ context: this.context })
      });

      if (!response.ok) {
        throw new Error(`Failed to get variant: ${response.statusText}`);
      }

      const assignment: Assignment = await response.json();
      this.assignments.set(experimentId, assignment);

      // Track exposure
      this.trackExposure(experimentId, assignment.variantId);

      // Emit event
      this.emitter.emit('assignment', { experimentId, assignment });

      return assignment.variantId;
    } catch (error) {
      console.error('Failed to get variant:', error);
      return 'control'; // Fallback to control
    }
  }

  // Get feature flag value
  public async getFeatureFlag(flagId: string): Promise<boolean | unknown> {
    // Check cache first
    if (this.featureFlags.has(flagId)) {
      return this.featureFlags.get(flagId)!;
    }

    try {
      const response = await fetch(`${this.apiUrl}/flags/${flagId}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ context: this.context })
      });

      if (!response.ok) {
        throw new Error(`Failed to evaluate flag: ${response.statusText}`);
      }

      const value = await response.json();
      this.featureFlags.set(flagId, value);

      // Emit event
      this.emitter.emit('flag', { flagId, value });

      return value;
    } catch (error) {
      console.error('Failed to get feature flag:', error);
      return false; // Fallback to false
    }
  }

  // Track conversion event
  public trackConversion(
    experimentId: string,
    metricId: string,
    value?: number,
    revenue?: number
  ): void {
    const assignment = this.assignments.get(experimentId);
    if (!assignment || !assignment.isInExperiment) {
      return; // Don't track if not in experiment
    }

    const event: ConversionEvent = {
      experimentId,
      variantId: assignment.variantId,
      metricId,
      userId: this.context.userId,
      sessionId: this.context.sessionId,
      value,
      revenue,
      context: this.context,
      timestamp: new Date()
    };

    this.eventQueue.push(event);
    this.emitter.emit('conversion', event);

    // Flush if queue is large
    if (this.eventQueue.length >= 50) {
      this.flush();
    }
  }

  // Track custom event
  public track(eventName: string, properties?: Record<string, unknown>): void {
    // Check if this event is tied to any experiments
    this.assignments.forEach((assignment, experimentId) => {
      if (assignment.isInExperiment) {
        this.trackConversion(experimentId, eventName, 1);
      }
    });

    this.emitter.emit('track', { eventName, properties });
  }

  private trackExposure(experimentId: string, variantId: string): void {
    const event: ExposureEvent = {
      experimentId,
      variantId,
      userId: this.context.userId,
      sessionId: this.context.sessionId,
      context: this.context,
      timestamp: new Date()
    };

    this.eventQueue.push(event);
    this.emitter.emit('exposure', event);
  }

  private trackPageViews(): void {
    if (typeof window === 'undefined') return;

    // Track initial page view
    this.track('page_view', {
      path: window.location.pathname,
      referrer: document.referrer
    });

    // Track navigation changes (for SPAs)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.track('page_view', { path: window.location.pathname });
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.track('page_view', { path: window.location.pathname });
    };

    window.addEventListener('popstate', () => {
      this.track('page_view', { path: window.location.pathname });
    });
  }

  private async fetchActiveExperiments(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/experiments/active`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) return;

      const experiments = await response.json();
      
      // Pre-fetch assignments for active experiments
      for (const experiment of experiments) {
        await this.getVariant(experiment.id);
      }
    } catch (error) {
      console.error('Failed to fetch active experiments:', error);
    }
  }

  private async fetchFeatureFlags(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/flags`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) return;

      const flags = await response.json();
      
      // Pre-evaluate feature flags
      for (const flag of flags) {
        await this.getFeatureFlag(flag.id);
      }
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
    }
  }

  // Flush events to server
  public async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(`${this.apiUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ events: eventsToFlush })
      });

      if (!response.ok) {
        // Re-add events to queue for retry
        this.eventQueue.unshift(...eventsToFlush);
        throw new Error(`Failed to flush events: ${response.statusText}`);
      }

      this.emitter.emit('flush', { count: eventsToFlush.length });
    } catch (error) {
      console.error('Failed to flush events:', error);
      // Events remain in queue for next flush
    }
  }

  private startAutoFlush(interval: number): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, interval);

    // Also flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  // Update user context
  public updateUser(user: Partial<UserContext>): void {
    this.context = {
      ...this.context,
      ...user
    };

    // Clear caches as assignments might change
    this.assignments.clear();
    this.featureFlags.clear();

    // Re-fetch assignments
    this.fetchActiveExperiments();
    this.fetchFeatureFlags();

    this.emitter.emit('user_update', this.context);
  }

  // Event listeners
  public on<K extends keyof ABTestingClientEvents>(
    event: K,
    handler: Handler<ABTestingClientEvents[K]>
  ): void {
    this.emitter.on(event, handler);
  }

  public off<K extends keyof ABTestingClientEvents>(
    event: K,
    handler: Handler<ABTestingClientEvents[K]>
  ): void {
    this.emitter.off(event, handler);
  }

  // Wait for initialization
  public ready(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.emitter.on('ready', () => resolve());
    });
  }

  // Get all current assignments
  public getAssignments(): Map<string, Assignment> {
    return new Map(this.assignments);
  }

  // Get all feature flags
  public getFeatureFlags(): Map<string, boolean | unknown> {
    return new Map(this.featureFlags);
  }

  // Cleanup
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
    this.emitter.all.clear();
  }
}

// React Hook for A/B Testing
export function useABTesting(client: ABTestingClient) {
  const [ready, setReady] = useState(false);
  const [assignments, setAssignments] = useState<Map<string, Assignment>>(new Map());
  const [flags, setFlags] = useState<Map<string, boolean | unknown>>(new Map());

  useEffect(() => {
    const handleReady = () => {
      setReady(true);
      setAssignments(client.getAssignments());
      setFlags(client.getFeatureFlags());
    };

    const handleAssignment = () => {
      setAssignments(client.getAssignments());
    };

    const handleFlag = () => {
      setFlags(client.getFeatureFlags());
    };

    client.on('ready', handleReady);
    client.on('assignment', handleAssignment);
    client.on('flag', handleFlag);

    // Check if already ready
    client.ready().then(() => {
      handleReady();
    });

    return () => {
      client.off('ready', handleReady);
      client.off('assignment', handleAssignment);
      client.off('flag', handleFlag);
    };
  }, [client]);

  const getVariant = useCallback(async (experimentId: string) => {
    return client.getVariant(experimentId);
  }, [client]);

  const getFlag = useCallback(async (flagId: string) => {
    return client.getFeatureFlag(flagId);
  }, [client]);

  const trackConversion = useCallback((
    experimentId: string,
    metricId: string,
    value?: number,
    revenue?: number
  ) => {
    client.trackConversion(experimentId, metricId, value, revenue);
  }, [client]);

  const track = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    client.track(eventName, properties);
  }, [client]);

  return {
    ready,
    assignments,
    flags,
    getVariant,
    getFlag,
    trackConversion,
    track
  };
}

// React component for variant rendering
interface VariantProps {
  experimentId: string;
  client: ABTestingClient;
  children: (variant: string) => ReactNode;
}

export function Variant({ experimentId, client, children }: VariantProps) {
  const [variant, setVariant] = useState<string>('control');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.getVariant(experimentId).then(v => {
      setVariant(v);
      setLoading(false);
    });
  }, [experimentId, client]);

  if (loading) {
    return null; // Or loading spinner
  }

  return children(variant);
}

// Helper functions for React
interface ABTestingConfig {
  apiUrl: string;
  apiKey: string;
  user?: Partial<UserContext>;
  autoFlush?: boolean;
  flushInterval?: number;
  autoTrackPageViews?: boolean;
}
