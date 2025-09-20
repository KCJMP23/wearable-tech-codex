import { createClient } from '@supabase/supabase-js';

export interface AnalyticsConfig {
  id: string;
  tenantId: string;
  googleAnalyticsId?: string;
  gtmId?: string;
  facebookPixelId?: string;
  tiktokPixelId?: string;
  customTrackingCode?: string;
  enableCookieConsent: boolean;
  dataRetentionDays: number;
  anonymizeIPs: boolean;
  trackingDomains: string[];
  excludedPaths: string[];
  customDimensions: Record<string, string>;
  customMetrics: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsEvent {
  id: string;
  tenantId: string;
  eventName: string;
  eventData: Record<string, any>;
  userId?: string;
  sessionId: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  userAgent: string;
  ipAddress: string;
  country?: string;
  city?: string;
  referrer?: string;
  page: string;
  timestamp: string;
}

export interface ConversionEvent {
  id: string;
  tenantId: string;
  conversionType: 'purchase' | 'signup' | 'lead' | 'custom';
  value?: number;
  currency?: string;
  productId?: string;
  userId?: string;
  sessionId: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface AnalyticsReport {
  tenantId: string;
  period: string;
  metrics: {
    pageviews: number;
    uniqueVisitors: number;
    sessions: number;
    bounceRate: number;
    avgSessionDuration: number;
    conversionRate: number;
    revenue?: number;
  };
  topPages: Array<{
    path: string;
    views: number;
    conversionRate: number;
  }>;
  topReferrers: Array<{
    source: string;
    visits: number;
    conversionRate: number;
  }>;
  conversionFunnel: Array<{
    step: string;
    users: number;
    conversionRate: number;
  }>;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  locationData: Array<{
    country: string;
    visitors: number;
  }>;
}

export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  timestamp: string;
}

export class TenantAnalytics {
  private supabase;
  private config: AnalyticsConfig | null = null;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Get tenant analytics configuration
   */
  async getAnalyticsConfig(tenantId: string): Promise<AnalyticsConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_analytics_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return this.getDefaultAnalyticsConfig(tenantId);
      }

      this.config = this.transformAnalyticsConfigData(data);
      return this.config;
    } catch (error) {
      console.error('Error fetching analytics config:', error);
      return this.getDefaultAnalyticsConfig(tenantId);
    }
  }

  /**
   * Update tenant analytics configuration
   */
  async updateAnalyticsConfig(
    tenantId: string,
    config: Partial<AnalyticsConfig>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('tenant_analytics_config')
        .upsert({
          tenant_id: tenantId,
          google_analytics_id: config.googleAnalyticsId,
          gtm_id: config.gtmId,
          facebook_pixel_id: config.facebookPixelId,
          tiktok_pixel_id: config.tiktokPixelId,
          custom_tracking_code: config.customTrackingCode,
          enable_cookie_consent: config.enableCookieConsent !== false,
          data_retention_days: config.dataRetentionDays || 365,
          anonymize_ips: config.anonymizeIPs !== false,
          tracking_domains: config.trackingDomains || [],
          excluded_paths: config.excludedPaths || [],
          custom_dimensions: config.customDimensions || {},
          custom_metrics: config.customMetrics || {},
          is_active: config.isActive !== false,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Generate tracking scripts for tenant
   */
  generateTrackingScripts(config: AnalyticsConfig): string {
    const scripts: string[] = [];

    // Google Analytics 4
    if (config.googleAnalyticsId) {
      scripts.push(this.generateGoogleAnalyticsScript(config));
    }

    // Google Tag Manager
    if (config.gtmId) {
      scripts.push(this.generateGTMScript(config.gtmId));
    }

    // Facebook Pixel
    if (config.facebookPixelId) {
      scripts.push(this.generateFacebookPixelScript(config.facebookPixelId));
    }

    // TikTok Pixel
    if (config.tiktokPixelId) {
      scripts.push(this.generateTikTokPixelScript(config.tiktokPixelId));
    }

    // Custom tracking code
    if (config.customTrackingCode) {
      scripts.push(config.customTrackingCode);
    }

    // White-label analytics
    scripts.push(this.generateCustomAnalyticsScript(config));

    return scripts.join('\n');
  }

  /**
   * Generate Google Analytics script
   */
  private generateGoogleAnalyticsScript(config: AnalyticsConfig): string {
    const anonymizeIP = config.anonymizeIPs ? 'true' : 'false';
    
    return `
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${config.googleAnalyticsId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  
  gtag('config', '${config.googleAnalyticsId}', {
    anonymize_ip: ${anonymizeIP},
    cookie_flags: 'SameSite=None;Secure',
    ${Object.entries(config.customDimensions || {}).map(([key, value]) => 
      `custom_map.${key}: '${value}'`
    ).join(',\n    ')}
  });
</script>`;
  }

  /**
   * Generate GTM script
   */
  private generateGTMScript(gtmId: string): string {
    return `
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');</script>
<!-- End Google Tag Manager -->

<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
  }

  /**
   * Generate Facebook Pixel script
   */
  private generateFacebookPixelScript(pixelId: string): string {
    return `
<!-- Facebook Pixel -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
/></noscript>`;
  }

  /**
   * Generate TikTok Pixel script
   */
  private generateTikTokPixelScript(pixelId: string): string {
    return `
<!-- TikTok Pixel -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${pixelId}');
  ttq.page();
}(window, document, 'ttq');
</script>`;
  }

  /**
   * Generate custom analytics script
   */
  private generateCustomAnalyticsScript(config: AnalyticsConfig): string {
    return `
<!-- White-label Analytics -->
<script>
(function() {
  var analytics = {
    tenantId: '${config.tenantId}',
    sessionId: Math.random().toString(36).substring(7),
    
    track: function(eventName, properties) {
      if (!this.shouldTrack()) return;
      
      var eventData = {
        tenant_id: this.tenantId,
        event_name: eventName,
        event_data: properties || {},
        session_id: this.sessionId,
        page: window.location.pathname,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        device_type: this.getDeviceType(),
        timestamp: new Date().toISOString()
      };
      
      this.sendEvent(eventData);
    },
    
    trackPageView: function() {
      this.track('page_view', {
        page: window.location.pathname,
        title: document.title
      });
    },
    
    trackConversion: function(type, value, currency, metadata) {
      var conversionData = {
        tenant_id: this.tenantId,
        conversion_type: type,
        value: value,
        currency: currency || 'USD',
        session_id: this.sessionId,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      };
      
      this.sendConversion(conversionData);
    },
    
    sendEvent: function(data) {
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      }).catch(function(error) {
        console.error('Analytics error:', error);
      });
    },
    
    sendConversion: function(data) {
      fetch('/api/analytics/conversions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      }).catch(function(error) {
        console.error('Conversion tracking error:', error);
      });
    },
    
    getDeviceType: function() {
      var ua = navigator.userAgent;
      if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
      if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\\sce|palm|smartphone|iemobile/i.test(ua)) return 'mobile';
      return 'desktop';
    },
    
    shouldTrack: function() {
      ${config.enableCookieConsent ? `
      var consent = localStorage.getItem('cookie-consent');
      if (!consent) return false;
      var consentData = JSON.parse(consent);
      return consentData.analytics === true;
      ` : 'return true;'}
    }
  };
  
  // Auto-track page view
  analytics.trackPageView();
  
  // Track page views on navigation
  var originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(history, arguments);
    setTimeout(function() { analytics.trackPageView(); }, 0);
  };
  
  // Make analytics available globally
  window.tenantAnalytics = analytics;
})();
</script>`;
  }

  /**
   * Generate cookie consent banner
   */
  generateCookieConsentBanner(config: AnalyticsConfig): string {
    if (!config.enableCookieConsent) return '';

    return `
<!-- Cookie Consent Banner -->
<div id="cookie-consent-banner" style="display: none; position: fixed; bottom: 0; left: 0; right: 0; background: #333; color: white; padding: 20px; z-index: 10000;">
  <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;">
    <div style="flex: 1; margin-right: 20px;">
      <h3 style="margin: 0 0 10px 0;">Cookie Preferences</h3>
      <p style="margin: 0; opacity: 0.9;">We use cookies to enhance your experience and analyze site usage.</p>
    </div>
    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
      <button onclick="cookieConsent.acceptAll()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Accept All</button>
      <button onclick="cookieConsent.showPreferences()" style="background: transparent; color: white; border: 1px solid white; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Customize</button>
      <button onclick="cookieConsent.declineAll()" style="background: transparent; color: white; border: 1px solid white; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Decline</button>
    </div>
  </div>
</div>

<script>
var cookieConsent = {
  show: function() {
    if (!localStorage.getItem('cookie-consent')) {
      document.getElementById('cookie-consent-banner').style.display = 'block';
    }
  },
  
  acceptAll: function() {
    var consent = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    this.hide();
    location.reload();
  },
  
  declineAll: function() {
    var consent = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    this.hide();
  },
  
  showPreferences: function() {
    // Open detailed preferences modal
    alert('Detailed cookie preferences would open here');
  },
  
  hide: function() {
    document.getElementById('cookie-consent-banner').style.display = 'none';
  }
};

// Show banner on load
cookieConsent.show();
</script>`;
  }

  /**
   * Track event
   */
  async trackEvent(
    tenantId: string,
    eventData: Omit<AnalyticsEvent, 'id' | 'tenantId' | 'timestamp'>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('analytics_events')
        .insert({
          tenant_id: tenantId,
          event_name: eventData.eventName,
          event_data: eventData.eventData,
          user_id: eventData.userId,
          session_id: eventData.sessionId,
          device_type: eventData.deviceType,
          user_agent: eventData.userAgent,
          ip_address: eventData.ipAddress,
          country: eventData.country,
          city: eventData.city,
          referrer: eventData.referrer,
          page: eventData.page,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Track conversion
   */
  async trackConversion(
    tenantId: string,
    conversionData: Omit<ConversionEvent, 'id' | 'tenantId' | 'timestamp'>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('conversion_events')
        .insert({
          tenant_id: tenantId,
          conversion_type: conversionData.conversionType,
          value: conversionData.value,
          currency: conversionData.currency,
          product_id: conversionData.productId,
          user_id: conversionData.userId,
          session_id: conversionData.sessionId,
          metadata: conversionData.metadata,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Generate analytics report
   */
  async generateReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsReport | null> {
    try {
      // This would typically involve complex SQL queries
      // For brevity, showing the structure
      
      const metrics = await this.getMetrics(tenantId, startDate, endDate);
      const topPages = await this.getTopPages(tenantId, startDate, endDate);
      const topReferrers = await this.getTopReferrers(tenantId, startDate, endDate);
      const deviceBreakdown = await this.getDeviceBreakdown(tenantId, startDate, endDate);

      return {
        tenantId,
        period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
        metrics,
        topPages,
        topReferrers,
        conversionFunnel: [], // Would be calculated based on events
        deviceBreakdown,
        locationData: [], // Would be calculated from IP data
      };
    } catch (error) {
      console.error('Error generating analytics report:', error);
      return null;
    }
  }

  /**
   * Helper methods for report generation
   */
  private async getMetrics(tenantId: string, startDate: Date, endDate: Date) {
    // Complex aggregation queries would go here
    return {
      pageviews: 0,
      uniqueVisitors: 0,
      sessions: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
      conversionRate: 0,
      revenue: 0,
    };
  }

  private async getTopPages(tenantId: string, startDate: Date, endDate: Date) {
    return [];
  }

  private async getTopReferrers(tenantId: string, startDate: Date, endDate: Date) {
    return [];
  }

  private async getDeviceBreakdown(tenantId: string, startDate: Date, endDate: Date) {
    return {
      desktop: 0,
      mobile: 0,
      tablet: 0,
    };
  }

  /**
   * Transform database data
   */
  private transformAnalyticsConfigData(data: any): AnalyticsConfig {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      googleAnalyticsId: data.google_analytics_id,
      gtmId: data.gtm_id,
      facebookPixelId: data.facebook_pixel_id,
      tiktokPixelId: data.tiktok_pixel_id,
      customTrackingCode: data.custom_tracking_code,
      enableCookieConsent: data.enable_cookie_consent,
      dataRetentionDays: data.data_retention_days,
      anonymizeIPs: data.anonymize_ips,
      trackingDomains: data.tracking_domains || [],
      excludedPaths: data.excluded_paths || [],
      customDimensions: data.custom_dimensions || {},
      customMetrics: data.custom_metrics || {},
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get default analytics config
   */
  private getDefaultAnalyticsConfig(tenantId: string): AnalyticsConfig {
    return {
      id: 'default',
      tenantId,
      enableCookieConsent: true,
      dataRetentionDays: 365,
      anonymizeIPs: true,
      trackingDomains: [],
      excludedPaths: ['/admin', '/api'],
      customDimensions: {},
      customMetrics: {},
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const tenantAnalytics = new TenantAnalytics();