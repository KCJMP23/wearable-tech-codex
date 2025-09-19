'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { 
  AnalyticsEvent, 
  RealtimeMetrics,
  AffiliateNetwork,
  MCPServer,
  Experiment 
} from '@/lib/services';

export function useRealtimeAnalytics(tenantId: string, interval = 30000) {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/realtime?tenantId=${tenantId}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchMetrics();
    
    // Set up polling
    intervalRef.current = setInterval(fetchMetrics, interval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMetrics, interval]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

export function useRealtimeEvents(tenantId: string) {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Set up real-time subscription
    const channel = supabase
      .channel('analytics_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_events',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newEvent = payload.new as AnalyticsEvent;
          setEvents(prev => [newEvent, ...prev.slice(0, 99)]); // Keep last 100 events
        }
      )
      .subscribe();

    // Initial load
    const loadInitialEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('analytics_events')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error('Failed to load initial events:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialEvents();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, supabase]);

  return { events, loading };
}

export function useRealtimeAffiliateNetworks(tenantId: string) {
  const [networks, setNetworks] = useState<AffiliateNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('affiliate_networks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'affiliate_networks',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNetworks(prev => [...prev, payload.new as AffiliateNetwork]);
          } else if (payload.eventType === 'UPDATE') {
            setNetworks(prev => 
              prev.map(network => 
                network.id === payload.new.id ? payload.new as AffiliateNetwork : network
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setNetworks(prev => 
              prev.filter(network => network.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Initial load
    const loadNetworks = async () => {
      try {
        const { data, error } = await supabase
          .from('affiliate_networks')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNetworks(data || []);
      } catch (err) {
        console.error('Failed to load networks:', err);
      } finally {
        setLoading(false);
      }
    };

    loadNetworks();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, supabase]);

  return { networks, loading };
}

export function useRealtimeMCPServers(tenantId: string) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('mcp_servers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mcp_servers',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setServers(prev => [...prev, payload.new as MCPServer]);
          } else if (payload.eventType === 'UPDATE') {
            setServers(prev => 
              prev.map(server => 
                server.id === payload.new.id ? payload.new as MCPServer : server
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setServers(prev => 
              prev.filter(server => server.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Initial load
    const loadServers = async () => {
      try {
        const { data, error } = await supabase
          .from('mcp_servers')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setServers(data || []);
      } catch (err) {
        console.error('Failed to load servers:', err);
      } finally {
        setLoading(false);
      }
    };

    loadServers();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, supabase]);

  return { servers, loading };
}

export function useRealtimeExperiments(tenantId: string) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('experiments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'experiments',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setExperiments(prev => [...prev, payload.new as Experiment]);
          } else if (payload.eventType === 'UPDATE') {
            setExperiments(prev => 
              prev.map(experiment => 
                experiment.id === payload.new.id ? payload.new as Experiment : experiment
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setExperiments(prev => 
              prev.filter(experiment => experiment.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Also listen to experiment results updates
    const resultsChannel = supabase
      .channel('experiment_results')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'experiment_results',
        },
        () => {
          // Refresh experiments when results change
          loadExperiments();
        }
      )
      .subscribe();

    // Initial load
    const loadExperiments = async () => {
      try {
        const { data, error } = await supabase
          .from('experiments')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setExperiments(data || []);
      } catch (err) {
        console.error('Failed to load experiments:', err);
      } finally {
        setLoading(false);
      }
    };

    loadExperiments();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(resultsChannel);
    };
  }, [tenantId, supabase]);

  return { experiments, loading };
}

export function useRealtimeNotifications(tenantId: string) {
  const [notifications, setNotifications] = useState<{
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  }[]>([]);

  const supabase = createClient();

  useEffect(() => {
    // Listen to various events that should trigger notifications
    const channels = [
      // Network sync status changes
      supabase
        .channel('network_notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'affiliate_networks',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            const network = payload.new as AffiliateNetwork;
            if (network.sync_status === 'error') {
              addNotification('error', 'Sync Failed', 
                `Failed to sync ${network.name}. Check your credentials.`);
            } else if (network.sync_status === 'success') {
              addNotification('success', 'Sync Complete', 
                `Successfully synced data from ${network.name}.`);
            }
          }
        ),

      // MCP server status changes
      supabase
        .channel('server_notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'mcp_servers',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            const server = payload.new as MCPServer;
            if (server.status === 'error') {
              addNotification('error', 'Server Error', 
                `MCP Server ${server.name} encountered an error.`);
            } else if (server.status === 'active') {
              addNotification('success', 'Server Online', 
                `MCP Server ${server.name} is now active.`);
            }
          }
        ),

      // Experiment completion
      supabase
        .channel('experiment_notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'experiments',
            filter: `tenant_id=eq.${tenantId}`,
          },
          (payload) => {
            const experiment = payload.new as Experiment;
            if (experiment.status === 'completed') {
              addNotification('info', 'Experiment Complete', 
                `A/B test "${experiment.name}" has finished. Check results.`);
            }
          }
        ),
    ];

    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [tenantId, supabase]);

  const addNotification = useCallback((
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    message: string
  ) => {
    const notification = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    };

    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { 
    notifications, 
    unreadCount, 
    addNotification, 
    markAsRead, 
    clearAll 
  };
}

// Custom hook for managing visitor sessions
export function useVisitorSession() {
  const [visitorId, setVisitorId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Get or create visitor ID
    let storedVisitorId = localStorage.getItem('wearable_visitor_id');
    if (!storedVisitorId) {
      storedVisitorId = 'visitor_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('wearable_visitor_id', storedVisitorId);
    }
    setVisitorId(storedVisitorId);

    // Create session ID
    const newSessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    setSessionId(newSessionId);
  }, []);

  return { visitorId, sessionId };
}

// Hook for tracking page views and events
export function useAnalyticsTracking(tenantId: string) {
  const { visitorId, sessionId } = useVisitorSession();

  const trackEvent = useCallback(async (
    eventType: string,
    eventName?: string,
    properties?: Record<string, any>
  ) => {
    if (!visitorId || !sessionId) return;

    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          event: {
            visitor_id: visitorId,
            session_id: sessionId,
            event_type: eventType,
            event_name: eventName,
            page_url: window.location.href,
            referrer: document.referrer,
            properties,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, [tenantId, visitorId, sessionId]);

  const trackPageView = useCallback(() => {
    trackEvent('page_view');
  }, [trackEvent]);

  const trackClick = useCallback((element: string, properties?: Record<string, any>) => {
    trackEvent('click', element, properties);
  }, [trackEvent]);

  const trackConversion = useCallback((value?: number, properties?: Record<string, any>) => {
    trackEvent('conversion', 'purchase', { value, ...properties });
  }, [trackEvent]);

  // Auto-track page views
  useEffect(() => {
    if (visitorId && sessionId) {
      trackPageView();
    }
  }, [visitorId, sessionId, trackPageView]);

  return {
    visitorId,
    sessionId,
    trackEvent,
    trackPageView,
    trackClick,
    trackConversion,
  };
}