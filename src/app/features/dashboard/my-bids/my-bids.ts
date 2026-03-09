import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { BidService } from '../../../core/services/bid';
import { Bid } from '../../../core/models/bid.model';

@Component({
  selector: 'app-my-bids',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './my-bids.html',
  styleUrls: ['./my-bids.scss']
})
export class MyBids implements OnInit {
  allBids: Bid[] = [];
  filteredBids: Bid[] = [];
  isLoading = true;
  activeTab = 'all';
  error = '';
  searchQuery = '';
  sortBy = 'recent'; // recent, amount-high, amount-low

  tabs = [
    { id: 'all', label: 'All Bids', icon: '📋' },
    { id: 'active', label: 'Active', icon: '🔴' },
    { id: 'won', label: 'Won', icon: '🏆' },
    { id: 'lost', label: 'Lost', icon: '😔' }
  ];

  stats = {
    total: 0,
    active: 0,
    won: 0,
    lost: 0,
    totalSpent: 0,
    avgBidAmount: 0
  };

  constructor(
    private authService: AuthService,
    private bidService: BidService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBids();
  }

  loadBids(): void {
    const user = this.authService.getUser();
    
    // Check if user is logged in
    if (!user) {
      console.error('❌ No user found - not logged in');
      this.isLoading = false;
      this.error = 'Please login to view your bids';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
      return;
    }

    this.isLoading = true;
    this.error = '';


    // Call the service - userId parameter is optional and ignored by the API
    // The API uses @AuthenticationPrincipal from JWT token
    this.bidService.getMyBids().subscribe({
      next: (bids) => {
        
        // Validate the response
        if (!bids) {
          console.warn('⚠️ API returned null/undefined');
          this.allBids = [];
        } else if (!Array.isArray(bids)) {
          console.error('❌ API returned non-array data:', bids);
          this.allBids = [];
        } else {
          // The service already filters invalid bids, but double-check
          this.allBids = bids;
        }
        
        this.calculateStats();
        this.applyFiltersAndSort();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading bids:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.error?.message);
        
        // Handle different error types
        if (error.status === 401) {
          this.error = 'Session expired. Please login again.';
          setTimeout(() => {
            this.authService.logout();
            this.router.navigate(['/login']);
          }, 2000);
        } else if (error.status === 403) {
          this.error = 'Access denied. You do not have permission to view bids.';
        } else if (error.status === 404) {
          // 404 might mean no bids found - show empty state instead of error
          this.allBids = [];
          this.calculateStats();
          this.applyFiltersAndSort();
          this.isLoading = false;
          return; // Don't show error message
        } else if (error.status === 500) {
          this.error = 'Server error: ' + (error.error?.message || 'An unexpected error occurred on the server.');
          console.error('🔥 Server returned 500 error');
        } else if (error.status === 0) {
          this.error = 'Cannot connect to server. Please check your internet connection or ensure the backend server is running.';
        } else {
          this.error = error.error?.message || 'Failed to load your bids. Please try again later.';
        }
        
        this.allBids = [];
        this.stats = { total: 0, active: 0, won: 0, lost: 0, totalSpent: 0, avgBidAmount: 0 };
        this.filteredBids = [];
        this.isLoading = false;
      }
    });
  }

  calculateStats(): void {
    if (!this.allBids || this.allBids.length === 0) {
      this.stats = { total: 0, active: 0, won: 0, lost: 0, totalSpent: 0, avgBidAmount: 0 };
      return;
    }

    this.stats.total = this.allBids.length;
    this.stats.active = this.allBids.filter(b => 
      b.status && b.status.toUpperCase() === 'ACTIVE'
    ).length;
    this.stats.won = this.allBids.filter(b => 
      b.status && b.status.toUpperCase() === 'WON'
    ).length;
    this.stats.lost = this.allBids.filter(b => 
      b.status && b.status.toUpperCase() === 'LOST'
    ).length;
    
    this.stats.totalSpent = this.allBids.reduce((sum, bid) => {
      const price = bid.biddedPrice || 0;
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
    
    this.stats.avgBidAmount = this.stats.total > 0 
      ? Math.round(this.stats.totalSpent / this.stats.total) 
      : 0;
    
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    this.applyFiltersAndSort();
  }

  applyFiltersAndSort(): void {
    if (!this.allBids || this.allBids.length === 0) {
      this.filteredBids = [];
      return;
    }

    let filtered = [...this.allBids];

    // Filter by tab
    switch (this.activeTab) {
      case 'active':
        filtered = filtered.filter(b => b.status && b.status.toUpperCase() === 'ACTIVE');
        break;
      case 'won':
        filtered = filtered.filter(b => b.status && b.status.toUpperCase() === 'WON');
        break;
      case 'lost':
        filtered = filtered.filter(b => b.status && b.status.toUpperCase() === 'LOST');
        break;
      default:
        break;
    }

    // Filter by search query
    if (this.searchQuery && this.searchQuery.trim()) {
      const query = this.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(b => {
        const stallName = this.getBidStallName(b).toLowerCase();
        return stallName.includes(query);
      });
    }

    // Sort
    switch (this.sortBy) {
      case 'recent':
        filtered.sort((a, b) => {
          const dateA = a.bidTime ? new Date(a.bidTime).getTime() : 0;
          const dateB = b.bidTime ? new Date(b.bidTime).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'amount-high':
        filtered.sort((a, b) => (b.biddedPrice || 0) - (a.biddedPrice || 0));
        break;
      case 'amount-low':
        filtered.sort((a, b) => (a.biddedPrice || 0) - (b.biddedPrice || 0));
        break;
    }

    this.filteredBids = filtered;
  }

  onSearchChange(): void {
    this.applyFiltersAndSort();
  }

  onSortChange(): void {
    this.applyFiltersAndSort();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.activeTab = 'all';
    this.sortBy = 'recent';
    this.applyFiltersAndSort();
  }

  retryLoad(): void {
    this.loadBids();
  }

  getBidStallName(bid: Bid): string {
    if (!bid) return 'Unknown Stall';
    if (bid.stallName && bid.stallName.trim()) {
      return bid.stallName;
    }
    return `Stall #${bid.stallId || 'Unknown'}`;
  }

  getStatusBadge(bid: Bid): { class: string; label: string; icon: string } {
    if (!bid || !bid.status) {
      return { 
        class: 'bg-blue-100 text-blue-800 border-blue-200', 
        label: 'Pending', 
        icon: '⏳' 
      };
    }

    const status = bid.status.toUpperCase();

    switch (status) {
      case 'ACTIVE': 
        return { 
          class: 'bg-green-100 text-green-800 border-green-200', 
          label: 'Active', 
          icon: '🔴' 
        };
      case 'WON':
        return { 
          class: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          label: 'Won', 
          icon: '🏆' 
        };
      case 'LOST': 
        return { 
          class: 'bg-gray-100 text-gray-800 border-gray-200', 
          label: 'Lost', 
          icon: '😔' 
        };
      default:
        return { 
          class: 'bg-blue-100 text-blue-800 border-blue-200', 
          label: 'Pending', 
          icon: '⏳' 
        };
    }
  }

  isWinning(bid: Bid): boolean {
    if (!bid) return false;
    const isActive = !!(bid.status && bid.status.toUpperCase() === 'ACTIVE');
    const isHighest = bid.isHighestBid === true;
    return isActive && isHighest;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      if (diff < 0) return 'Just now';
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }

  formatFullDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (error) {
      console.error('Error formatting full date:', error);
      return 'Invalid date';
    }
  }
}