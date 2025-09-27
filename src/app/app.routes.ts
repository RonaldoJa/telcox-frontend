import { Routes } from '@angular/router';
import { ConsumptionDashboardComponent } from './components/consumption-dashboard/consumption-dashboard.component';
import { CustomerInfoComponent } from './components/customer-info/customer-info.component';
import { UsageMetricsComponent } from './components/usage-metrics/usage-metrics.component';
import { BillingInfoComponent } from './components/billing-info/billing-info.component';
import { CustomerDetailComponent } from './components/customer-detail/customer-detail.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: ConsumptionDashboardComponent,
    title: 'Dashboard - Telcox'
  },
  {
    path: 'customer-info',
    component: CustomerInfoComponent,
    title: 'Información del Cliente - Telcox'
  },
  {
    path: 'customer/:id',
    component: CustomerDetailComponent,
    title: 'Detalle del Cliente - Telcox'
  },
  {
    path: 'usage-metrics',
    component: UsageMetricsComponent,
    title: 'Métricas de Uso - Telcox'
  },
  {
    path: 'billing',
    component: BillingInfoComponent,
    title: 'Información de Facturación - Telcox'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];