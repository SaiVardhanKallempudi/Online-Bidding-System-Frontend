import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { BidService } from '../../../core/services/bid';
import { StallService } from '../../../core/services/stall';
import { User } from '../../../core/models/user.model';
import { Bid } from '../../../core/models/bid.model';
import { Stall } from '../../../core/models/stall.model';

@Component({
  selector:  'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-dashboard.html',
  styleUrls:  ['./user-dashboard.scss']
})
export class UserDashboard implements OnInit {
  user:  User | null = null;
  recentBids:  Bid[] = [];
  activeAuctions:  Stall[] = [];
  isLoading = true;
  bidsLoading = true;
  auctionsLoading = true;

  stats = {
    totalBids: 0,
    activeBids: 0,
    wonAuctions: 0,
    totalSpent: 0
  };

  constructor(
    private authService: AuthService,
    private bidService: BidService,
    private stallService: StallService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this. isLoading = true;

    if (this.user) {
      this. loadUserBids();
      this.loadActiveAuctions();
    } else {
      this.isLoading = false;
      this.bidsLoading = false;
      this. auctionsLoading = false;
    }
  }

  loadUserBids(): void {
    this.bidsLoading = true;
    
    this.bidService.getMyBids(this.user! .studentId).subscribe({
      next: (bids) => {
        this.recentBids = bids.slice(0, 5);
        this.stats.totalBids = bids.length;
        this.stats.activeBids = bids.filter(b => b.status === 'ACTIVE').length;
        this.stats.wonAuctions = bids.filter(b => b. status === 'WON').length;
        this.stats.totalSpent = bids
          .filter(b => b.status === 'WON')
          .reduce((sum, b) => sum + (b.biddedPrice || 0), 0);
        this.bidsLoading = false;
        this.checkLoading();
      },
      error: (error) => {
        this.recentBids = [];
        this.stats = { totalBids: 0, activeBids:  0, wonAuctions: 0, totalSpent:  0 };
        this.bidsLoading = false;
        this.checkLoading();
      }
    });
  }

  loadActiveAuctions(): void {
    this.auctionsLoading = true;
    
    this.stallService.getActiveAuctions().subscribe({
      next: (stalls) => {
        this.activeAuctions = stalls. slice(0, 3);
        this.auctionsLoading = false;
        this.checkLoading();
      },
      error: (error) => {
        console.error('Error loading auctions:', error);
        this.activeAuctions = [];
        this. auctionsLoading = false;
        this.checkLoading();
      }
    });
  }

  checkLoading(): void {
    if (! this.bidsLoading && ! this.auctionsLoading) {
      this.isLoading = false;
    }
  }

  // ✅ Helper method for stall name
  getBidStallName(bid: Bid): string {
    return bid.stallName || `Stall #${bid.stallId}`;
  }

  // ✅ Helper method for first name
  getFirstName(): string {
    if (!this.user?. studentName) return 'User';
    const parts = this.user. studentName.split(' ');
    return parts[0] || 'User';
  }

  // ✅ Helper method for user initial
  getUserInitial(): string {
    return this.user?.studentName?. charAt(0)?.toUpperCase() || 'U';
  }

  // ✅ Helper method for profile picture
  getProfilePicture(): string | null {
    return this.user?.profilePicture || null;
  }

  getRoleBadgeClass(): string {
    switch (this.user?. role) {
      case 'ADMIN':  return 'bg-purple-100 text-purple-800';
      case 'BIDDER': return 'bg-green-100 text-green-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  
}