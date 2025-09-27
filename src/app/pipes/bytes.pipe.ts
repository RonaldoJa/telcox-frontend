import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bytes',
  standalone: true
})
export class BytesPipe implements PipeTransform {
  
  transform(bytes: number, fromUnit: string = 'B', precision: number = 1): string {
    if (isNaN(parseFloat(String(bytes))) || !isFinite(bytes) || bytes < 0) {
      return '0 B';
    }
    
    let bytesValue = bytes;
    switch (fromUnit.toUpperCase()) {
      case 'KB':
        bytesValue = bytes * 1024;
        break;
      case 'MB':
        bytesValue = bytes * 1024 * 1024;
        break;
      case 'GB':
        bytesValue = bytes * 1024 * 1024 * 1024;
        break;
      case 'TB':
        bytesValue = bytes * 1024 * 1024 * 1024 * 1024;
        break;
      case 'B':
      default:
        bytesValue = bytes;
        break;
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let unitIndex = 0;
    let size = bytesValue;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    // Formato especial para bytes exactos
    if (unitIndex === 0) {
      return `${Math.floor(size)} ${units[unitIndex]}`;
    }

    // Formateo mejorado para decimales
    const formattedSize = size < 10 ? size.toFixed(precision) : size.toFixed(Math.max(0, precision - 1));
    return `${formattedSize} ${units[unitIndex]}`;
  }
}