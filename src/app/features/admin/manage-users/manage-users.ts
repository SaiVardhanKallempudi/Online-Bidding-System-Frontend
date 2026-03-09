import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manage-users.html',
  styleUrls: ['./manage-users.scss']
})
export class ManageUsers implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  isLoading = true;
  searchQuery = '';
  activeTab = 'ALL';

  tabs = [
    { id: 'ALL', label: 'All', icon: '📋' },
    { id: 'USER', label: 'Users', icon: '👤' },
    { id: 'BIDDER', label: 'Bidders', icon: '🎯' },
    { id: 'ADMIN', label:  'Admins', icon:  '👑' }
  ];

  stats = {
    total: 0,
    users: 0,
    bidders: 0,
    admins: 0
  };

  constructor(private userService:  UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;

    this.userService.getAllUsers().subscribe({
      next:  (users:  User[]) => {
        this.users = users;
        this.calculateStats();
        this.filterUsers();
        this.isLoading = false;
      },
      error:  (error:  any) => {
        this.users = [];
        this.isLoading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats. total = this.users.length;
    this.stats.users = this.users. filter(u => u.role === 'USER').length;
    this.stats.bidders = this.users.filter(u => u.role === 'BIDDER').length;
    this.stats.admins = this.users. filter(u => u.role === 'ADMIN').length;
  }

  setActiveTab(tabId: string): void {
    this. activeTab = tabId;
    this.filterUsers();
  }

  filterUsers(): void {
    let filtered = this.users;

    if (this. activeTab !== 'ALL') {
      filtered = filtered.filter(u => u.role === this.activeTab);
    }

    if (this.searchQuery. trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered. filter(u =>
        u.studentName?.toLowerCase().includes(query) ||
        u.studentEmail?.toLowerCase().includes(query) ||
        u.collageId?.toLowerCase().includes(query)
      );
    }

    this. filteredUsers = filtered;
  }

  onSearchChange(): void {
    this.filterUsers();
  }

  changeRole(user: User, newRole: string): void {
    this. userService.updateUserRole(user.studentId, newRole).subscribe({
      next: () => this.loadUsers(),
      error: (error:  any) => console.error('Error updating role:', error)
    });
  }

  toggleStatus(user: User): void {
    // Option 1: If backend has toggle endpoint
    this.userService.toggleUserStatus(user. studentId).subscribe({
      next: () => this.loadUsers(),
      error: (error: any) => {
        // Fallback:  Try activate/deactivate
        this.toggleStatusFallback(user);
      }
    });
  }

  // Fallback method if toggle endpoint doesn't exist
  private toggleStatusFallback(user: User): void {
    const isCurrentlyActive = user.isActive ??  true;
    
    if (isCurrentlyActive) {
      this. userService.deactivateUser(user.studentId).subscribe({
        next:  () => this.loadUsers(),
        error: (error: any) => console.error('Error deactivating user:', error)
      });
    } else {
      this.userService.activateUser(user. studentId).subscribe({
        next: () => this.loadUsers(),
        error: (error: any) => console.error('Error activating user:', error)
      });
    }
  }

  getUserInitial(user: User): string {
    return user.studentName?. charAt(0)?.toUpperCase() || 'U';
  }

  getRoleBadge(role:  string): { class: string; label: string } {
    switch (role) {
      case 'ADMIN':
        return { class: 'bg-purple-100 text-purple-800', label: 'Admin' };
      case 'BIDDER':
        return { class: 'bg-green-100 text-green-800', label: 'Bidder' };
      default:
        return { class: 'bg-blue-100 text-blue-800', label: 'User' };
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month:  'short',
      year: 'numeric'
    });
  }
}