import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'percentage',
  standalone: true
})
export class PercentagePipe implements PipeTransform {
  
  transform(
    value: number, 
    precision: number = 1, 
    showSymbol: boolean = true,
    locale: string = 'es-EC'
  ): string {
    if (isNaN(value) || value === null || value === undefined) {
      return showSymbol ? '0%' : '0';
    }
    
    const clampedValue = Math.max(0, Math.min(100, value));
    
    const options: Intl.NumberFormatOptions = {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    };
    
    try {
      const formatted = new Intl.NumberFormat(locale, options).format(clampedValue);
      return showSymbol ? `${formatted}%` : formatted;
    } catch (error) {
      // Fallback
      const formatted = clampedValue.toFixed(precision);
      return showSymbol ? `${formatted}%` : formatted;
    }
  }
}