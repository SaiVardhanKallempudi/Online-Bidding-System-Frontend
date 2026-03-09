import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { UserService } from '../../../core/services/user';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-profile.html',
  styleUrls: ['./edit-profile.scss']
})
export class EditProfile implements OnInit, OnDestroy {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  user: User | null = null;
  isLoading = false;
  isPasswordLoading = false;
  successMessage = '';
  errorMessage = '';
  passwordError = '';
  passwordSuccess = '';
  activeTab = 'profile';
  isProfileIncomplete = false;
  isOAuthUser = false;
  hasExistingPassword = false;

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
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.profileForm = this.fb.group({
      collageId: ['', [Validators.required, Validators.pattern('^[A-Z0-9]{6,12}$')]],
      studentName: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern('^[6-9]\\d{9}$')]],
      department: ['', Validators.required],
      year: ['', Validators.required],
      gender: ['', Validators.required],
      address: ['']
    });

    // Password form - currentPassword is conditionally required
    this.passwordForm = this.fb.group({
      currentPassword: [''],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Check if redirected due to incomplete profile
    this.route.queryParams.subscribe(params => {
      this.isProfileIncomplete = params['incomplete'] === 'true';
    });

    this.user = this.authService.getUser();
    
    if (!this.user) {
      console.error('❌ No user found - redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    // Check if OAuth user (Google login) - has profilePicture but might not have collageId
    this.isOAuthUser = !!this.user.profilePicture && 
                       this.user.studentEmail?.includes('gmail.com') &&
                       !this.user.collageId;

    // Check if user has existing password (to show appropriate form)
    this.hasExistingPassword = !this.isOAuthUser; // Assume regular users have passwords

    console.log('👤 User info:', {
      isOAuthUser: this.isOAuthUser,
      hasExistingPassword: this.hasExistingPassword,
      email: this.user.studentEmail
    });

    // Pre-fill form
    this.profileForm.patchValue({
      collageId: this.user.collageId || '',
      studentName: this.user.studentName || '',
      phone: this.user.phone || '',
      department: this.user.department || '',
      year: this.user.year?.toString() || '',
      gender: this.user.gender || '',
      address: this.user.address || ''
    });

    // Make College ID readonly for users who already have it (non-OAuth or OAuth who completed profile)
    if (this.user.collageId) {
      this.profileForm.get('collageId')?.disable();
    }

    // Check if profile is incomplete
    if (!this.user.collageId || !this.user.phone || !this.user.department || 
        !this.user.year || !this.user.gender) {
      this.isProfileIncomplete = true;
      this.errorMessage = '⚠️ Please complete your profile to continue using the platform.';
    }

    // Update password form validators based on user type
    this.updatePasswordFormValidators();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  updatePasswordFormValidators(): void {
    const currentPasswordControl = this.passwordForm.get('currentPassword');
    
    if (this.isOAuthUser || !this.hasExistingPassword) {
      // OAuth users or users without password don't need current password
      currentPasswordControl?.clearValidators();
      console.log('ℹ️ Current password not required for OAuth user');
    } else {
      // Regular users need current password to change it
      currentPasswordControl?.setValidators([Validators.required]);
      console.log('ℹ️ Current password required for regular user');
    }
    
    currentPasswordControl?.updateValueAndValidity();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.clearMessages();
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.passwordError = '';
    this.passwordSuccess = '';
  }

  onProfileSubmit(): void {
    if (this.profileForm.invalid || !this.user) {
      // Show which fields are invalid
      Object.keys(this.profileForm.controls).forEach(key => {
        const control = this.profileForm.get(key);
        if (control?.invalid) {
          console.error(`❌ Field ${key} is invalid:`, control.errors);
        }
      });
      this.errorMessage = 'Please fill in all required fields correctly.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Use getRawValue() to include disabled fields (like collageId)
    const profileData = {
      ...this.profileForm.getRawValue(),
      year: parseInt(this.profileForm.getRawValue().year)
    };

    console.log('📤 Submitting profile data:', profileData);

    this.userService.updateProfile(profileData).subscribe({
      next: (updatedUser: any) => {
        console.log('✅ Profile updated successfully:', updatedUser);
        this.isLoading = false;
        this.successMessage = '✅ Profile updated successfully!';
        
        // Update local user data
        this.authService.updateUserLocally(updatedUser);
        this.user = updatedUser;
        this.isProfileIncomplete = false;
        
        // If this was an OAuth user completing profile, they're no longer incomplete
        if (this.isOAuthUser && updatedUser.collageId) {
          this.isOAuthUser = false;
          this.profileForm.get('collageId')?.disable();
        }
        
        // Redirect after 2 seconds if profile was incomplete
        if (this.isProfileIncomplete) {
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        } else {
          setTimeout(() => this.successMessage = '', 3000);
        }
      },
      error: (error: any) => {
        console.error('❌ Error updating profile:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.message || error.message || 'Failed to update profile. Please try again.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  onPasswordSubmit(): void {
    if (this.passwordForm.invalid || !this.user) {
      this.passwordError = 'Please fill in all fields correctly.';
      return;
    }

    const newPassword = this.passwordForm.get('newPassword')?.value;
    const confirmPassword = this.passwordForm.get('confirmPassword')?.value;

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      this.passwordError = 'New password and confirmation do not match.';
      return;
    }

    // Check password strength
    if (newPassword.length < 8) {
      this.passwordError = 'Password must be at least 8 characters long.';
      return;
    }

    this.isPasswordLoading = true;
    this.passwordError = '';
    this.passwordSuccess = '';

    // Build password data
    const passwordData: any = {
      newPassword: newPassword
    };

    // Only include currentPassword if user has existing password
    if (this.hasExistingPassword && !this.isOAuthUser) {
      const currentPassword = this.passwordForm.get('currentPassword')?.value;
      
      if (!currentPassword) {
        this.passwordError = 'Current password is required.';
        this.isPasswordLoading = false;
        return;
      }
      
      passwordData.currentPassword = currentPassword;
      console.log('🔒 Changing existing password');
    } else {
      console.log('🔒 Setting new password for OAuth user');
    }

    console.log('📤 Submitting password change');

    this.userService.changePassword(passwordData).subscribe({
      next: (response) => {
        console.log('✅ Password operation successful:', response);
        this.isPasswordLoading = false;
        
        if (this.isOAuthUser || !this.hasExistingPassword) {
          this.passwordSuccess = '✅ Password set successfully! You can now login with email and password.';
          this.hasExistingPassword = true;
          this.isOAuthUser = false; // User now has password, no longer OAuth-only
          this.updatePasswordFormValidators(); // Update form validators
        } else {
          this.passwordSuccess = '✅ Password changed successfully!';
        }
        
        this.passwordForm.reset();
        setTimeout(() => this.passwordSuccess = '', 5000);
      },
      error: (error: any) => {
        console.error('❌ Error with password operation:', error);
        this.isPasswordLoading = false;
        
        // Show specific error messages
        if (error.error?.message) {
          this.passwordError = error.error.message;
        } else if (error.status === 400) {
          this.passwordError = 'Current password is incorrect. Please try again.';
        } else {
          this.passwordError = 'Failed to change password. Please try again.';
        }
      }
    });
  }

  // Helper method to check if a field is invalid
  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  // Helper method to get field error message
  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'This field is required';
    if (field.errors['email']) return 'Please enter a valid email';
    if (field.errors['pattern']) {
      if (fieldName === 'collageId') {
        return 'College ID must be 6-10 uppercase alphanumeric characters (e.g., ABC12345)';
      }
      if (fieldName === 'phone') {
        return 'Please enter a valid 10-digit phone number starting with 6-9';
      }
    }
    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      const currentLength = field.errors['minlength'].actualLength;
      return `Minimum ${minLength} characters required (current: ${currentLength})`;
    }

    return 'Invalid input';
  }

  // Helper to check if password field is invalid
  isPasswordFieldInvalid(fieldName: string): boolean {
    const field = this.passwordForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  // Helper to get password field error
  getPasswordFieldError(fieldName: string): string {
    const field = this.passwordForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'This field is required';
    if (field.errors['minlength']) {
      return `Password must be at least ${field.errors['minlength'].requiredLength} characters`;
    }

    return 'Invalid input';
  }

  // Check if passwords match
  doPasswordsMatch(): boolean {
    const newPass = this.passwordForm.get('newPassword')?.value;
    const confirmPass = this.passwordForm.get('confirmPassword')?.value;
    return newPass === confirmPass && newPass !== '';
  }

  // Get password strength indicator
  getPasswordStrength(): { label: string; class: string; width: string } {
    const password = this.passwordForm.get('newPassword')?.value || '';
    
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