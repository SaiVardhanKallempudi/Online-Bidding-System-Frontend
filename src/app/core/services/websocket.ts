import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { Bid } from '../models/bid.model';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private client: Client | null = null;
  private bidSubject = new Subject<Bid>();
  private connected = false;
  private stallId: number | null = null;

  constructor() {}

  connect(stallId: number): void {
    if (this.connected && this.stallId === stallId) {
      return; // Already connected to this stall
    }

    this.stallId = stallId;
    this.disconnect(); // Disconnect from previous if any

    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing:  4000,
      debug: (str) => {
        console.log('STOMP:  ' + str);
      }
    });

    this.client.onConnect = () => {
      this.connected = true;
      
      // Subscribe to stall-specific bid updates
      this. client?. subscribe(`/topic/stall/${stallId}`, (message: IMessage) => {
        try {
          const bid = JSON.parse(message.body) as Bid;
          this.bidSubject.next(bid);
        } catch (error) {
          console.error('Error parsing bid message:', error);
        }
      });
    };

    this.client.onStompError = (frame) => {
    };

    this.client. onDisconnect = () => {
      this.connected = false;
    };

    this. client.activate();
  }

  disconnect(): void {
    if (this.client) {
      this.client. deactivate();
      this.client = null;
      this.connected = false;
      this.stallId = null;
    }
  }

  getBidUpdates(): Observable<Bid> {
    return this. bidSubject.asObservable();
  }

  isConnected(): boolean {
    return this. connected;
  }
}