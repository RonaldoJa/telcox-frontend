export const environment = {
  production: false,
  apiUrl: 'http://localhost:5100/api',
  autoRefreshInterval: 5000, 
  appName: 'TelcoX Dev',
  version: '1.0.0-dev',
  features: {
    notifications: true,
    autoRefresh: true,
    cache: true,
    analytics: true
  },
  api: {
    timeout: 15000, 
    retryAttempts: 3,
    retryDelay: 500
  }
};