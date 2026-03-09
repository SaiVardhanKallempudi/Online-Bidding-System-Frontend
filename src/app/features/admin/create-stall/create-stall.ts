import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StallService } from '../../../core/services/stall';

@Component({
  selector: 'app-create-stall',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-stall.html',
  styleUrls: ['./create-stall.scss']
})
export class CreateStall {
  stallForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  imagePreview: string | null = null;

  categories = [
    'Food',
    'Electronics',
    'Clothing',
    'Books',
    'Accessories',
    'Games',
    'Services',
    'Other'
  ];

  locations = [
    'Block A - Ground Floor',
    'Block A - First Floor',
    'Block B - Ground Floor',
    'Block B - First Floor',
    'Main Entrance',
    'Cafeteria Area',
    'Library Area',
    'Sports Complex',
    'Outdoor Area'
  ];

  constructor(
    private fb: FormBuilder,
    private stallService: StallService,
    private router: Router
  ) {
    this.stallForm = this.fb.group({
      stallNo:  ['', [Validators.required, Validators.min(1)]],
      stallName: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      location: ['', Validators.required],
      category: ['', Validators.required],
      basePrice:  ['', [Validators.required, Validators.min(100)]],
      originalPrice: ['', [Validators.required, Validators.min(100)]],
      maxBidders: [10], 
      biddingStart: ['', Validators.required],
      biddingEnd: ['', Validators.required],
      image: ['']
    });
  }

  onImageSelected(event:  Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // Check file size - limit to 100KB
      if (file.size > 100 * 1024) {
        this.errorMessage = 'Image size must be less than 100KB';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        this. imagePreview = reader.result as string;
        this.stallForm.patchValue({ image: this.imagePreview });
        this.errorMessage = '';
      };
      reader. readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.imagePreview = null;
    this.stallForm.patchValue({ image: '' });
  }

  onSubmit(): void {
    if (this.stallForm. invalid) {
      Object.keys(this.stallForm.controls).forEach(key => {
        this. stallForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Validate dates
    const startDate = new Date(this.stallForm.value.biddingStart);
    const endDate = new Date(this.stallForm.value.biddingEnd);
    
    if (endDate <= startDate) {
      this.errorMessage = 'End date must be after start date';
      return;
    }

    // Validate prices
    const basePrice = parseFloat(this.stallForm. value.basePrice);
    const originalPrice = parseFloat(this.stallForm.value.originalPrice);
    
    if (originalPrice < basePrice) {
      this.errorMessage = 'Original price must be greater than or equal to base price';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData:  any = {
      stallNo: parseInt(this.stallForm. value.stallNo),
      stallName:  this.stallForm. value.stallName,
      description: this.stallForm.value.description,
      location: this.stallForm.value.location,
      category:  this.stallForm. value.category,
      basePrice: basePrice,
      originalPrice: originalPrice,  
      maxBidders: parseInt(this.stallForm.value.maxBidders) || 10,
      biddingStart: this.stallForm.value.biddingStart,
      biddingEnd: this.stallForm.value.biddingEnd
    };

    const imageData = this.stallForm.value.image;
    if (imageData && imageData. length < 65000) {
      formData.image = imageData;
    }

    console.log('Submitting stall data:', formData);

    this.stallService.createStall(formData).subscribe({
      next: (response) => {
        console. log('Stall created successfully:', response);
        this.isLoading = false;
        this.successMessage = 'Stall created successfully! ';
        setTimeout(() => {
          this.router.navigate(['/admin/stalls']);
        }, 2000);
      },
      error:  (error) => {
        console.error('Error creating stall:', error);
        this.isLoading = false;
        
        if (error.error?. message) {
          this.errorMessage = error.error.message;
        } else if (error.status === 403) {
          this.errorMessage = 'Access denied. You must be an admin. ';
        } else if (error.status === 401) {
          this.errorMessage = 'Please login again. ';
        } else {
          this.errorMessage = 'Failed to create stall.  Please try again.';
        }
      }
    });
  }

  getMinDateTime(): string {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  }
}