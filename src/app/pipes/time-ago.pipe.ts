import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {
  
  transform(value: string | Date | number, includeSeconds: boolean = false): string {
    if (!value) return 'Nunca';
    
    const date = this.parseDate(value);
    if (!date || isNaN(date.getTime())) return 'Fecha inválida';
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    // Futuro
    if (diffInMs < 0) {
      const futureDiffInSeconds = Math.abs(diffInSeconds);
      const futureDiffInMinutes = Math.abs(diffInMinutes);
      const futureDiffInHours = Math.abs(diffInHours);
      const futureDiffInDays = Math.abs(diffInDays);
      
      if (futureDiffInSeconds < 60) {
        return 'En un momento';
      } else if (futureDiffInMinutes < 60) {
        return `En ${futureDiffInMinutes} minuto${futureDiffInMinutes > 1 ? 's' : ''}`;
      } else if (futureDiffInHours < 24) {
        return `En ${futureDiffInHours} hora${futureDiffInHours > 1 ? 's' : ''}`;
      } else {
        return `En ${futureDiffInDays} día${futureDiffInDays > 1 ? 's' : ''}`;
      }
    }

    // Pasado
    if (includeSeconds && diffInSeconds < 60) {
      if (diffInSeconds < 10) {
        return 'Hace un momento';
      }
      return `Hace ${diffInSeconds} segundo${diffInSeconds > 1 ? 's' : ''}`;
    } else if (diffInMinutes < 60) {
      if (diffInMinutes < 1) {
        return 'Hace un momento';
      }
      return `Hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    } else if (diffInDays < 7) {
      return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    } else if (diffInWeeks < 4) {
      return `Hace ${diffInWeeks} semana${diffInWeeks > 1 ? 's' : ''}`;
    } else if (diffInMonths < 12) {
      return `Hace ${diffInMonths} mes${diffInMonths > 1 ? 'es' : ''}`;
    } else {
      return `Hace ${diffInYears} año${diffInYears > 1 ? 's' : ''}`;
    }
  }
  
  private parseDate(value: string | Date | number): Date {
    if (value instanceof Date) {
      return value;
    }
    
    if (typeof value === 'number') {
      return new Date(value);
    }
    
    if (typeof value === 'string') {
      // Intentar varios formatos de fecha
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Formato ISO específico
      const isoDate = new Date(value.replace(' ', 'T'));
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
    }
    
    return new Date();
  }
}