import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        @if (isLoading) {
          <div class="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto mb-6"></div>
          <h2 class="text-xl font-bold text-gray-900 mb-2">Completing Sign In... </h2>
          <p class="text-gray-500">Please wait while we authenticate your account.</p>
        } @else if (error) {
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span class="text-3xl">❌</span>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
          <p class="text-red-600 mb-4">{{ error }}</p>
          <a routerLink="/login" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Back to Login
          </a>
        } @else {
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span class="text-3xl">✅</span>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mb-2">Success!</h2>
          <p class="text-gray-500">Redirecting to dashboard...</p>
        }
      </div>
    </div>
  `
})
export class OAuthCallback implements OnInit {
  isLoading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const queryParams = this. route.snapshot.queryParams;
    console.log('OAuth Callback - Query Params:', queryParams);

    // FIXED: Check for both "token" and " token" (with space)
    const token = queryParams['token'] || queryParams[' token'];
    const user = queryParams['user'];
    const errorParam = queryParams['error'];


    if (errorParam) {
      this.isLoading = false;
      this.error = decodeURIComponent(errorParam);
      return;
    }

    if (token && user) {
      try {
        const success = this.authService.handleOAuthCallback(token, user);
        if (! success) {
          this.isLoading = false;
          this.error = 'Failed to process authentication response. ';
        }
      } catch (e) {
        this.isLoading = false;
        this.error = 'Error processing response:  ' + (e as Error).message;
      }
    } else {
      this.isLoading = false;
      this.error = 'Missing authentication data.  Please try again.';
    }
  }
}