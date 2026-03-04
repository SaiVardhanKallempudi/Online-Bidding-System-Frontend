import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Bid, BidRequest, BidResponse, BidHistoryItem } from '../models/bid.model';

@Injectable({
  providedIn: 'root'
})
export class BidService {
  private apiUrl = `${environment.apiUrl}/bids`;

  constructor(private http: HttpClient) {}

  /**
   * Place a bid
   */
  placeBid(request: BidRequest): Observable<BidResponse> {
    return this.http.post<BidResponse>(`${this.apiUrl}/place`, request).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Get bid history for a stall - returns Bid[] for consistency
   */
  getBidHistory(stallId: number): Observable<Bid[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stall/${stallId}/history`).pipe(
      map((items: any[]) => this.mapToBids(items)),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Get bid history as BidHistoryItem
   */
  getBidHistoryItems(stallId: number): Observable<BidHistoryItem[]> {
    return this.http.get<BidHistoryItem[]>(`${this.apiUrl}/stall/${stallId}/history`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Get all bids for a stall
   */
  getStallBids(stallId: number): Observable<Bid[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stall/${stallId}`).pipe(
      map((items: any[]) => this.mapToBids(items)),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Get my bids (authenticated via JWT)
   */
  getMyBids(): Observable<Bid[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-bids`).pipe(
      map((items: any[]) => this.mapToBids(items)),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Get highest bid for a stall
   */
  getHighestBid(stallId: number): Observable<BidResponse> {
    return this.http.get<BidResponse>(`${this.apiUrl}/stall/${stallId}/highest`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Get bidders for a stall
   */
  getBiddersForStall(stallId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stall/${stallId}/bidders`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Declare winner for a stall (Admin only)
   */
  declareWinner(stallId: number): Observable<BidResponse> {
    return this.http.post<BidResponse>(`${this.apiUrl}/stall/${stallId}/declare-winner`, {}).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Get viewer count for a stall
   */
  getViewerCount(stallId: number): Observable<{ viewerCount: number }> {
    return this.http.get<{ viewerCount: number }>(`${this.apiUrl}/stall/${stallId}/viewers`).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Helper method to map API response to Bid model
   */
  private mapToBids(items: any[]): Bid[] {
    if (!items || !Array.isArray(items)) {
      return [];
    }

    return items
      .filter(item => !!item)
      .map(item => {
        const bid: Bid = {
          bidId: item.bidId || item.id,
          stallId: item.stallId,
          bidderId: item.bidderId || item.bidder?.studentId,
          bidderName: item.bidderName || item.studentName || item.bidder?.studentName || 'Anonymous',
          biddedPrice: item.biddedPrice || item.amount || 0,
          bidTime: item.bidTime || item.timestamp || item.createdAt || new Date().toISOString(),
          stallName: item.stallName || item.stall?.stallName,
          location: item.stallLocation || item.location || item.stall?.location,
          stallImage: item.stallImage || item.stall?.image,
          status: item.status?.toUpperCase() || 'ACTIVE',
          isHighestBid: item.isHighestBid || false
        };
        return bid;
      })
      .filter(bid => bid.bidId && bid.stallId);
  }
}