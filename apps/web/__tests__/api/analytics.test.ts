import { describe, it, expect, vi } from 'vitest';
import { GET as realtimeGet } from '@/app/api/analytics/realtime/route';
import { POST as trackPost } from '@/app/api/analytics/track/route';

// Mock the analytics service
vi.mock('@/lib/services/analytics', () => ({
  analyticsService: {
    getRealtimeMetrics: vi.fn(),
    trackEvent: vi.fn(),
  },
}));

import { analyticsService } from '@/lib/services/analytics';

describe('/api/analytics', () => {
  describe('GET /api/analytics/realtime', () => {
    it('should return realtime metrics', async () => {
      const mockMetrics = {
        visitors: 1234,
        page_views: 5678,
        conversions: 89,
        revenue: 1234.56,
        bounce_rate: 45.2,
      };

      vi.mocked(analyticsService.getRealtimeMetrics).mockResolvedValue(mockMetrics);

      const request = new Request('http://localhost/api/analytics/realtime?tenantId=test-tenant');
      const response = await realtimeGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockMetrics);
      expect(analyticsService.getRealtimeMetrics).toHaveBeenCalledWith('test-tenant', '24h');
    });

    it('should handle custom time range', async () => {
      const mockMetrics = {
        visitors: 100,
        page_views: 500,
        conversions: 10,
        revenue: 123.45,
        bounce_rate: 30.0,
      };

      vi.mocked(analyticsService.getRealtimeMetrics).mockResolvedValue(mockMetrics);

      const request = new Request('http://localhost/api/analytics/realtime?tenantId=test-tenant&timeRange=1h');
      const response = await realtimeGet(request);

      expect(response.status).toBe(200);
      expect(analyticsService.getRealtimeMetrics).toHaveBeenCalledWith('test-tenant', '1h');
    });

    it('should return 400 for missing tenantId', async () => {
      const request = new Request('http://localhost/api/analytics/realtime');
      const response = await realtimeGet(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId is required');
    });

    it('should handle service errors', async () => {
      vi.mocked(analyticsService.getRealtimeMetrics).mockRejectedValue(new Error('Service error'));

      const request = new Request('http://localhost/api/analytics/realtime?tenantId=test-tenant');
      const response = await realtimeGet(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch analytics');
    });
  });

  describe('POST /api/analytics/track', () => {
    it('should track an event', async () => {
      vi.mocked(analyticsService.trackEvent).mockResolvedValue();

      const eventData = {
        tenantId: 'test-tenant',
        event: {
          visitor_id: 'visitor-123',
          session_id: 'session-456',
          event_type: 'page_view',
          page_url: 'https://example.com/test',
        },
      };

      const request = new Request('http://localhost/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      const response = await trackPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'test-tenant',
        expect.objectContaining({
          visitor_id: 'visitor-123',
          session_id: 'session-456',
          event_type: 'page_view',
          page_url: 'https://example.com/test',
          device_type: 'desktop',
          browser: 'unknown',
          country: 'unknown',
        })
      );
    });

    it('should enrich event with request headers', async () => {
      vi.mocked(analyticsService.trackEvent).mockResolvedValue();

      const eventData = {
        tenantId: 'test-tenant',
        event: {
          visitor_id: 'visitor-123',
          session_id: 'session-456',
          event_type: 'click',
          event_name: 'cta_button',
        },
      };

      const request = new Request('http://localhost/api/analytics/track', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'sec-ch-ua-mobile': '?1',
          'user-agent': 'Mozilla/5.0 Chrome/91.0',
          'cf-ipcountry': 'US',
        },
        body: JSON.stringify(eventData),
      });

      const response = await trackPost(request);

      expect(response.status).toBe(200);
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        'test-tenant',
        expect.objectContaining({
          device_type: 'mobile',
          browser: 'Mozilla/5.0',
          country: 'US',
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      const request = new Request('http://localhost/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'test-tenant' }), // missing event
      });

      const response = await trackPost(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId and event are required');
    });

    it('should handle service errors', async () => {
      vi.mocked(analyticsService.trackEvent).mockRejectedValue(new Error('Database error'));

      const eventData = {
        tenantId: 'test-tenant',
        event: {
          visitor_id: 'visitor-123',
          session_id: 'session-456',
          event_type: 'error',
        },
      };

      const request = new Request('http://localhost/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      const response = await trackPost(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to track event');
    });
  });
});