export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  plan_type: string;
  created_at: string;
}

export interface Consumption {
  id: number;
  customer_id: number;
  data_used_mb: number;
  data_limit_mb: number;
  data_remaining_mb: number;
  data_usage_percentage: number;
  minutes_used: number;
  minutes_limit: number;
  minutes_remaining: number;
  minutes_usage_percentage: number;
  account_balance: number;
  billing_cycle_start: string;
  billing_cycle_end: string;
  last_updated: string;
}

export interface RealTimeData {
  bss_status: string;
  last_sync: string;
  sync_quality: string;
  response_time_ms: number;
}

export interface ConsumptionResponse {
  success: boolean;
  data: {
    customer: Customer;
    consumption: Consumption;
    real_time_data: RealTimeData;
  };
}

export interface CustomerResponse {
  success: boolean;
  data: Customer;
}

export interface ApiError {
  error: string;
  timestamp?: string;
  status?: number;
}

export interface UsageAlert {
  type: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  percentage: number;
  category: 'data' | 'minutes' | 'balance';
}

export interface BillingCycle {
  start_date: string;
  end_date: string;
  days_total: number;
  days_remaining: number;
  days_elapsed: number;
  progress_percentage: number;
}

export interface PlanInfo {
  name: string;
  type: string;
  data_limit: number;
  minutes_limit: number;
  price: number;
  features: string[];
}

export interface NetworkMetrics {
  connection_speed: number;
  upload_speed: number;
  latency: number;
  jitter: number;
  packet_loss: number;
  signal_strength: number;
  uptime_hours: number;
  connection_type: string;
  quality: string;
  last_updated: string;
  data_usage?: {
    total: number;
    used: number;
    remaining: number;
    percentage: number;
  };
}

export interface UsageHistory {
  date: string;
  data_used: number;
  minutes_used: number;
  peak_usage_hour: number;
}

export interface CustomerPreferences {
  auto_refresh: boolean;
  notification_enabled: boolean;
  language: string;
  currency: string;
  timezone: string;
}