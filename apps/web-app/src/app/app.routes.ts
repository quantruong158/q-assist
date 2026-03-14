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
    loadComponent: () => import('@qos/shared/ui-shell').then((m) => m.ShellLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'finance',
        loadComponent: () => import('@qos/finance/feat-dashboard').then((m) => m.FinanceDashboard),
        data: { activeContext: 'finance' },
      },
      {
        path: 'chat/:id',
        loadComponent: () => import('@qos/chat/feat-chat').then((m) => m.Chat),
        data: { activeContext: 'chat' },
      },
      {
        path: 'chat',
        loadComponent: () => import('@qos/chat/feat-chat').then((m) => m.Chat),
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
