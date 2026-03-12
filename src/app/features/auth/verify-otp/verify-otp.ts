import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { NotificationService } from '../../../core/services/notification.service';

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
    private notificationService: NotificationService, 
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParams['email'] || '';
    
    if (!this.email) {
      this.router.navigate(['/login']);
      return;
    }

    this.startCountdown();

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

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value && !/^\d$/.test(value)) {
      this.otpDigits[index] = '';
      input.value = '';
      return;
    }

    this.otpDigits[index] = value;

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }

    if (this.otp.length === 6) {
      setTimeout(() => this.verifyOtp(), 300);
    }
  }

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

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');

    digits.forEach((digit, i) => {
      this.otpDigits[i] = digit;
      const input = document.getElementById(`otp-${i}`) as HTMLInputElement;
      if (input) input.value = digit;
    });

    if (digits.length === 6) {
      setTimeout(() => this.verifyOtp(), 300);
    }
  }

  verifyOtp(): void {
    const otpValue = this.otp;

    if (otpValue.length !== 6) {
      this.errorMessage = 'Please enter all 6 digits';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';


    // Use AuthService.verifyOtp() — it calls setSession() internally,
    //    storing token + user in localStorage automatically.
    this.authService.verifyOtp(this.email, otpValue).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.success) {
          this.successMessage = '✅ Email verified! Redirecting...';

          if (response.token) {
            // Token stored by AuthService.verifyOtp() already.
            // Start polling so welcome notification fires immediately.
            this.notificationService.startPolling(true);
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1500);
          } else {
            // No auto-login token — redirect to login
            setTimeout(() => {
              this.router.navigate(['/login'], {
                queryParams: { verified: 'true', email: this.email }
              });
            }, 1500);
          }
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

  resendOtp(): void {
    if (this.countdown > 0) return;

    this.isResending = true;
    this.errorMessage = '';
    this.successMessage = '';


    this.authService.resendOtp(this.email).subscribe({
      next: (response) => {
        this.isResending = false;

        if (response.success) {
          this.successMessage = '✅ New OTP sent to your email!';
          this.countdown = 60;
          this.startCountdown();

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
        this.isResending = false;
        this.errorMessage = error.error?.message || 'Failed to resend OTP. Please try again.';
      }
    });
  }

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

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
