import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>, 
  next: HttpHandlerFn
) => {
  const loadingService = inject(LoadingService);
  
  // URLs que no deben mostrar loading (ejemplo: health checks, polling)
  const skipLoadingUrls = [
    '/api/health',
    '/api/system-status'
  ];
  
  const shouldSkipLoading = skipLoadingUrls.some(url => req.url.includes(url));
  
  if (!shouldSkipLoading) {
    loadingService.show();
  }
  
  return next(req).pipe(
    finalize(() => {
      if (!shouldSkipLoading) {
        loadingService.hide();
      }
    })
  );
};