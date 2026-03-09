import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

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
    // Check if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Google Signup
   */
  signupWithGoogle(): void {
    this.isGoogleLoading = true;
    this.authService.loginWithGoogle();
  }

  // Next Step - Validate Step 1 fields
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

    if (password !== confirmPassword) {
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

  /**
   * Previous Step
   */
  prevStep(): void {
    this.currentStep = 1;
    this.errorMessage = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Submit Signup Form
   */
  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formData = { ...this.signupForm.value };
    delete formData.confirmPassword;
    formData.year = parseInt(formData.year);


    this.authService.signUp(formData).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.success) {
          // Navigate to OTP verification
          this.router.navigate(['/verify-otp'], {
            queryParams: { email: formData.studentEmail }
          });
        }
      },
      error: (error) => {
        this.isLoading = false;

        // Handle different error scenarios
        if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Registration failed';

          // If already registered and verified, redirect to login
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

  /**
   * Toggle Password Visibility
   */
  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  /**
   * Check if field is invalid
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Get field error message
   */
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

  /**
   * Check password strength
   */
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