import { HttpInterceptorFn, HttpResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, tap } from 'rxjs';

interface CacheEntry {
  response: HttpResponse<any>;
  timestamp: number;
}

export const cacheInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>, 
  next: HttpHandlerFn
) => {
  // Solo cachear requests GET
  if (req.method !== 'GET') {
    return next(req);
  }
  
  const cacheableUrls = [
    '/api/customers/', 
    '/api/system-status' 
  ];
  
  const shouldCache = cacheableUrls.some(url => req.url.includes(url));
  
  if (!shouldCache) {
    return next(req);
  }
  
  // Buscar en cache
  const cached = getFromCache(req.url);
  if (cached && !isCacheExpired(cached, 300000)) { // 5 minutos
    console.log('Serving from cache:', req.url);
    return of(cached.response);
  }
  
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        setCache(req.url, event);
      }
    })
  );
};

const cache = new Map<string, CacheEntry>();

function getFromCache(url: string): CacheEntry | undefined {
  return cache.get(url);
}

function setCache(url: string, response: HttpResponse<any>): void {
  cache.set(url, {
    response: response.clone(),
    timestamp: Date.now()
  });
}

function isCacheExpired(entry: CacheEntry, maxAge: number): boolean {
  return Date.now() - entry.timestamp > maxAge;
}