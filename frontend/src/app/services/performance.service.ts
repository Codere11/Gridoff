import { Injectable } from '@angular/core';

interface PerformanceMetric {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  lastTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private startTimes: { [key: string]: number } = {};
  private metrics: { [key: string]: PerformanceMetric } = {};
  private throttleLimits: { [key: string]: number } = {
    'Game Loop': 60,  // Log every 60th frame (~1s at 60 FPS)
    'NPC Update HTTP': 1,  // No throttle (every call)
    'Chat HTTP Request': 1,  // No throttle
    'Chat UI Update': 1,  // No throttle
    'Total Chat Latency': 1  // No throttle
  };
  private logEnabled = false;

  constructor() {
    // Initialize metrics for known operations
    Object.keys(this.throttleLimits).forEach(key => {
      this.metrics[key] = this.createEmptyMetric();
    });
  }

  enableLogging(enabled: boolean): void {
    this.logEnabled = enabled;
  }

  start(label: string): void {
    this.startTimes[label] = performance.now();
  }

  end(label: string): void {
    if (this.startTimes[label] !== undefined) {
      const duration = performance.now() - this.startTimes[label];
      
      // Initialize metric if it doesn't exist
      if (!this.metrics[label]) {
        this.metrics[label] = this.createEmptyMetric();
      }
      
      // Update metrics
      const metric = this.metrics[label];
      metric.count++;
      metric.totalTime += duration;
      metric.lastTime = duration;
      metric.minTime = Math.min(metric.minTime, duration);
      metric.maxTime = Math.max(metric.maxTime, duration);
      
      // Throttled logging
      const throttle = this.throttleLimits[label] || 1;
      if (this.logEnabled && metric.count % throttle === 0) {
        console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms (avg: ${(metric.totalTime / metric.count).toFixed(2)}ms)`);
      }
      
      delete this.startTimes[label];
    } else if (this.logEnabled) {
      console.warn(`[Performance] No start time for: ${label}`);
    }
  }

  wrap<T>(label: string, fn: () => T): T {
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }

  async wrapAsync(label: string, fn: () => Promise<any>): Promise<any> {
    this.start(label);
    const result = await fn();
    this.end(label);
    return result;
  }

  getMetrics(): { [key: string]: PerformanceMetric } {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = this.createEmptyMetric();
    });
  }

  printSummary(): void {
    console.group('Performance Summary');
    Object.entries(this.metrics)
      .sort((a, b) => b[1].totalTime - a[1].totalTime)
      .forEach(([label, metric]) => {
        if (metric.count > 0) {
          console.log(
            `${label}: count=${metric.count}, avg=${(metric.totalTime / metric.count).toFixed(2)}ms, ` +
            `min=${metric.minTime.toFixed(2)}ms, max=${metric.maxTime.toFixed(2)}ms, total=${metric.totalTime.toFixed(2)}ms`
          );
        }
      });
    console.groupEnd();
  }

  private createEmptyMetric(): PerformanceMetric {
    return {
      count: 0,
      totalTime: 0,
      minTime: Number.MAX_VALUE,
      maxTime: 0,
      lastTime: 0
    };
  }
}
