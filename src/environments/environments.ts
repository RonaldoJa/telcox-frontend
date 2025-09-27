export const environment = {
  production: true,
  apiUrl: '/api',
  autoRefreshInterval: 30000, 
  appName: 'TelcoX',
  version: '1.0.0',
  features: {
    notifications: true,
    autoRefresh: true,
    cache: true,
    analytics: false
  },
  api: {
    timeout: 10000, 
    retryAttempts: 2,
    retryDelay: 1000
  }
};