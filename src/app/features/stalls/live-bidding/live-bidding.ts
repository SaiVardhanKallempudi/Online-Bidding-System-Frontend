import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { StallService } from '../../../core/services/stall';
import { BidService } from '../../../core/services/bid';
import { AuthService } from '../../../core/services/auth';
import { Stall } from '../../../core/models/stall.model';
import { Bid, BidRequest } from '../../../core/models/bid.model';
import { User } from '../../../core/models/user.model';
import { StallComments } from '../components/stall-comments/stall-comments';

@Component({
  selector: 'app-live-bidding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StallComments],
  templateUrl: './live-bidding.html',
  styleUrls: ['./live-bidding.scss']
})
export class LiveBidding implements OnInit, OnDestroy {
  stall: Stall | null = null;
  user: User | null = null;
  bidHistory: Bid[] = [];
  isLoading = true;
  error = '';
  activeTab = 'bids';

  // Bidding
  bidAmount: number = 0;
  minBidAmount: number = 0;
  isBidding = false;
  bidError = '';
  bidSuccess = '';

  // Timer
  timeRemaining = '';
  timerInterval: any;
  isAuctionEnded = false;
  isAuctionNotStarted = false;

  // Auto-refresh
  private refreshSubscription?: Subscription;

  // FIX #1: Moved initialStallLoad to be a proper class field (was declared mid-class)
  private initialStallLoad: boolean = true;
  private currentStallId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private stallService: StallService,
    private bidService: BidService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();

    const stallId =
      this.route.snapshot.params['id'] ||
      this.route.snapshot.params['stallId'] ||
      this.route.snapshot.paramMap.get('id') ||
      this.route.snapshot.paramMap.get('stallId');

    console.log('🔍 Loading stall ID:', stallId);

    if (stallId) {
      const id = parseInt(stallId, 10); // FIX #2: Always pass radix 10 to parseInt
      this.currentStallId = id;

      this.loadStall(id);
      this.loadBidHistory(id);

      // Auto-refresh every 2 seconds for real-time updates
      this.refreshSubscription = interval(2000).subscribe(() => {
        if (!this.isAuctionEnded && !this.isAuctionNotStarted) {
          this.loadStall(id, true);
          this.loadBidHistory(id, true);
        }
      });
    } else {
      console.error('❌ No stall ID found!');
      this.error = 'Stall ID not found';
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadStall(stallId: number, silent: boolean = false): void {
    if (!silent) this.isLoading = true;

    this.stallService.getStallById(stallId).subscribe({
      next: (stall: Stall) => {
        this.stall = stall;
        this.minBidAmount = (stall.currentHighestBid || stall.basePrice) + 100;

        // FIX #3: Only set bidAmount on first load — do NOT touch it after that.
        // Previously the success handler also set minBidAmount/bidAmount causing
        // a race condition with this async loadStall callback overwriting values.
        if (this.initialStallLoad) {
          this.bidAmount = this.minBidAmount;
          this.initialStallLoad = false;
        }

        if (!this.timerInterval) {
          this.startTimer();
        }

        if (!silent) this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading stall:', error);
        this.error = 'Failed to load auction details';
        if (!silent) this.isLoading = false;
      }
    });
  }

  loadBidHistory(stallId: number, silent: boolean = false): void {
    this.bidService.getBidHistory(stallId).subscribe({
      next: (bids: Bid[]) => {
        console.log('✅ Loaded', bids.length, 'bids');
        this.bidHistory = bids;
      },
      error: (error: any) => {
        console.error('❌ Error loading bids:', error);
        this.bidHistory = [];
      }
    });
  }

  placeBid(): void {
    if (!this.stall || !this.user || this.isBidding) return;

    if (this.bidAmount < this.minBidAmount) {
      this.bidError = `Minimum bid is ₹${this.minBidAmount}`;
      return;
    }

    this.isBidding = true;
    this.bidError = '';
    this.bidSuccess = '';

    const bidRequest: BidRequest = {
      stallId: this.stall.stallId,
      bidderId: this.user.studentId,
      biddedPrice: this.bidAmount
    };

    console.log('💰 Placing bid:', bidRequest);

    this.bidService.placeBid(bidRequest).subscribe({
      next: (response) => {
        console.log('✅ Bid placed successfully:', response);
        this.bidSuccess = '✅ Bid placed successfully!';
        this.isBidding = false;

        // FIX #4: Removed the manual minBidAmount/bidAmount update here.
        // It caused a race condition — loadStall() below is async and would
        // overwrite these values with stale server data AFTER we set them.
        // loadStall now solely controls minBidAmount; bidAmount is only
        // updated inside loadStall on the very first load (initialStallLoad).
        // After placing a bid, we update bidAmount to minBidAmount AFTER
        // the fresh server response arrives via loadStall callback.
        const placedAmount = this.bidAmount;
        this.loadStall(this.stall!.stallId, true);
        this.loadBidHistory(this.stall!.stallId, true);

        // FIX #5: Optimistically update bidAmount using locally known placed amount
        // so the UI feels snappy, but loadStall will correct it if server differs.
        this.minBidAmount = placedAmount + 100;
        this.bidAmount = this.minBidAmount;

        setTimeout(() => {
          this.bidSuccess = '';
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Error placing bid:', error);
        // FIX #6: Improved error message extraction — handles both string and object errors
        this.bidError =
          error?.error?.message ||
          error?.message ||
          'Failed to place bid. Please try again.';
        this.isBidding = false;
      }
    });
  }

  incrementBid(amount: number): void {
    // FIX #7: Guard against incrementing below minBidAmount
    this.bidAmount = Math.max(this.bidAmount + amount, this.minBidAmount);
    console.log('➕ Bid amount increased to:', this.bidAmount);
  }

  startTimer(): void {
    if (!this.stall?.biddingEnd) {
      console.warn('⚠️ No bidding end time');
      return;
    }

    this.updateTimer();
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  updateTimer(): void {
    if (!this.stall?.biddingEnd || !this.stall?.biddingStart) {
      this.timeRemaining = 'No time set';
      return;
    }

    const startTime = new Date(this.stall.biddingStart).getTime();
    const endTime = new Date(this.stall.biddingEnd).getTime();
    const now = Date.now(); // FIX #8: Use Date.now() — cleaner and avoids creating a Date object

    if (now < startTime) {
      const diff = startTime - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      this.timeRemaining = `Starts in ${hours}h ${minutes}m ${seconds}s`;
      this.isAuctionNotStarted = true;
      this.isAuctionEnded = false;
      return;
    }

    const diff = endTime - now;

    if (diff <= 0) {
      this.timeRemaining = 'ENDED';
      this.isAuctionEnded = true;
      this.isAuctionNotStarted = false;
      clearInterval(this.timerInterval);
      this.timerInterval = null; // FIX #9: Null out timerInterval after clearing to prevent stale reference
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    this.timeRemaining = `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.isAuctionNotStarted = false;
    this.isAuctionEnded = false;
  }

  isTimerUrgent(): boolean {
    if (
      !this.timeRemaining ||
      this.timeRemaining === 'ENDED' ||
      this.isAuctionNotStarted
    ) {
      return false;
    }

    const parts = this.timeRemaining.split(':');
    if (parts.length !== 3) return false;

    const hours = parseInt(parts[0], 10); // FIX #10: Radix 10 for all parseInt calls
    const minutes = parseInt(parts[1], 10);

    return hours === 0 && minutes < 5;
  }

  isMyBid(bid: Bid): boolean {
    return bid.bidderId === this.user?.studentId;
  }

  getBidderName(bid: Bid): string {
    if (this.isMyBid(bid)) return 'You';
    return bid.bidderName || 'Anonymous';
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getUserInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }
}