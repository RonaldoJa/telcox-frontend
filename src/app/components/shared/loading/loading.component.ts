import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../services/loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.loading$ | async) {
      <div class="loading-overlay">
        <div class="loading-content">
          <div class="spinner-container">
            <div class="spinner-telcox"></div>
            <div class="spinner-glow"></div>
          </div>
          <div class="loading-text">
            <h6>Conectando con sistema BSS...</h6>
            <small>Obteniendo datos en tiempo real</small>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(102, 126, 234, 0.1);
      backdrop-filter: blur(5px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-out;
    }

    .loading-content {
      text-align: center;
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      max-width: 300px;
    }

    .spinner-container {
      position: relative;
      margin-bottom: 1.5rem;
      
      .spinner-telcox {
        width: 50px;
        height: 50px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
      }
      
      .spinner-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 70px;
        height: 70px;
        border: 2px solid rgba(102, 126, 234, 0.3);
        border-radius: 50%;
        animation: pulse 2s ease-in-out infinite;
      }
    }

    .loading-text {
      h6 {
        color: #495057;
        margin-bottom: 0.5rem;
        font-weight: 600;
      }
      
      small {
        color: #6c757d;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
      50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
    }
  `]
})
export class LoadingComponent {
  loadingService = inject(LoadingService);
}