import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || ! userStr) {

    router.navigate(['/login'], { queryParams: { returnUrl: state. url } });
    return false;
  }

  try {
    const user = JSON.parse(userStr);

    
    if (user. role === 'ADMIN') {

      return true;
    } else {

      router.navigate(['/dashboard']);
      return false;
    }
  } catch (error) {
    router.navigate(['/login']);
    return false;
  }
};