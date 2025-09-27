import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phone',
  standalone: true
})
export class PhonePipe implements PipeTransform {
  
  transform(value: string, country: string = 'EC'): string {
    if (!value) return '';
    
    const cleaned = value.replace(/[^\d+]/g, '');
    
    if (country === 'EC') {
      return this.formatEcuadorianNumber(cleaned);
    }
    
    return this.formatGenericNumber(cleaned);
  }
  
  private formatEcuadorianNumber(cleaned: string): string {
    if (cleaned.startsWith('+593')) {
      const number = cleaned.substring(4);
      if (number.length === 9) {
        return `+593 ${number.substring(0, 1)} ${number.substring(1, 4)}-${number.substring(4, 7)}-${number.substring(7)}`;
      }
    } else if (cleaned.length === 10 && cleaned.startsWith('0')) {
      const number = cleaned.substring(1);
      return `+593 ${number.substring(0, 1)} ${number.substring(1, 4)}-${number.substring(4, 7)}-${number.substring(7)}`;
    }
    
    return cleaned;
  }
  
  private formatGenericNumber(cleaned: string): string {
    if (cleaned.length >= 10) {
      const areaCode = cleaned.substring(0, 3);
      const firstPart = cleaned.substring(3, 6);
      const secondPart = cleaned.substring(6);
      return `(${areaCode}) ${firstPart}-${secondPart}`;
    }
    return cleaned;
  }
}