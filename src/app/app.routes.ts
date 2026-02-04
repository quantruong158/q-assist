import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
    canActivate: [publicGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register').then((m) => m.Register),
    canActivate: [publicGuard],
  },
  {
    path: 'chat',
    loadComponent: () => import('./chat/chat').then((m) => m.Chat),
    canActivate: [authGuard],
  },
  {
    path: 'chat/:id',
    loadComponent: () => import('./chat/chat').then((m) => m.Chat),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'chat',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
