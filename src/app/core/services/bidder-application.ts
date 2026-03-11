import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BidderApplicationRequest,
  BidderApplicationResponse,
  ApplicationStatusResponse
} from '../models/bidder-application.model';

@Injectable({
  providedIn: 'root'
})
export class BidderApplicationService {
  private apiUrl = `${environment.apiUrl}/bidder-applications`;

  constructor(private http: HttpClient) {}

  // User:  Apply as bidder
  applyAsBidder(request: BidderApplicationRequest): Observable<BidderApplicationResponse> {
    return this.http.post<BidderApplicationResponse>(`${this.apiUrl}/apply`, request);
  }

  // User: Check if already applied
  hasAlreadyApplied(email: string): Observable<ApplicationStatusResponse> {
    return this.http.get<ApplicationStatusResponse>(
      `${this.apiUrl}/has-applied/${encodeURIComponent(email)}`
    );
  }

  // User: Get application status by email
  getStatusByEmail(email:  string): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(
      `${this.apiUrl}/status-by-email/${encodeURIComponent(email)}`
    );
  }

  // User: Get my application
  getMyApplication(): Observable<BidderApplicationResponse> {
    return this.http.get<BidderApplicationResponse>(`${this.apiUrl}/my-application`);
  }

  // Admin: Get applications by status
  getApplicationsByStatus(status: string): Observable<BidderApplicationResponse[]> {
    return this.http.get<BidderApplicationResponse[]>(`${this.apiUrl}/status/${status}`);
  }

  //  Admin: Get pending applications
  getPendingApplications(): Observable<BidderApplicationResponse[]> {
    return this.http.get<BidderApplicationResponse[]>(`${this.apiUrl}/status/PENDING`);
  }

  // Admin: Get all applications
  getAllApplications(): Observable<BidderApplicationResponse[]> {
    return this.http.get<BidderApplicationResponse[]>(`${this.apiUrl}/all`);
  }

  // Admin:  Approve application (returns text)
  approveApplication(applicationId: number): Observable<string> {
    return this.http.put(
      `${this.apiUrl}/${applicationId}/approve`,
      {},
      { responseType: 'text' }
    );
  }

  // Admin: Reject application (returns text)
  rejectApplication(applicationId: number): Observable<string> {
    return this.http.put(
      `${this.apiUrl}/${applicationId}/reject`,
      {},
      { responseType: 'text' }
    );
  }

  // Admin:  Reject with reason (returns text)
  rejectWithReason(applicationId: number, reason:  string): Observable<string> {
    return this.http.put(
      `${this.apiUrl}/${applicationId}/reject-with-reason`,
      { reason },
      { responseType:  'text' }
    );
  }
}