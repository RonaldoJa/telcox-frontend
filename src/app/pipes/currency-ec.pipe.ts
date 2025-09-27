import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyEc',
  standalone: true
})
export class CurrencyEcPipe implements PipeTransform {
  
  transform(
    value: number, 
    showCents: boolean = true, 
    showSymbol: boolean = true,
    locale: string = 'es-EC'
  ): string {
    if (isNaN(value) || value === null || value === undefined) {
      return showSymbol ? '$0.00' : '0.00';
    }
    
    const options: Intl.NumberFormatOptions = {
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0
    };
    
    if (showSymbol) {
      options.style = 'currency';
      options.currency = 'USD';
    }
    
    try {
      return new Intl.NumberFormat(locale, options).format(value);
    } catch (error) {
      // Fallback si hay error con el locale
      const formatted = value.toFixed(showCents ? 2 : 0);
      return showSymbol ? `${formatted}` : formatted;
    }
  }
}