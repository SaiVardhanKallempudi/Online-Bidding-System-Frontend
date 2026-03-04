import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { Footer } from '../../../shared/components/footer/footer';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrls: ['./signup.scss']
})
export class Signup implements OnInit {
  signupForm: FormGroup;
  currentStep = 1;
  isLoading = false;
  isGoogleLoading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  departments = [
    { value: 'CSE', label: 'Computer Science & Engineering' },
    { value: 'CSM', label: 'Computer Science & AI/ML' },
    { value: 'ECE', label: 'Electronics & Communication' },
    { value: 'EEE', label: 'Electrical & Electronics' },
    { value: 'MECH', label: 'Mechanical Engineering' },
    { value: 'CIVIL', label: 'Civil Engineering' },
    { value: 'IT', label: 'Information Technology' },
    { value: 'MBA', label: 'MBA' },
    { value: 'OTHER', label: 'Other' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.fb.group({
      studentName: ['', [Validators.required, Validators.minLength(3)]],
      studentEmail: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      collageId: ['', [Validators.required, Validators.pattern('^[A-Z0-9]{6,10}$')]],
      phone: ['', [Validators.required, Validators.pattern('^[6-9]\\d{9}$')]],
      department: ['', Validators.required],
      year: ['', Validators.required],
      gender: ['', Validators.required],
      address: ['']
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  signupWithGoogle(): void {
    this.isGoogleLoading = true;
    this.authService.loginWithGoogle();
  }

  nextStep(): void {
    const step1Fields = ['studentName', 'studentEmail', 'collageId', 'phone', 'password', 'confirmPassword'];
    let valid = true;

    step1Fields.forEach(field => {
      const control = this.signupForm.get(field);
      control?.markAsTouched();
      if (control?.invalid) {
        valid = false;
      }
    });

    // Check password match
    const password = this.signupForm.get('password')?.value;
    const confirmPassword = this.signupForm.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (valid) {
      this.errorMessage = '';
      this.currentStep = 2;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.errorMessage = 'Please fill in all required fields correctly';
    }
  }

  prevStep(): void {
    this.currentStep = 1;
    this.errorMessage = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSubmit(): void {
    // Mark all Step 2 fields as touched
    ['department', 'year', 'gender'].forEach(field => {
      this.signupForm.get(field)?.markAsTouched();
    });

    if (this.signupForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly';
      return;
    }

    // Final password match check
    const password = this.signupForm.get('password')?.value;
    const confirmPassword = this.signupForm.get('confirmPassword')?.value;
    if (password !== confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      this.currentStep = 1;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formData = { ...this.signupForm.value };
    delete formData.confirmPassword;
    formData.year = parseInt(formData.year);

    console.log('📤 Submitting signup:', formData.studentEmail);

    this.authService.signUp(formData).subscribe({
      next: (response) => {
        console.log('✅ Signup response:', response);
        this.isLoading = false;

        if (response.success) {
          if (response.isExistingUnverified) {
            console.log('ℹ️ Unverified account found - OTP resent');
          } else {
            console.log('✅ New account created - OTP sent');
          }

          this.router.navigate(['/verify-otp'], {
            queryParams: { email: formData.studentEmail }
          });
        }
      },
      error: (error) => {
        console.error('❌ Signup error:', error);
        this.isLoading = false;

        if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Registration failed';

          if (this.errorMessage.includes('already registered')) {
            setTimeout(() => {
              if (confirm('Email already registered and verified. Go to login page?')) {
                this.router.navigate(['/login']);
              }
            }, 500);
          }
        } else {
          this.errorMessage = 'An unexpected error occurred. Please try again.';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.signupForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'This field is required';
    if (field.errors['email']) return 'Please enter a valid email';
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return `Minimum ${minLength} characters required`;
    }
    if (field.errors['pattern']) {
      if (fieldName === 'phone') return 'Enter valid 10-digit phone number (starting with 6-9)';
      if (fieldName === 'collageId') return 'College ID must be 6-10 uppercase alphanumeric characters';
    }

    return 'Invalid input';
  }

  getPasswordStrength(): { label: string; class: string; width: string } {
    const password = this.signupForm.get('password')?.value || '';

    if (password.length === 0) {
      return { label: '', class: '', width: '0%' };
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      return { label: 'Weak', class: 'bg-red-500', width: '33%' };
    } else if (strength <= 3) {
      return { label: 'Medium', class: 'bg-yellow-500', width: '66%' };
    } else {
      return { label: 'Strong', class: 'bg-green-500', width: '100%' };
    }
  }
}