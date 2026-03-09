import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BidderApplicationService } from '../../../core/services/bidder-application';
import { BidderApplicationResponse } from '../../../core/models/bidder-application.model';

@Component({
  selector: 'app-manage-applications',
  standalone: true,
  imports:  [CommonModule, FormsModule, RouterLink],
  templateUrl: './manage-applications.html',
  styleUrls: ['./manage-applications.scss']
})
export class ManageApplications implements OnInit {
  applications: BidderApplicationResponse[] = [];
  filteredApplications: BidderApplicationResponse[] = [];
  isLoading = true;
  activeTab = 'PENDING';
  searchQuery = '';
  
  // Modal
  showModal = false;
  selectedApplication: BidderApplicationResponse | null = null;
  adminRemarks = '';
  isProcessing = false;

  tabs = [
    { id: 'PENDING', label: 'Pending', icon: '🕐', color: 'yellow' },
    { id: 'APPROVED', label: 'Approved', icon: '✅', color: 'green' },
    { id: 'REJECTED', label:  'Rejected', icon: '❌', color: 'red' },
    { id:  'ALL', label: 'All', icon: '📋', color: 'gray' }
  ];

  stats = {
    pending: 0,
    approved: 0,
    rejected:  0,
    total: 0
  };

  constructor(private applicationService: BidderApplicationService) {}

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.isLoading = true;

    this.applicationService.getAllApplications().subscribe({
      next: (apps: BidderApplicationResponse[]) => {
        this.applications = apps;
        this. calculateStats();
        this.filterApplications();
        this.isLoading = false;
      },
      error: (error:  any) => {
        console.error('Error loading applications:', error);
        this.applications = [];
        this.isLoading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats. total = this.applications.length;
    this.stats.pending = this.applications. filter(a => a.status === 'PENDING').length;
    this.stats.approved = this.applications.filter(a => a. status === 'APPROVED').length;
    this.stats. rejected = this.applications.filter(a => a.status === 'REJECTED').length;
  }

  setActiveTab(tabId: string): void {
    this. activeTab = tabId;
    this.filterApplications();
  }

  filterApplications(): void {
    let filtered = this.applications;

    if (this.activeTab !== 'ALL') {
      filtered = filtered.filter(a => a.status === this.activeTab);
    }

    if (this.searchQuery. trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered. filter(a =>
        this.getApplicationUserName(a).toLowerCase().includes(query) ||
        this.getApplicationUserEmail(a).toLowerCase().includes(query) ||
        this.getApplicationCollageId(a).toLowerCase().includes(query)
      );
    }

    this.filteredApplications = filtered;
  }

  onSearchChange(): void {
    this.filterApplications();
  }

  openModal(application: BidderApplicationResponse): void {
    this.selectedApplication = application;
    this. adminRemarks = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedApplication = null;
    this.adminRemarks = '';
  }

  approveApplication(): void {
    if (!this.selectedApplication) return;

    this.isProcessing = true;

    this.applicationService.approveApplication(
      this.selectedApplication.applicationId
    ).subscribe({
      next: () => {
        this. isProcessing = false;
        this.closeModal();
        this.loadApplications();
      },
      error:  (error: any) => {
        console.error('Error approving application:', error);
        this.isProcessing = false;
      }
    });
  }

  rejectApplication(): void {
    if (!this.selectedApplication) return;

    this.isProcessing = true;

    const observable = this.adminRemarks
      ?  this.applicationService. rejectWithReason(this.selectedApplication.applicationId, this.adminRemarks)
      : this. applicationService.rejectApplication(this.selectedApplication.applicationId);

    observable.subscribe({
      next:  () => {
        this.isProcessing = false;
        this.closeModal();
        this.loadApplications();
      },
      error:  (error: any) => {
        this.isProcessing = false;
      }
    });
  }

  quickApprove(app: BidderApplicationResponse, event: Event): void {
    event.stopPropagation();
    this.applicationService.approveApplication(app.applicationId).subscribe({
      next: () => this.loadApplications(),
      error: (error: any) => console.error('Error:', error)
    });
  }

  quickReject(app: BidderApplicationResponse, event: Event): void {
    event.stopPropagation();
    this.applicationService. rejectApplication(app.applicationId).subscribe({
      next:  () => this.loadApplications(),
      error: (error:  any) => console.error('Error:', error)
    });
  }

  // Helper methods to get user data
  getApplicationUserName(app: BidderApplicationResponse): string {
    return app.user?.studentName || app.userName || 'Unknown';
  }

  getApplicationUserEmail(app: BidderApplicationResponse): string {
    return app. user?.studentEmail || app.userEmail || '';
  }

  getApplicationCollageId(app: BidderApplicationResponse): string {
    return app.user?.collageId || app.userCollageId || '';
  }

  getApplicationDepartment(app:  BidderApplicationResponse): string {
    return app.user?. department || app.userDepartment || 'N/A';
  }

  getApplicationYear(app: BidderApplicationResponse): number | string {
    return app.user?.year || app.userYear || 'N/A';
  }

  getApplicationPhone(app: BidderApplicationResponse): string {
    return app.user?.phone || app.userPhone || 'N/A';
  }

  getApplicationProfilePicture(app:  BidderApplicationResponse): string | null {
    return app.user?.profilePicture || app.userProfilePicture || null;
  }

  getApplicationUserInitial(app:  BidderApplicationResponse): string {
    const name = this.getApplicationUserName(app);
    return name.charAt(0).toUpperCase();
  }

  getStatusBadge(status:  string): { class: string; label: string } {
    switch (status) {
      case 'PENDING':
        return { class: 'bg-yellow-100 text-yellow-800', label: 'Pending' };
      case 'APPROVED':
        return { class: 'bg-green-100 text-green-800', label:  'Approved' };
      case 'REJECTED': 
        return { class:  'bg-red-100 text-red-800', label: 'Rejected' };
      default:
        return { class: 'bg-gray-100 text-gray-800', label: status };
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}