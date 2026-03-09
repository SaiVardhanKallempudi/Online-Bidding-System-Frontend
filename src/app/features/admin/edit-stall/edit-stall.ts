import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { StallService } from '../../../core/services/stall';
import { Stall } from '../../../core/models/stall.model';

@Component({
  selector: 'app-edit-stall',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-stall.html',
  styleUrls: ['./edit-stall.scss']
})
export class EditStall implements OnInit {
  stallForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  imagePreview: string | null = null;
  stallId: number = 0;
  originalStall: Stall | null = null;

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
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.stallForm = this.fb.group({
      stallNo: ['', [Validators.required, Validators.min(1)]],
      stallName: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      location: ['', Validators.required],
      category: ['', Validators.required],
      basePrice: ['', [Validators.required, Validators.min(100)]],
      originalPrice: ['', [Validators.required, Validators.min(100)]],
      maxBidders: [10],
      biddingStart: ['', Validators.required],
      biddingEnd: ['', Validators.required],
      image: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.stallId = parseInt(id);
      this.loadStall();
    }
  }

  loadStall(): void {
    this.isLoading = true;
    this.stallService.getStallById(this.stallId).subscribe({
      next: (stall: Stall) => {
        this.originalStall = stall;
        this.populateForm(stall);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load stall details';
        this.isLoading = false;
      }
    });
  }

  populateForm(stall: Stall): void {
    // Convert date strings to datetime-local format
    const biddingStart = stall.biddingStart 
      ? new Date(stall.biddingStart).toISOString().slice(0, 16) 
      : '';
    const biddingEnd = stall.biddingEnd 
      ? new Date(stall.biddingEnd).toISOString().slice(0, 16) 
      : '';

    this.stallForm.patchValue({
      stallNo: stall.stallNo,
      stallName: stall.stallName,
      description: stall.description,
      location: stall.location,
      category: stall.category,
      basePrice: stall.basePrice,
      originalPrice: stall.originalPrice || stall.basePrice,
      maxBidders: stall.maxBidders || 10,
      biddingStart: biddingStart,
      biddingEnd: biddingEnd,
      image: stall.image || ''
    });

    if (stall.image) {
      this.imagePreview = stall.image;
    }
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      if (file.size > 100 * 1024) {
        this.errorMessage = 'Image size must be less than 100KB';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
        this.stallForm.patchValue({ image: this.imagePreview });
        this.errorMessage = '';
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.imagePreview = null;
    this.stallForm.patchValue({ image: '' });
  }

  onSubmit(): void {
    if (this.stallForm.invalid) {
      Object.keys(this.stallForm.controls).forEach(key => {
        this.stallForm.get(key)?.markAsTouched();
      });
      return;
    }

    const startDate = new Date(this.stallForm.value.biddingStart);
    const endDate = new Date(this.stallForm.value.biddingEnd);
    
    if (endDate <= startDate) {
      this.errorMessage = 'End date must be after start date';
      return;
    }

    const basePrice = parseFloat(this.stallForm.value.basePrice);
    const originalPrice = parseFloat(this.stallForm.value.originalPrice);
    
    if (originalPrice < basePrice) {
      this.errorMessage = 'Original price must be greater than or equal to base price';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData: any = {
      stallNo: parseInt(this.stallForm.value.stallNo),
      stallName: this.stallForm.value.stallName,
      description: this.stallForm.value.description,
      location: this.stallForm.value.location,
      category: this.stallForm.value.category,
      basePrice: basePrice,
      originalPrice: originalPrice,
      maxBidders: parseInt(this.stallForm.value.maxBidders) || 10,
      biddingStart: this.stallForm.value.biddingStart,
      biddingEnd: this.stallForm.value.biddingEnd
    };

    const imageData = this.stallForm.value.image;
    if (imageData && imageData.length < 65000) {
      formData.image = imageData;
    }


    this.stallService.updateStall(this.stallId, formData).subscribe({
      next: (response) => {
        console.log('Stall updated successfully:', response);
        this.isLoading = false;
        this.successMessage = 'Stall updated successfully!';
        setTimeout(() => {
          this.router.navigate(['/admin/stalls']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error updating stall:', error);
        this.isLoading = false;
        
        if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else if (error.status === 403) {
          this.errorMessage = 'Access denied. You must be an admin.';
        } else if (error.status === 401) {
          this.errorMessage = 'Please login again.';
        } else {
          this.errorMessage = 'Failed to update stall. Please try again.';
        }
      }
    });
  }

  getMinDateTime(): string {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  }
}
