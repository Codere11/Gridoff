import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerformanceService } from '../services/performance.service';

@Component({
  selector: 'app-performance-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="performance-dashboard" *ngIf="visible">
      <div class="dashboard-header">
        <h3>Performance Metrics</h3>
        <div class="controls">
          <button (click)="toggleLogging()">{{ loggingEnabled ? 'Disable Logs' : 'Enable Logs' }}</button>
          <button (click)="resetMetrics()">Reset</button>
          <button (click)="printSummary()">Print Summary</button>
          <button (click)="visible = false">Close</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Operation</th>
            <th>Count</th>
            <th>Last (ms)</th>
            <th>Avg (ms)</th>
            <th>Min (ms)</th>
            <th>Max (ms)</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let metric of metrics">
            <td>{{ metric.label }}</td>
            <td>{{ metric.count }}</td>
            <td>{{ metric.lastTime.toFixed(2) }}</td>
            <td>{{ metric.avgTime.toFixed(2) }}</td>
            <td>{{ metric.minTime.toFixed(2) }}</td>
            <td>{{ metric.maxTime.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .performance-dashboard {
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      max-height: 80vh;
      overflow-y: auto;
      font-family: monospace;
    }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .controls {
      display: flex;
      gap: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 5px;
      text-align: right;
      border-bottom: 1px solid #444;
    }
    th:first-child, td:first-child {
      text-align: left;
    }
    button {
      background-color: #555;
      color: white;
      border: none;
      padding: 5px 8px;
      border-radius: 3px;
      cursor: pointer;
    }
    button:hover {
      background-color: #777;
    }
  `]
})
export class PerformanceDashboardComponent implements OnInit, OnDestroy {
  visible = false;
  metrics: Array<{
    label: string;
    count: number;
    lastTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
  }> = [];
  loggingEnabled = false;
  private updateInterval: any;

  constructor(private performanceService: PerformanceService) {}

  ngOnInit(): void {
    // Update metrics every second
    this.updateInterval = setInterval(() => this.updateMetrics(), 1000);
    
    // Add keyboard shortcut to toggle dashboard (Ctrl+Shift+P)
    window.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy(): void {
    clearInterval(this.updateInterval);
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'P') {
      this.visible = !this.visible;
      event.preventDefault();
    }
  }

  updateMetrics(): void {
    if (!this.visible) return;
    
    const rawMetrics = this.performanceService.getMetrics();
    this.metrics = Object.entries(rawMetrics)
      .map(([label, metric]) => ({
        label,
        count: metric.count,
        lastTime: metric.lastTime,
        avgTime: metric.count > 0 ? metric.totalTime / metric.count : 0,
        minTime: metric.minTime === Number.MAX_VALUE ? 0 : metric.minTime,
        maxTime: metric.maxTime
      }))
      .sort((a, b) => b.avgTime - a.avgTime);
  }

  toggleLogging(): void {
    this.loggingEnabled = !this.loggingEnabled;
    this.performanceService.enableLogging(this.loggingEnabled);
  }

  resetMetrics(): void {
    this.performanceService.resetMetrics();
    this.updateMetrics();
  }

  printSummary(): void {
    this.performanceService.printSummary();
  }
}
