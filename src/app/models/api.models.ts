export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
  request_id?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface BSSHealthCheck {
  status: 'online' | 'offline' | 'degraded';
  response_time: number;
  last_check: string;
  services: {
    [key: string]: {
      status: string;
      response_time: number;
    };
  };
}

export interface SystemStatus {
  bss: BSSHealthCheck;
  database: {
    status: string;
    connections: number;
  };
  api: {
    status: string;
    version: string;
    uptime: number;
  };
}