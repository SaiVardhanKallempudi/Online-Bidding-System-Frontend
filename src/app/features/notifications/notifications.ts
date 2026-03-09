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
    
    console.log('📡 Loading notifications from API...');
    
    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        console.log('✅ Loaded', notifications.length, 'notifications');
        this.notifications = notifications;
        this.filterNotifications();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading notifications:', error);
        this.error = 'Failed to load notifications';
        this.isLoading = false;
        
        // Fallback to mock data for development
        console.log('⚠️ Using mock notifications');
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
          console.log('📨 New notification received:', notification);
          this.notifications.unshift(notification);
          this.filterNotifications();
        },
        error: (error) => {
          console.error('❌ Real-time notification error:', error);
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
      this.filteredNotifications = this.notifications.filter(n => !n.isRead);
    } else {
      // Filter by type
      this.filteredNotifications = this.notifications.filter(n => 
        n.type.toLowerCase().includes(this.activeFilter.toLowerCase())
      );
    }
  }

  markAsRead(notification: Notification): void {
    if (notification.isRead) return;
    
    console.log('✅ Marking notification as read:', notification.id);
    
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.isRead = true;
        this.filterNotifications();
      },
      error: (error) => {
        console.error('❌ Error marking notification as read:', error);
        // Still mark as read locally
        notification.isRead = true;
        this.filterNotifications();
      }
    });
  }

  markAllAsRead(): void {
    console.log('✅ Marking all notifications as read');
    
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.filterNotifications();
      },
      error: (error) => {
        console.error('❌ Error marking all as read:', error);
        // Still mark all as read locally
        this.notifications.forEach(n => n.isRead = true);
        this.filterNotifications();
      }
    });
  }

  clearAll(): void {
    if (!confirm('Are you sure you want to clear all notifications?')) {
      return;
    }
    
    console.log('🗑️ Clearing all notifications');
    
    this.notificationService.deleteAll().subscribe({
      next: () => {
        this.notifications = [];
        this.filterNotifications();
      },
      error: (error) => {
        console.error('❌ Error clearing notifications:', error);
        // Still clear locally
        this.notifications = [];
        this.filterNotifications();
      }
    });
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  getTypeClass(type: string): string {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('bid')) return 'bg-blue-100 text-blue-800';
    if (lowerType.includes('won') || lowerType.includes('winner')) return 'bg-green-100 text-green-800';
    if (lowerType.includes('application') || lowerType.includes('approved')) return 'bg-purple-100 text-purple-800';
    if (lowerType.includes('system')) return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  }

  getNotificationIcon(type: string): string {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('bid_placed')) return '💰';
    if (lowerType.includes('outbid')) return '⚠️';
    if (lowerType.includes('won') || lowerType.includes('winner')) return '🎉';
    if (lowerType.includes('application_approved')) return '✅';
    if (lowerType.includes('application_rejected')) return '❌';
    if (lowerType.includes('auction_started')) return '🏁';
    if (lowerType.includes('auction_ending')) return '⏰';
    if (lowerType.includes('auction_ended')) return '🏁';
    if (lowerType.includes('system')) return '📢';
    return '🔔';
  }

  getMockNotifications(): Notification[] {
    return [
      {
        id: 1,
        userId: 1,
        type: 'BID_PLACED',
        title: 'New Bid Placed',
        message: 'Someone placed a bid of ₹5000 on Tech Hub stall',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
      },
      {
        id: 2,
        userId: 1,
        type: 'AUCTION_WON',
        title: 'You won an auction!',
        message: 'Congratulations! You won the bid for Food Corner with ₹3500',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
      },
      {
        id: 3,
        userId: 1,
        type: 'APPLICATION_APPROVED',
        title: 'Bidder Application Approved',
        message: 'Your bidder application has been approved. You can now participate in auctions.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        id: 4,
        userId: 1,
        type: 'BID_OUTBID',
        title: 'You were outbid',
        message: 'Someone placed a higher bid on Electronics Store',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
      },
      {
        id: 5,
        userId: 1,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'New stalls available',
        message: '5 new stalls are now available for bidding',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()
      }
    ];
  }
}