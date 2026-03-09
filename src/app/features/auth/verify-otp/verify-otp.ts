import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-otp.html',
  styleUrls: ['./verify-otp.scss']
})
export class VerifyOtp implements OnInit, OnDestroy {
  email = '';
  otpDigits: string[] = ['', '', '', '', '', ''];
  isLoading = false;
  isResending = false;
  errorMessage = '';
  successMessage = '';
  countdown = 60;
  private countdownInterval: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParams['email'] || '';
    
    if (!this.email) {
      console.error('❌ No email provided');
      this.router.navigate(['/login']);
      return;
    }

    console.log('📧 Verifying OTP for email:', this.email);
    this.startCountdown();

    // Auto-focus first input
    setTimeout(() => {
      const firstInput = document.getElementById('otp-0') as HTMLInputElement;
      firstInput?.focus();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  get otp(): string {
    return this.otpDigits.join('');
  }

  /**
   * ✅ Handle OTP Input
   */
  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      this.otpDigits[index] = '';
      input.value = '';
      return;
    }

    this.otpDigits[index] = value;

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (this.otp.length === 6) {
      setTimeout(() => this.verifyOtp(), 300);
    }
  }

  /**
   * ✅ Handle Backspace
   */
  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      if (!this.otpDigits[index] && index > 0) {
        const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
        prevInput?.focus();
      } else {
        this.otpDigits[index] = '';
      }
    }
  }

  /**
   * ✅ Handle Paste
   */
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');

    digits.forEach((digit, i) => {
      this.otpDigits[i] = digit;
      const input = document.getElementById(`otp-${i}`) as HTMLInputElement;
      if (input) input.value = digit;
    });

    // Auto-submit if all 6 digits pasted
    if (digits.length === 6) {
      setTimeout(() => this.verifyOtp(), 300);
    }
  }

  /**
   * ✅ Verify OTP
   */
  verifyOtp(): void {
    const otpValue = this.otp;

    if (otpValue.length !== 6) {
      this.errorMessage = 'Please enter all 6 digits';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('🔍 Verifying OTP:', otpValue, 'for email:', this.email);

    // Call backend verification endpoint
    this.http.post<any>(`${environment.apiUrl}/otp/verify`, {
      studentEmail: this.email,
      otp: otpValue
    }).subscribe({
      next: (response) => {
        console.log('✅ OTP verification response:', response);
        this.isLoading = false;

        if (response.success === 'true' || response.success === true) {
          this.successMessage = '✅ Email verified successfully! Redirecting to login...';

          // Redirect to login after 1.5 seconds
          setTimeout(() => {
            this.router.navigate(['/login'], {
              queryParams: {
                verified: 'true',
                email: this.email
              }
            });
          }, 1500);
        } else {
          this.errorMessage = response.message || 'Invalid OTP. Please try again.';
        }
      },
      error: (error) => {
        console.error('❌ OTP verification error:', error);
        this.isLoading = false;

        if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Invalid or expired OTP. Please try again.';
        } else {
          this.errorMessage = 'Failed to verify OTP. Please try again.';
        }
      }
    });
  }

  /**
   * ✅ Resend OTP
   */
  resendOtp(): void {
    if (this.countdown > 0) {
      return;
    }

    this.isResending = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('🔄 Resending OTP to:', this.email);

    this.http.post<any>(`${environment.apiUrl}/otp/resend?email=${this.email}`, {}).subscribe({
      next: (response) => {
        console.log('✅ OTP resent:', response);
        this.isResending = false;

        if (response.success === 'true' || response.success === true) {
          this.successMessage = '✅ New OTP sent to your email!';
          this.countdown = 60;
          this.startCountdown();

          // Clear OTP inputs
          this.otpDigits = ['', '', '', '', '', ''];
          const inputs = document.querySelectorAll('input[type="text"]');
          inputs.forEach((input: any) => input.value = '');

          const firstInput = document.getElementById('otp-0') as HTMLInputElement;
          firstInput?.focus();

          setTimeout(() => this.successMessage = '', 3000);
        } else {
          this.errorMessage = response.message || 'Failed to resend OTP';
        }
      },
      error: (error) => {
        console.error('❌ Resend OTP error:', error);
        this.isResending = false;
        this.errorMessage = error.error?.message || 'Failed to resend OTP. Please try again.';
      }
    });
  }

  /**
   * ✅ Start Countdown Timer
   */
  private startCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }

  /**
   * ✅ Go to Login
   */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}