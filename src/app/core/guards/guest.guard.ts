import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const guestGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      
      // Redirect based on role
      if (user.role === 'ADMIN') {
        router.navigate(['/admin']);
      } else {
        router. navigate(['/dashboard']);
      }
      return false;
    } catch {
      // Invalid user data, allow access
      return true;
    }
  }

  return true;
};