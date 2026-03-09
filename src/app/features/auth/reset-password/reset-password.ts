import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl:   './reset-password.html',
  styleUrls: ['./reset-password.scss']
})
export class ResetPassword implements OnInit, OnDestroy {
  email = '';
  currentStep = 1;
  otpDigits:  string[] = ['', '', '', '', '', ''];
  resetForm:   FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  countdown = 60;
  private countdownInterval: any;

  constructor(
    private fb:  FormBuilder,
    private authService: AuthService,
    private router:   Router,
    private route: ActivatedRoute
  ) {
    this. resetForm = this. fb.group({
      newPassword:   ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.email = this.route. snapshot.queryParams['email'] || '';
    if (! this.email) {
      this.router.navigate(['/forgot-password']);
    }
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  get otp(): string {
    return this.otpDigits. join('');
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value && !/^\d$/.test(value)) {
      this. otpDigits[index] = '';
      return;
    }

    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-otp-${index + 1}`) as HTMLInputElement;
      nextInput?. focus();
    }
  }

  onKeyDown(event:   KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && ! this.otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`reset-otp-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  }

  verifyOtp(): void {
    if (this.otp.length !== 6) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.verifyResetOtp(this.email, this.otp).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this. currentStep = 2;
        } else {
          this.errorMessage = response.message || 'Invalid OTP';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Invalid OTP.  Please try again.';
      }
    });
  }

  resetPassword(): void {
    if (this. resetForm.invalid) return;

    if (this.resetForm.get('newPassword')?.value !== this.resetForm.get('confirmPassword')?.value) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this. isLoading = true;
    this. errorMessage = '';

    const request = {
      studentEmail: this.email,
      otp: this.otp,
      newPassword:   this.resetForm.get('newPassword')?.value,
      confirmPassword: this.resetForm.get('confirmPassword')?.value
    };

    this.authService.resetPassword(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this. currentStep = 3;
        } else {
          this.errorMessage = response.message || 'Failed to reset password';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?. message || 'Failed to reset password.   Please try again.';
      }
    });
  }

  resendOtp(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService. resendResetOtp(this.email).subscribe({
      next: () => {
        this.isLoading = false;
        this.countdown = 60;
        this.startCountdown();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?. message || 'Failed to resend OTP';
      }
    });
  }

  private startCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.  countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }
}