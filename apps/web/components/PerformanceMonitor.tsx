'use client';

import { useEffect } from 'react';
import { performanceBudgets, monitoringConfig } from '../config/performance';

/**
 * Performance Monitor Component
 * Tracks Core Web Vitals and reports to analytics
 */
export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined' || !monitoringConfig.enableRUM) return;

    // Sample rate check
    if (Math.random() > monitoringConfig.sampleRate) return;

    const reportWebVital = (metric: any) => {
      // Check against performance budgets
      const budget = performanceBudgets.webVitals[metric.name.toLowerCase() as keyof typeof performanceBudgets.webVitals];
      const isOverBudget = budget && metric.value > budget;

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Web Vital] ${metric.name}:`, {
          value: metric.value,
          rating: metric.rating,
          budget,
          overBudget: isOverBudget,
        });
      }

      // Send to analytics endpoint
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metric: metric.name,
            value: metric.value,
            rating: metric.rating,
            overBudget: isOverBudget,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          }),
        }).catch(() => {
          // Fail silently
        });
      }
    };

    // Import web-vitals dynamically
    import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB, onINP }) => {
      onCLS(reportWebVital);
      onFID(reportWebVital);
      onFCP(reportWebVital);
      onLCP(reportWebVital);
      onTTFB(reportWebVital);
      onINP(reportWebVital);
    });

    // Monitor navigation timing
    if (monitoringConfig.metrics.includes('navigation-timing')) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            
            // Calculate key metrics
            const metrics = {
              dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
              tcp: navEntry.connectEnd - navEntry.connectStart,
              ssl: navEntry.secureConnectionStart > 0 
                ? navEntry.connectEnd - navEntry.secureConnectionStart 
                : 0,
              ttfb: navEntry.responseStart - navEntry.requestStart,
              download: navEntry.responseEnd - navEntry.responseStart,
              domInteractive: navEntry.domInteractive - navEntry.fetchStart,
              domComplete: navEntry.domComplete - navEntry.fetchStart,
              loadComplete: navEntry.loadEventEnd - navEntry.fetchStart,
            };

            if (process.env.NODE_ENV === 'development') {
              console.log('[Navigation Timing]', metrics);
            }
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });
    }

    // Monitor resource timing
    if (monitoringConfig.metrics.includes('resource-timing')) {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        // Group resources by type
        const resourcesByType = entries.reduce((acc, entry) => {
          const resource = entry as PerformanceResourceTiming;
          const type = resource.initiatorType || 'other';
          
          if (!acc[type]) acc[type] = [];
          acc[type].push({
            name: resource.name,
            duration: resource.duration,
            size: resource.encodedBodySize,
            cached: resource.transferSize === 0,
          });
          
          return acc;
        }, {} as Record<string, any[]>);

        if (process.env.NODE_ENV === 'development') {
          console.log('[Resource Timing]', resourcesByType);
        }

        // Check resource count budgets
        Object.entries(resourcesByType).forEach(([type, resources]) => {
          const budgetKey = type === 'script' ? 'scripts' : 
                           type === 'link' ? 'stylesheets' : 
                           type === 'img' ? 'images' : null;
          
          if (budgetKey) {
            const budget = performanceBudgets.resources[budgetKey as keyof typeof performanceBudgets.resources];
            if (budget && resources.length > budget) {
              console.warn(`[Performance Budget] Too many ${type} resources: ${resources.length} (budget: ${budget})`);
            }
          }
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn('[Long Task]', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name,
              });
            }
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch {
        // Long task API might not be available
      }
    }

    // Monitor memory usage (Chrome only)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMemoryMB = Math.round(memory.usedJSHeapSize / 1048576);
        const totalMemoryMB = Math.round(memory.totalJSHeapSize / 1048576);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Memory] ${usedMemoryMB}MB / ${totalMemoryMB}MB`);
        }

        // Warn if memory usage is high
        if (usedMemoryMB > 100) {
          console.warn('[Performance] High memory usage detected:', usedMemoryMB, 'MB');
        }
      }, 30000); // Check every 30 seconds
    }
  }, []);

  return null; // This component doesn't render anything
}

/**
 * Development-only performance overlay
 */
export function PerformanceOverlay() {
  if (process.env.NODE_ENV !== 'development') return null;

  useEffect(() => {
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = 'performance-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 99999;
      max-width: 300px;
    `;

    const updateOverlay = () => {
      const metrics: string[] = [];

      // Get navigation timing
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (nav) {
        metrics.push(`TTFB: ${Math.round(nav.responseStart - nav.requestStart)}ms`);
        metrics.push(`DOM: ${Math.round(nav.domComplete - nav.fetchStart)}ms`);
        metrics.push(`Load: ${Math.round(nav.loadEventEnd - nav.fetchStart)}ms`);
      }

      // Get resource count
      const resources = performance.getEntriesByType('resource');
      metrics.push(`Resources: ${resources.length}`);

      // Get memory usage (Chrome only)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
        metrics.push(`Memory: ${usedMB}MB`);
      }

      overlay.innerHTML = metrics.join('<br>');
    };

    document.body.appendChild(overlay);
    updateOverlay();
    
    const interval = setInterval(updateOverlay, 1000);

    return () => {
      clearInterval(interval);
      overlay.remove();
    };
  }, []);

  return null;
}