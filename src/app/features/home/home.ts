import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { StallService } from '../../core/services/stall';
import { Stall } from '../../core/models/stall.model';

@Component({
  selector:  'app-home',
  standalone:  true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit {
  isLoggedIn = false;
  featuredStalls: Stall[] = [];
  isLoading = false;  // Changed to false by default

  stats = {
    totalUsers: 500,
    totalStalls: 120,
    activeAuctions: 25,
    totalBidsValue: 1500000
  };

  constructor(
    private authService:  AuthService,
    private stallService: StallService
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    // Only load stalls from API if user is logged in
    // Otherwise use mock data (public view)
    if (this.isLoggedIn) {
      this.loadFeaturedStalls();
    } else {
      //  Use mock data for non-logged-in users
      this.featuredStalls = this.getMockStalls();
      this.isLoading = false;
    }
  }

  loadFeaturedStalls(): void {
    this.isLoading = true;
    
    this.stallService.getActiveAuctions().subscribe({
      next: (stalls) => {
        this.featuredStalls = stalls.slice(0, 6);
        this.isLoading = false;
      },
      error: () => {
        this.featuredStalls = this. getMockStalls();
        this.isLoading = false;
      }
    });
  }

  getStatusBadgeClass(status:  string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'AVAILABLE': return 'bg-blue-100 text-blue-800';
      case 'CLOSED':  return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getMockStalls(): Stall[] {
    return [
      {
        stallId: 1,
        stallNo: 101,
        stallName:  'Premium Food Corner',
        description:  'Best location for food stall near main entrance',
        location: 'Block A - Ground Floor',
        category: 'Food',
        image: null,
        basePrice: 5000,
        originalPrice: 5000,
        maxBidders: 10,
        currentHighestBid:  8500,
        totalBids:  15,
        status: 'ACTIVE',
        biddingStart: '2024-01-15T10:00:00',
        biddingEnd:  '2024-01-15T18:00:00',
        createdAt:  '2024-01-01'
      },
      {
        stallId: 2,
        stallNo: 102,
        stallName:  'Tech Electronics Hub',
        description:  'High visibility spot for electronics',
        location: 'Block B - First Floor',
        category: 'Electronics',
        image: null,
        basePrice: 8000,
        currentHighestBid: 12500,
        totalBids: 22,
        maxBidders: 20,
        status: 'ACTIVE',
        originalPrice: 8000,
        biddingStart:  '2024-01-15T10:00:00',
        biddingEnd: '2024-01-15T18:00:00',
        createdAt: '2024-01-01'
      },
      {
        stallId:  3,
        stallNo: 103,
        stallName: 'Fashion & Style Zone',
        description: 'Perfect for clothing and accessories',
        location: 'Block A - First Floor',
        category: 'Clothing',
        image:  null,
        basePrice: 6000,
        originalPrice: 6000,
        maxBidders: 15,
        currentHighestBid: 9000,
        totalBids: 8,
        status: 'ACTIVE',
        biddingStart: '2024-01-15T10:00:00',
        biddingEnd: '2024-01-15T18:00:00',
        createdAt: '2024-01-01'
      }
    ];
  }
}