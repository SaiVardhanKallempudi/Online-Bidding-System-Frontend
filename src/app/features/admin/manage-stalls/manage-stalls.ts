import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StallService } from '../../../core/services/stall';
import { Stall } from '../../../core/models/stall.model';
import { CountdownTimer } from "../../../shared/components/countdown-timer/countdown-timer";

@Component({
  selector: 'app-manage-stalls',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CountdownTimer],
  templateUrl: './manage-stalls.html',
  styleUrls: ['./manage-stalls.scss']
})
export class ManageStalls implements OnInit {
  stalls:  Stall[] = [];
  filteredStalls:  Stall[] = [];
  isLoading = true;
  searchQuery = '';
  activeTab = 'ALL';
  
  // Delete Modal
  showDeleteModal = false;
  stallToDelete: Stall | null = null;
  isDeleting = false;

  tabs = [
    { id: 'ALL', label: 'All', icon: '📋' },
    { id: 'ACTIVE', label: 'Active', icon: '🔴' },
    { id: 'AVAILABLE', label: 'Available', icon: '🟢' },
    { id:  'CLOSED', label: 'Closed', icon:  '⚫' }
  ];

  stats = {
    total: 0,
    active: 0,
    available:  0,
    closed: 0
  };

  constructor(private stallService: StallService) {}

  ngOnInit(): void {
    this.loadStalls();
  }

  loadStalls(): void {
    this.isLoading = true;

    this.stallService.getAllStalls().subscribe({
      next: (stalls:  Stall[]) => {
        this.stalls = stalls;
        this.calculateStats();
        this.filterStalls();
        this.isLoading = false;
      },
      error:  (error:  any) => {
        console.error('Error loading stalls:', error);
        this.stalls = [];
        this.isLoading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats. total = this.stalls.length;
    this.stats. active = this.stalls.filter(s => s.status === 'ACTIVE').length;
    this.stats.available = this.stalls. filter(s => s.status === 'AVAILABLE').length;
    this.stats.closed = this. stalls.filter(s => s.status === 'CLOSED').length;
  }

  setActiveTab(tabId: string): void {
    this. activeTab = tabId;
    this.filterStalls();
  }

  filterStalls(): void {
    let filtered = this.stalls;

    if (this.activeTab !== 'ALL') {
      filtered = filtered.filter(s => s.status === this.activeTab);
    }

    if (this.searchQuery. trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered. filter(s =>
        s.stallName?. toLowerCase().includes(query) ||
        s.category?.toLowerCase().includes(query) ||
        s.location?.toLowerCase().includes(query)
      );
    }

    this.filteredStalls = filtered;
  }

  onSearchChange(): void {
    this.filterStalls();
  }

  startAuction(stall: Stall, event: Event): void {
    event.stopPropagation();
    this.stallService.startAuction(stall. stallId).subscribe({
      next: () => {
        this.loadStalls();
      },
      error: (error:  any) => {
        alert('Failed to start auction:  ' + (error.error?. message || 'Unknown error'));
      }
    });
  }

  endAuction(stall: Stall, event: Event): void {
    event. stopPropagation();
    this.stallService.endAuction(stall.stallId).subscribe({
      next:  () => {
        console.log('Auction ended successfully');
        this.loadStalls();
      },
      error: (error: any) => {
        alert('Failed to end auction: ' + (error.error?.message || 'Unknown error'));
      }
    });
  }

  openDeleteModal(stall: Stall, event: Event): void {
    event. stopPropagation();
    this.stallToDelete = stall;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this. showDeleteModal = false;
    this. stallToDelete = null;
  }

  confirmDelete(): void {
    if (! this.stallToDelete) return;

    this.isDeleting = true;

    this.stallService.deleteStall(this.stallToDelete.stallId).subscribe({
      next:  () => {
        console.log('Stall deleted successfully');
        this.isDeleting = false;
        this.closeDeleteModal();
        this.loadStalls();
      },
      error: (error: any) => {
        this.isDeleting = false;
        alert('Failed to delete stall: ' + (error.error?.message || 'Unknown error'));
      }
    });
  }

  getStatusBadge(status:  string): { class: string; label:  string; icon: string } {
    switch (status) {
      case 'ACTIVE':
        return { class: 'bg-red-100 text-red-800', label: 'Live', icon: '🔴' };
      case 'AVAILABLE':
        return { class: 'bg-green-100 text-green-800', label: 'Available', icon:  '🟢' };
      case 'CLOSED': 
        return { class:  'bg-gray-100 text-gray-800', label: 'Closed', icon: '⚫' };
      default:
        return { class: 'bg-gray-100 text-gray-800', label:  status || 'Unknown', icon: '❓' };
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute:  '2-digit'
    });
  }
}