import { Routes } from '@angular/router';
import { authGuard, publicGuard } from '@qos/shared/auth/util';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('@qos/shared/auth/feat-auth').then((m) => m.AuthLogin),
    canActivate: [publicGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('@qos/shared/auth/feat-auth').then((m) => m.AuthRegister),
    canActivate: [publicGuard],
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    canActivate: [authGuard],
    children: [
      {
        path: 'finance',
        loadComponent: () => import('@qos/finance/feat-dashboard').then((m) => m.FinanceDashboard),
        data: { activeContext: 'finance' },
      },
      {
        path: 'chat/:id',
        loadComponent: () => import('./chat/chat').then((m) => m.Chat),
        data: { activeContext: 'chat' },
      },
      {
        path: 'chat',
        loadComponent: () => import('./chat/chat').then((m) => m.Chat),
        data: { activeContext: 'chat' },
      },
      {
        path: '',
        redirectTo: 'chat',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
