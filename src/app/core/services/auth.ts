import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import {
  AuthResponse,
  LoginRequest,
  SignUpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private googleOAuthUrl = environment.googleOAuthUrl;

  private currentUserSignal = signal<User | null>(null);
  private isLoadingSignal = signal<boolean>(false);

  public currentUser = computed(() => this.currentUserSignal());
  public isLoggedIn = computed(() => !!this.currentUserSignal() && !!this.getToken());
  public isLoading = computed(() => this.isLoadingSignal());
  public userRole = computed(() => this.currentUserSignal()?.role || null);
  public isBidder = computed(() => this.userRole() === 'BIDDER' || this.userRole() === 'ADMIN');
  public isAdmin = computed(() => this.userRole() === 'ADMIN');

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        // Check token expiration on load
        if (this.isTokenExpired(token)) {
          this.clearSession();
          return;
        }
        const user = JSON.parse(userStr);
        this.currentUserSignal.set(user);
      } catch {
        this.clearSession();
      }
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  private setSession(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('oauth_redirect');
    this.currentUserSignal.set(null);
  }

  // ========================================
  // GOOGLE OAUTH
  // ========================================

  loginWithGoogle(): void {
    localStorage.setItem('oauth_redirect', window.location.pathname);
    window.location.href = this.googleOAuthUrl;
  }

  handleOAuthCallback(token: string, userJson: string): boolean {
    try {
      const user = JSON.parse(decodeURIComponent(userJson));
      this.setSession(token, user);

      const redirectUrl = localStorage.getItem('oauth_redirect') || '/dashboard';
      localStorage.removeItem('oauth_redirect');

      if (user.role === 'ADMIN') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate([redirectUrl]);
      }
      return true;
    } catch {
      this.router.navigate(['/login'], {
        queryParams: { error: 'OAuth authentication failed' }
      });
      return false;
    }
  }

  // ========================================
  // EMAIL/PASSWORD AUTHENTICATION
  // ========================================

  login(request: LoginRequest): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap((response) => {
        this.isLoadingSignal.set(false);
        if (response.success && response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  signUp(request: SignUpRequest): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, request).pipe(
      tap(() => {
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /** Force logout without navigation (used by interceptor) */
  forceLogout(): void {
    this.clearSession();
  }

  // ========================================
  // OTP VERIFICATION
  // ========================================

  verifyOtp(email: string, otp: string): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(
      `${this.apiUrl}/verify-otp?email=${encodeURIComponent(email)}&otp=${otp}`,
      {}
    ).pipe(
      tap((response) => {
        this.isLoadingSignal.set(false);
        if (response.success && response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  resendOtp(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/resend-otp?email=${encodeURIComponent(email)}`,
      {}
    );
  }

  // ========================================
  // PASSWORD RESET
  // ========================================

  forgotPassword(request: ForgotPasswordRequest): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/forgot-password`, request).pipe(
      tap(() => this.isLoadingSignal.set(false)),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  verifyResetOtp(email: string, otp: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/verify-reset-otp?email=${encodeURIComponent(email)}&otp=${otp}`,
      {}
    );
  }

  resetPassword(request: ResetPasswordRequest): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/reset-password`, request).pipe(
      tap(() => this.isLoadingSignal.set(false)),
      catchError(error => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      })
    );
  }

  resendResetOtp(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/resend-reset-otp?email=${encodeURIComponent(email)}`,
      {}
    );
  }

  // ========================================
  // USER MANAGEMENT
  // ========================================

  getCurrentUserFromApi(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        this.currentUserSignal.set(user);
        localStorage.setItem('user', JSON.stringify(user));
      })
    );
  }

  updateUserLocally(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  refreshUserRole(): Observable<User> {
    return this.getCurrentUserFromApi();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): User | null {
    return this.currentUserSignal();
  }

  checkIsAdmin(): boolean {
    return this.getUser()?.role === 'ADMIN';
  }

  checkIsBidder(): boolean {
    const user = this.getUser();
    return user?.role === 'BIDDER' || user?.role === 'ADMIN';
  }
}