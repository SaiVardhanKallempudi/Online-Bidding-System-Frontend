import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { StallService } from '../../../core/services/stall';
import { BidService } from '../../../core/services/bid';
import { AuthService } from '../../../core/services/auth';
import { Stall } from '../../../core/models/stall.model';
import { Bid } from '../../../core/models/bid.model';
import { User } from '../../../core/models/user.model';
import { CountdownTimer } from '../../../shared/components/countdown-timer/countdown-timer';
import { StallComments } from "../components/stall-comments/stall-comments";

@Component({
  selector: 'app-stall-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CountdownTimer, StallComments],
  templateUrl: './stall-detail.html',
  styleUrls: ['./stall-detail.scss']
})
export class StallDetail implements OnInit, OnDestroy {
  stall: Stall | null = null;
  user: User | null = null;
  bidHistory: Bid[] = [];
  isLoading = true;
  isLoadingBids = false;
  error = '';
  
  // ✅ Add activeTab property
  activeTab: 'bidding' | 'comments' = 'bidding';
  
  // Auto-refresh
  private refreshSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stallService: StallService,
    private bidService: BidService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    
    const stallId = this.route.snapshot.params['id'] || 
                    this.route.snapshot.paramMap.get('id');
    
    if (stallId) {
      this.loadStall(+stallId);
      this.loadBidHistory(+stallId);
      
      // Auto-refresh every 3 seconds for ACTIVE stalls
      this.refreshSubscription = interval(3000).subscribe(() => {
        if (this.stall?.status === 'ACTIVE') {
          this.loadStall(+stallId, true);
          this.loadBidHistory(+stallId, true);
        }
      });
    } else {
      console.error('❌ No stall ID found in route!');
      this.error = 'Stall ID not found';
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadStall(id: number, silent: boolean = false): void {
    if (!silent) this.isLoading = true;
    
    this.stallService.getStallById(id).subscribe({
      next: (stall) => {
        this.stall = stall;
        if (!silent) this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading stall:', error);
        this.error = 'Failed to load stall details';
        if (!silent) this.isLoading = false;
      }
    });
  }

  loadBidHistory(stallId: number, silent: boolean = false): void {
    if (!silent) this.isLoadingBids = true;
    
    this.bidService.getBidHistory(stallId).subscribe({
      next: (bids) => {
        this.bidHistory = bids.slice(0, 10);
        if (!silent) this.isLoadingBids = false;
      },
      error: (error) => {
        console.error('❌ Error loading bids:', error);
        this.bidHistory = [];
        if (!silent) this.isLoadingBids = false;
      }
    });
  }

  isBidder(): boolean {
    return this.user?.role === 'BIDDER' || this.user?.role === 'ADMIN';
  }

  isAdmin(): boolean {
    return this.user?.role === 'ADMIN';
  }

  canPlaceBid(): boolean {
    return this.isBidder() && this.stall?.status === 'ACTIVE';
  }

  goToLiveBidding(): void {
    if (this.stall) {
      this.router.navigate(['/bidding', this.stall.stallId]);
    }
  }

  isMyBid(bid: Bid): boolean {
    return bid.bidderId === this.user?.studentId;
  }

  getBidderName(bid: Bid): string {
    if (this.isMyBid(bid)) return 'You';
    return bid.bidderName || 'Anonymous';
  }

  getStatusBadgeClass(): string {
    switch (this.stall?.status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'AVAILABLE': return 'bg-blue-100 text-blue-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  }

  getUserInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }
}