export interface Notification {
  id: number;
  userId: number;
  type: string;           // matches NotificationType enum name e.g. 'BID_PLACED'
  title: string;
  message: string;
  relatedEntityId?: number;
  relatedEntityType?: string;
  read: boolean;          // ✅ Jackson strips 'is' prefix from isRead() → 'read'
  createdAt: string;      
}

export type NotificationType = 
  | 'BID_PLACED'
  | 'BID_OUTBID'
  | 'AUCTION_STARTED'
  | 'AUCTION_ENDING'
  | 'AUCTION_ENDED'
  | 'AUCTION_WON'
  | 'AUCTION_LOST'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'SYSTEM_ANNOUNCEMENT';

export interface CreateNotificationRequest {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: number;
  relatedEntityType?: string;
}



export interface NotificationPreferences {
  emailNotifications: boolean;
  bidNotifications: boolean;
  auctionNotifications: boolean;
  systemNotifications: boolean;
}
