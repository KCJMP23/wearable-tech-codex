'use client';

interface EventData {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

interface ConversionEvent {
  productId?: string;
  productName?: string;
  price?: number;
  conversionType: 'click' | 'view' | 'add_to_cart' | 'purchase';
  source?: string;
  medium?: string;
  campaign?: string;
}

interface FunnelStage {
  stage: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

class AnalyticsTracker {
  private sessionId: string;
  private userId?: string;
  private funnelStages: FunnelStage[] = [];
  private eventQueue: EventData[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracker();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracker() {
    // Initialize session tracking
    if (typeof window !== 'undefined') {
      // Listen for page visibility changes to pause/resume tracking
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.flushEvents();
        }
      });

      // Track page views automatically
      this.trackPageView();

      // Set up periodic event flushing
      this.startEventFlushing();

      // Track scroll depth
      this.trackScrollDepth();

      // Track time on page
      this.trackTimeOnPage();
    }
  }

  // Core tracking methods
  public trackEvent(data: EventData) {
    const event = {
      ...data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
    };

    this.eventQueue.push(event);

    // Flush immediately for high-priority events
    if (data.category === 'conversion' || data.category === 'purchase') {
      this.flushEvents();
    }
  }

  public trackConversion(event: ConversionEvent) {
    this.trackEvent({
      category: 'conversion',
      action: event.conversionType,
      label: event.productName || event.productId,
      value: event.price,
      metadata: {
        productId: event.productId,
        source: event.source || this.getTrafficSource(),
        medium: event.medium || this.getTrafficMedium(),
        campaign: event.campaign || this.getTrafficCampaign(),
      },
    });

    // Update funnel stage
    this.updateFunnelStage(event.conversionType);
  }

  public trackFunnelStage(stage: string) {
    const funnelStage: FunnelStage = {
      stage,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.funnelStages.push(funnelStage);
    
    this.trackEvent({
      category: 'funnel',
      action: 'stage_reached',
      label: stage,
      metadata: {
        previousStage: this.funnelStages[this.funnelStages.length - 2]?.stage,
        stageNumber: this.funnelStages.length,
      },
    });
  }

  private updateFunnelStage(conversionType: string) {
    const stageMap: Record<string, string> = {
      'view': 'Product View',
      'click': 'Product Click',
      'add_to_cart': 'Add to Cart',
      'purchase': 'Purchase Complete',
    };

    const stage = stageMap[conversionType];
    if (stage) {
      this.trackFunnelStage(stage);
    }
  }

  // Automatic tracking methods
  private trackPageView() {
    this.trackEvent({
      category: 'page',
      action: 'view',
      label: document.title,
      metadata: {
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      },
    });
  }

  private trackScrollDepth() {
    let maxScroll = 0;
    const checkpoints = [25, 50, 75, 100];
    const tracked = new Set<number>();

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        
        checkpoints.forEach(checkpoint => {
          if (scrollPercent >= checkpoint && !tracked.has(checkpoint)) {
            tracked.add(checkpoint);
            this.trackEvent({
              category: 'engagement',
              action: 'scroll',
              label: `${checkpoint}%`,
              value: checkpoint,
            });
          }
        });
      }
    };

    window.addEventListener('scroll', this.throttle(handleScroll, 500));
  }

  private trackTimeOnPage() {
    const startTime = Date.now();
    const checkpoints = [10, 30, 60, 120, 300]; // seconds
    const tracked = new Set<number>();

    const checkTime = setInterval(() => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      checkpoints.forEach(checkpoint => {
        if (timeSpent >= checkpoint && !tracked.has(checkpoint)) {
          tracked.add(checkpoint);
          this.trackEvent({
            category: 'engagement',
            action: 'time_on_page',
            label: `${checkpoint}s`,
            value: checkpoint,
          });
        }
      });

      // Stop tracking after 5 minutes
      if (timeSpent > 300) {
        clearInterval(checkTime);
      }
    }, 5000);
  }

  // Click tracking for affiliate links
  public trackAffiliateClick(productId: string, productName: string, merchantUrl: string) {
    this.trackEvent({
      category: 'affiliate',
      action: 'click',
      label: productName,
      metadata: {
        productId,
        merchantUrl,
        position: this.getClickPosition(),
      },
    });

    this.trackConversion({
      productId,
      productName,
      conversionType: 'click',
    });
  }

  // Heatmap tracking
  public trackClick(x: number, y: number, element: string) {
    this.trackEvent({
      category: 'heatmap',
      action: 'click',
      label: element,
      metadata: {
        x,
        y,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      },
    });
  }

  // Helper methods
  private getTrafficSource(): string {
    const referrer = document.referrer;
    if (!referrer) return 'direct';
    
    const url = new URL(referrer);
    const hostname = url.hostname;
    
    if (hostname.includes('google')) return 'google';
    if (hostname.includes('facebook')) return 'facebook';
    if (hostname.includes('twitter')) return 'twitter';
    if (hostname.includes('linkedin')) return 'linkedin';
    
    return 'referral';
  }

  private getTrafficMedium(): string {
    const params = new URLSearchParams(window.location.search);
    return params.get('utm_medium') || 'organic';
  }

  private getTrafficCampaign(): string {
    const params = new URLSearchParams(window.location.search);
    return params.get('utm_campaign') || '';
  }

  private getClickPosition(): string {
    // Determine position of click on page (above-fold, below-fold, sidebar, etc.)
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    
    if (scrollY < viewportHeight) {
      return 'above-fold';
    } else if (scrollY < viewportHeight * 2) {
      return 'first-scroll';
    } else {
      return 'below-fold';
    }
  }

  // Event queue management
  private startEventFlushing() {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, this.flushInterval);
  }

  private async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send events to analytics API
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          sessionId: this.sessionId,
          userId: this.userId,
        }),
      });
    } catch (error) {
      // Re-queue events on failure
      console.error('Failed to send analytics events:', error);
      this.eventQueue.unshift(...events);
    }
  }

  // Utility methods
  private throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Public methods for manual tracking
  public setUserId(userId: string) {
    this.userId = userId;
  }

  public getFunnelData() {
    return this.funnelStages;
  }

  public getSessionId() {
    return this.sessionId;
  }

  // Cleanup
  public destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushEvents();
  }
}

// Singleton instance
let analyticsTracker: AnalyticsTracker | null = null;

export function getAnalyticsTracker(): AnalyticsTracker {
  if (!analyticsTracker && typeof window !== 'undefined') {
    analyticsTracker = new AnalyticsTracker();
  }
  return analyticsTracker!;
}

// Convenience exports
export const trackEvent = (data: EventData) => {
  const tracker = getAnalyticsTracker();
  if (tracker) tracker.trackEvent(data);
};

export const trackConversion = (event: ConversionEvent) => {
  const tracker = getAnalyticsTracker();
  if (tracker) tracker.trackConversion(event);
};

export const trackAffiliateClick = (productId: string, productName: string, merchantUrl: string) => {
  const tracker = getAnalyticsTracker();
  if (tracker) tracker.trackAffiliateClick(productId, productName, merchantUrl);
};

export const trackFunnelStage = (stage: string) => {
  const tracker = getAnalyticsTracker();
  if (tracker) tracker.trackFunnelStage(stage);
};