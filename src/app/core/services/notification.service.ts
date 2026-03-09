import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Notification, NotificationPreferences } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  private notificationSubject = new Subject<Notification>();
  private seenIds = new Set<number>();
  private pollSubscription?: Subscription;

  constructor(private http: HttpClient) {}

  // ─────────────────────────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────────────────────────

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  getUnreadNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/unread`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread/count`);
  }

  // ─────────────────────────────────────────────────────────────
  // MARK READ / DELETE
  // ─────────────────────────────────────────────────────────────

  markAsRead(notificationId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${notificationId}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {});
  }

  deleteNotification(notificationId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`);
  }

  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/all`);
  }

  // ─────────────────────────────────────────────────────────────
  // PREFERENCES
  // ─────────────────────────────────────────────────────────────

  getPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.apiUrl}/preferences`);
  }

  updatePreferences(pref: NotificationPreferences): Observable<NotificationPreferences> {
    return this.http.put<NotificationPreferences>(`${this.apiUrl}/preferences`, pref);
  }

  // ─────────────────────────────────────────────────────────────
  // REAL-TIME STREAM
  // ─────────────────────────────────────────────────────────────

  /** Subscribe to this in notifications.ts to receive live updates */
  getNotificationUpdates(): Observable<Notification> {
    return this.notificationSubject.asObservable();
  }

  /** Manually push one notification into the stream (e.g. after bid) */
  emitNotification(notification: Notification): void {
    this.notificationSubject.next(notification);
  }

  // ─────────────────────────────────────────────────────────────
  // POLLING
  // ─────────────────────────────────────────────────────────────

  /**
   * ✅ Start polling /api/notifications/unread every 30 seconds.
   *
   * IMPORTANT — pass `isNewSession = true` when calling this right
   * after login or OTP verification (fresh signup). This tells the
   * poller NOT to suppress the first batch of notifications, so the
   * welcome notification (created during verifyOtp) is emitted
   * immediately into the stream and shown in the navbar/page.
   *
   * Pass nothing (default false) when called from app.component.ts
   * on page refresh — those notifications were already seen.
   *
   * Usage:
   *   // app.component.ts (page refresh):
   *   this.notificationService.startPolling();
   *
   *   // verify-otp.ts (fresh signup / login):
   *   this.notificationService.startPolling(true);
   *
   *   // auth.service.ts login success:
   *   this.notificationService.startPolling(true);
   */
  startPolling(isNewSession: boolean = false): void {
    if (this.pollSubscription) return;   // already polling — prevent duplicates

    let firstRun = true;

    this.pollSubscription = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.getUnreadNotifications())
      )
      .subscribe({
        next: (notifications) => {
          if (firstRun) {
            firstRun = false;

            if (isNewSession) {
              // ✅ NEW LOGIN / SIGNUP: emit ALL unread notifications immediately
              // so the welcome notification (and any others) appear right away.
              for (const n of notifications) {
                this.seenIds.add(n.id);
                this.notificationSubject.next(n);
              }
            } else {
              // PAGE REFRESH: seed seen IDs silently — don't re-emit old ones
              notifications.forEach(n => this.seenIds.add(n.id));
            }

          } else {
            // Subsequent polls — only emit truly new notifications
            for (const n of notifications) {
              if (!this.seenIds.has(n.id)) {
                this.seenIds.add(n.id);
                this.notificationSubject.next(n);
              }
            }
          }
        },
        error: (e) => console.error('❌ Notification poll error:', e)
      });
  }

  /**
   * Stop polling and reset state.
   * Call this on logout so a re-login starts fresh.
   */
  stopPolling(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = undefined;
    }
    this.seenIds.clear();
  }
}