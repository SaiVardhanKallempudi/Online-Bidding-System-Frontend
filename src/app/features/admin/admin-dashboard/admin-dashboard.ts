import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user';
import { StallService } from '../../../core/services/stall';
import { BidderApplicationService } from '../../../core/services/bidder-application';
import { BidderApplicationResponse } from '../../../core/models/bidder-application.model';
import { User } from '../../../core/models/user.model';
import { Stall } from '../../../core/models/stall.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss']
})
export class AdminDashboard implements OnInit {
  isLoading = true;
  error = '';

  stats = {
    totalUsers: 0,
    totalBidders: 0,
    totalStalls: 0,
    activeAuctions: 0,
    pendingApplications: 0,
    totalRevenue: 0
  };

  recentApplications: BidderApplicationResponse[] = [];
  activeStalls: Stall[] = [];

  constructor(
    private userService: UserService,
    private stallService: StallService,
    private applicationService: BidderApplicationService
  ) {}

  ngOnInit(): void {
    console.log('Admin Dashboard initialized');
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.error = '';
    
    // Load all data
    this.loadUsers();
    this.loadStalls();
    this.loadApplications();
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users: User[]) => {
        console.log('Users loaded:', users.length);
        this.stats.totalUsers = users.length;
        this.stats.totalBidders = users.filter(u => u.role === 'BIDDER').length;
      },
      error: (error: any) => {
        console.error('Error loading users:', error);
        this.stats.totalUsers = 0;
        this.stats.totalBidders = 0;
      }
    });
  }

  loadStalls(): void {
    this.stallService.getAllStalls().subscribe({
      next: (stalls: Stall[]) => {
        console.log('Stalls loaded:', stalls.length);
        this.stats.totalStalls = stalls.length;
        this.stats.activeAuctions = stalls.filter(s => s.status === 'ACTIVE').length;
        this.activeStalls = stalls.filter(s => s.status === 'ACTIVE').slice(0, 5);
      },
      error: (error: any) => {
        console.error('Error loading stalls:', error);
        this.stats.totalStalls = 0;
        this.stats.activeAuctions = 0;
        this.activeStalls = [];
      }
    });
  }

  loadApplications(): void {
    this.applicationService.getPendingApplications().subscribe({
      next: (apps: BidderApplicationResponse[]) => {
        console.log('Applications loaded:', apps.length);
        this.stats.pendingApplications = apps.length;
        this.recentApplications = apps.slice(0, 5);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading applications:', error);
        this.stats.pendingApplications = 0;
        this.recentApplications = [];
        this.isLoading = false;
      }
    });
  }

  approveApplication(applicationId: number): void {
    if (!confirm('Are you sure you want to approve this application?')) {
      return;
    }

    this.applicationService.approveApplication(applicationId).subscribe({
      next: () => {
        console.log('✅ Application approved');
        // Refresh applications list
        this.loadApplications();
      },
      error: (error: any) => {
        console.error('❌ Error approving application:', error);
        alert('Failed to approve application. Please try again.');
      }
    });
  }

  rejectApplication(applicationId: number): void {
    if (!confirm('Are you sure you want to reject this application?')) {
      return;
    }

    this.applicationService.rejectApplication(applicationId).subscribe({
      next: () => {
        console.log('✅ Application rejected');
        // Refresh applications list
        this.loadApplications();
      },
      error: (error: any) => {
        console.error('❌ Error rejecting application:', error);
        alert('Failed to reject application. Please try again.');
      }
    });
  }

  getApplicationUserName(app: BidderApplicationResponse): string {
    return app.user?.studentName || app.studentName || 'Unknown User';
  }

  getApplicationUserEmail(app: BidderApplicationResponse): string {
    return app.user?.studentEmail || app.studentEmail || '';
  }

  getApplicationUserInitial(app: BidderApplicationResponse): string {
    const name = this.getApplicationUserName(app);
    return name.charAt(0).toUpperCase();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}