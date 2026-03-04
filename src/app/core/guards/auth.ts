import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      JSON.parse(userStr);

      // Check JWT expiration
      if (isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.navigate(['/login'], { queryParams: { returnUrl: state.url, expired: 'true' } });
        return false;
      }

      return true;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // convert to milliseconds
    return Date.now() >= exp;
  } catch {
    return true; // treat malformed tokens as expired
  }
}