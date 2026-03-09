import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BidService } from '../../../core/services/bid';
import { StallService } from '../../../core/services/stall';
import { Stall } from '../../../core/models/stall.model';

interface BiddingResult {
  resultId: number;
  stallId: number;
  stallName: string;
  stallNo: number;
  winnerId: number;
  winnerName: string;
  winnerEmail: string;
  winningBid: number;
  closedAt: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'CANCELLED';
}

@Component({
  selector: 'app-bidding-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bidding-results.html',
  styleUrls: ['./bidding-results.scss']
})
export class BiddingResults implements OnInit {
  results: BiddingResult[] = [];
  filteredResults: BiddingResult[] = [];
  closedStalls: Stall[] = [];
  isLoading = true;
  searchQuery = '';
  activeTab = 'results'; 

  stats = {
    total: 0,
    totalRevenue: 0,
    avgBid: 0
  };

  constructor(
    private http: HttpClient,
    private bidService: BidService,
    private stallService: StallService
  ) {}

  ngOnInit(): void {
    this.loadResults();
    this.loadClosedStalls();
  }

  loadResults(): void {
    this.isLoading = true;
    
    this.http.get<BiddingResult[]>(`${environment.apiUrl}/results/winners`).subscribe({
      next: (results) => {
        this.results = results;
        this.calculateStats();
        this.filterResults();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading results:', error);
        this.results = [];
        this.isLoading = false;
      }
    });
  }

  loadClosedStalls(): void {
    this.stallService.getClosedStalls().subscribe({
      next: (stalls) => {
        // Filter stalls that don't have a winner declared yet
        this.closedStalls = stalls.filter(s => !s.winner);
      },
      error: (error) => {
        console.error('Error loading closed stalls:', error);
        this.closedStalls = [];
      }
    });
  }

  declareWinner(stallId: number): void {
    if (!confirm('Are you sure you want to declare the winner for this stall?')) {
      return;
    }

    this.bidService.declareWinner(stallId).subscribe({
      next: () => {
        alert('Winner declared successfully!');
        this.loadResults();
        this.loadClosedStalls();
      },
      error: (error) => {
        console.error('Error declaring winner:', error);
        alert(error.error?.message || 'Failed to declare winner');
      }
    });
  }

  calculateStats(): void {
    this.stats.total = this.results.length;
    this.stats.totalRevenue = this.results.reduce((sum, r) => sum + (r.winningBid || 0), 0);
    this.stats.avgBid = this.stats.total > 0 ? this.stats.totalRevenue / this.stats.total : 0;
  }

  filterResults(): void {
    if (!this.searchQuery.trim()) {
      this.filteredResults = this.results;
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredResults = this.results.filter(r =>
      r.stallName?.toLowerCase().includes(query) ||
      r.winnerName?.toLowerCase().includes(query) ||
      r.winnerEmail?.toLowerCase().includes(query)
    );
  }

  onSearchChange(): void {
    this.filterResults();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}