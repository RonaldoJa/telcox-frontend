import { Component, Input, computed, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Consumption } from '../../models/customer.model';
import { BytesPipe } from '../../pipes/bytes.pipe';

@Component({
  selector: 'app-usage-metrics',
  standalone: true,
  imports: [CommonModule, BytesPipe],
  templateUrl: './usage-metrics.component.html',
  styleUrls: ['./usage-metrics.component.scss']
})
export class UsageMetricsComponent implements OnInit {
  @Input() consumption: Consumption | null = null;
  @Input() loading: boolean = false;
  
  @ViewChild('dataChart', { static: false }) dataChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('minutesChart', { static: false }) minutesChart!: ElementRef<HTMLCanvasElement>;

  dataUsageLevel = computed(() => {
    if (!this.consumption) return 'low';
    const percentage = this.consumption.data_usage_percentage;
    if (percentage >= 90) return 'critical';
    if (percentage >= 70) return 'high';
    if (percentage >= 40) return 'medium';
    return 'low';
  });

  minutesUsageLevel = computed(() => {
    if (!this.consumption) return 'low';
    const percentage = this.consumption.minutes_usage_percentage;
    if (percentage >= 90) return 'critical';
    if (percentage >= 70) return 'high';
    if (percentage >= 40) return 'medium';
    return 'low';
  });

  dataProgressClass = computed(() => {
    switch (this.dataUsageLevel()) {
      case 'critical': return 'bg-danger';
      case 'high': return 'bg-warning';
      case 'medium': return 'bg-info';
      default: return 'bg-success';
    }
  });

  minutesProgressClass = computed(() => {
    switch (this.minutesUsageLevel()) {
      case 'critical': return 'bg-danger';
      case 'high': return 'bg-warning';
      case 'medium': return 'bg-info';
      default: return 'bg-success';
    }
  });

  ngOnInit(): void {
    setTimeout(() => {
      this.updateCircularCharts();
    }, 100);
  }

  ngOnChanges(): void {
    this.updateCircularCharts();
  }

  private updateCircularCharts(): void {
    if (this.consumption) {
      this.drawCircularChart(
        this.dataChart?.nativeElement,
        this.consumption.data_usage_percentage,
        this.getColorForLevel(this.dataUsageLevel())
      );
      
      this.drawCircularChart(
        this.minutesChart?.nativeElement,
        this.consumption.minutes_usage_percentage,
        this.getColorForLevel(this.minutesUsageLevel())
      );
    }
  }

  private drawCircularChart(canvas: HTMLCanvasElement | undefined, percentage: number, color: string): void {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 8;
    ctx.stroke();

    const angle = (percentage / 100) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = '#2d3748';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${percentage.toFixed(1)}%`, centerX, centerY + 6);
  }

  private getColorForLevel(level: string): string {
    switch (level) {
      case 'critical': return '#dc3545';
      case 'high': return '#ffc107';
      case 'medium': return '#17a2b8';
      default: return '#28a745';
    }
  }

  getUsageRecommendation(type: 'data' | 'minutes'): string {
    if (!this.consumption) return '';
    
    const percentage = type === 'data' 
      ? this.consumption.data_usage_percentage 
      : this.consumption.minutes_usage_percentage;

    if (percentage >= 90) {
      return type === 'data' 
        ? 'Considera conectarte a WiFi para ahorrar datos'
        : 'Usa aplicaciones de mensajería para ahorrar minutos';
    } else if (percentage >= 70) {
      return type === 'data'
        ? 'Monitorea tu consumo de datos más frecuentemente'
        : 'Planifica tus llamadas para el resto del mes';
    }
    return 'Tu consumo está en un nivel saludable';
  }
}