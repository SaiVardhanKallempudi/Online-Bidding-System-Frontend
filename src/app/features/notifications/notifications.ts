import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss']
})
export class Notifications implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  activeFilter = 'all';
  isLoading = false;
  error = '';
  private notificationSubscription?: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.subscribeToRealTimeUpdates();
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.error = '';
    
    
    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.filterNotifications();
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load notifications';
        this.isLoading = false;
        
        // Fallback to mock data for development
        this.notifications = this.getMockNotifications();
        this.filterNotifications();
      }
    });
  }

  subscribeToRealTimeUpdates(): void {
    this.notificationSubscription = this.notificationService
      .getNotificationUpdates()
      .subscribe({
        next: (notification) => {
          this.notifications.unshift(notification);
          this.filterNotifications();
        },
        error: (error) => {
          console.error('❌notification error:', error);
        }
      });
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.filterNotifications();
  }

  filterNotifications(): void {
    if (this.activeFilter === 'all') {
      this.filteredNotifications = this.notifications;
    } else if (this.activeFilter === 'unread') {
      // ✅ Fixed: use n.read (not n.isRead)
      this.filteredNotifications = this.notifications.filter(n => !n.read);
    } else {
      this.filteredNotifications = this.notifications.filter(n =>
        n.type.toLowerCase().includes(this.activeFilter.toLowerCase())
      );
    }
  }

  markAsRead(notification: Notification): void {
    if (notification.isRead) return;
    
    
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.read = true;  // ✅ Fixed
        this.filterNotifications();
      },
      error: () => {
        notification.read = true;  // ✅ Still mark locally on error
        this.filterNotifications();
      }
    });
  }

  markAllAsRead(): void {
    
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.read = true);  // ✅ Fixed
        this.filterNotifications();
      },
      error: () => {
        this.notifications.forEach(n => n.read = true);  // ✅ Fixed
        this.filterNotifications();
      }
    });
  }

  clearAll(): void {
    if (!confirm('Are you sure you want to clear all notifications?')) {
      return;
    }
    
    
    this.notificationService.deleteAll().subscribe({
      next: () => {
        this.notifications = [];
        this.filterNotifications();
      },
      error: () => {
        this.notifications = [];
        this.filterNotifications();
      }
    });
  }

  // ✅ Fixed: use createdAt instead of timestamp
  formatTimestamp(createdAt: string): string {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ✅ Fixed: use n.read (not n.isRead)
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getTypeClass(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('bid_placed'))             return 'bg-blue-100 text-blue-800';
    if (t.includes('outbid'))                 return 'bg-yellow-100 text-yellow-800';
    if (t.includes('won') || t.includes('winner')) return 'bg-green-100 text-green-800';
    if (t.includes('application'))            return 'bg-purple-100 text-purple-800';
    if (t.includes('auction'))                return 'bg-orange-100 text-orange-800';
    if (t.includes('system'))                 return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  }

  getNotificationIcon(type: string): string {
    const t = type.toLowerCase();
    if (t === 'bid_placed')             return '💰';
    if (t === 'bid_outbid')             return '⚠️';
    if (t === 'auction_won')            return '🎉';
    if (t === 'auction_lost')           return '😔';
    if (t === 'application_approved')   return '✅';
    if (t === 'application_rejected')   return '❌';
    if (t === 'auction_started')        return '🏁';
    if (t === 'auction_ending')         return '⏰';
    if (t === 'auction_ended')          return '🔔';
    if (t === 'system_announcement')    return '📢';
    return '🔔';
  }

  // ✅ Fixed: mock data uses 'read' not 'isRead', and 'createdAt' not 'timestamp'
  getMockNotifications(): Notification[] {
    return [
      {
        id: 1,
        userId: 1,
        type: 'BID_PLACED',
        title: 'New Bid Placed',
        message: 'Someone placed a bid of ₹5000 on Tech Hub stall',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
      },
      {
        id: 2,
        userId: 1,
        type: 'AUCTION_WON',
        title: 'You won an auction! 🎉',
        message: 'Congratulations! You won the bid for Food Corner with ₹3500',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
      },
      {
        id: 3,
        userId: 1,
        type: 'APPLICATION_APPROVED',
        title: 'Bidder Application Approved',
        message: 'Your bidder application has been approved. You can now participate in auctions.',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        id: 4,
        userId: 1,
        type: 'BID_OUTBID',
        title: 'You were outbid',
        message: 'Someone placed a higher bid on Electronics Store',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
      },
      {
        id: 5,
        userId: 1,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'New stalls available',
        message: '5 new stalls are now available for bidding',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()
      }
    ];
  }
}