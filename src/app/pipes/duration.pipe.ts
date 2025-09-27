import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'duration',
  standalone: true
})
export class DurationPipe implements PipeTransform {
  
  transform(
    value: number, 
    inputUnit: 'seconds' | 'minutes' | 'hours' = 'minutes',
    format: 'short' | 'long' | 'precise' = 'short'
  ): string {
    if (isNaN(value) || value < 0) {
      return format === 'long' ? '0 minutos' : '0m';
    }
    
    let totalSeconds: number;
    switch (inputUnit) {
      case 'seconds':
        totalSeconds = value;
        break;
      case 'hours':
        totalSeconds = value * 3600;
        break;
      case 'minutes':
      default:
        totalSeconds = value * 60;
        break;
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    if (format === 'precise') {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (format === 'long') {
      const parts: string[] = [];
      
      if (hours > 0) {
        const hourText = hours === 1 ? 'hora' : 'horas';
        parts.push(`${hours} ${hourText}`);
      }
      
      if (minutes > 0) {
        const minuteText = minutes === 1 ? 'minuto' : 'minutos';
        parts.push(`${minutes} ${minuteText}`);
      }
      
      if (seconds > 0 && hours === 0) {
        const secondText = seconds === 1 ? 'segundo' : 'segundos';
        parts.push(`${seconds} ${secondText}`);
      }
      
      if (parts.length === 0) {
        return inputUnit === 'seconds' ? '0 segundos' : '0 minutos';
      }
      
      if (parts.length === 1) {
        return parts[0];
      }
      
      const lastPart = parts.pop();
      return `${parts.join(', ')} y ${lastPart}`;
    }
    
    // Formato corto
    if (hours > 0) {
      if (minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${hours}h`;
      }
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else if (inputUnit === 'seconds' && seconds > 0) {
      return `${seconds}s`;
    } else {
      return inputUnit === 'seconds' ? '0s' : '0m';
    }
  }
}