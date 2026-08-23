import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/components/navbar/navbar';
import { Footer } from './shared/components/footer/footer';
import { NotificationService } from './core/services/notification.service';
import { AuthService } from './core/services/auth';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer],
  template: `
    @if (environment.maintenanceMode) {
      <div class="min-h-screen flex items-center justify-center bg-gray-100 px-6">
        <div class="text-center max-w-lg">
          <div class="text-6xl mb-6">🔧</div>

          <h1 class="text-4xl font-bold text-gray-800 mb-4">
            BidMart is under maintenance
          </h1>

          <p class="text-lg text-gray-600 mb-6">
            We're currently working on improvements and fixing some issues.
            Please check back shortly.
          </p>

          <p class="text-sm text-gray-500">
            Thank you for your patience.
          </p>
        </div>
      </div>
    } @else {
      <div class="min-h-screen flex flex-col">
        <app-navbar></app-navbar>

        <main class="flex-1">
          <router-outlet></router-outlet>
        </main>

        <app-footer></app-footer>
      </div>
    }
  `,
  styles: []
})
export class App implements OnInit {

  protected readonly environment = environment;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.notificationService.startPolling();
    }
  }
}
