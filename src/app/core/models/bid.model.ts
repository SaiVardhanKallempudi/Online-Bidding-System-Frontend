export interface Bid {
  bidId: number;
  stallId: number;
  stallName?:  string;
  stallNo?: number;
  bidderId:  number;
  bidderName:  string;
  biddedPrice: number;
  bidTime: string;
  status?:  'ACTIVE' | 'WON' | 'LOST' | 'OUTBID';
  rank?:  number;
  isHighestBid?: boolean;
  location?: string;
  stallImage?: string;
}

export interface BidRequest {
  stallId: number;
  bidderId: number;
  biddedPrice: number;
}

export interface BidResponse {
  success: boolean;
  message:  string;
  bid?: Bid;
}

// Keep BidHistoryItem as alias for backward compatibility
export interface BidHistoryItem {
  bidId?:  number;
  rank?: number;
  bidderId?: number;
  bidderName:  string;
  amount: number;
  biddedPrice?:  number;
  time?: string;
  bidTime?: string;
}