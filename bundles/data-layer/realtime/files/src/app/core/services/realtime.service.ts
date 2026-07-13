import { Injectable, OnDestroy, signal } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { Observable } from 'rxjs';
import { realtimeUrl } from '../config/realtime.config';

/**
 * Shared real-time connection. Feature services should inject this rather
 * than creating their own socket connection — one socket connection for the
 * whole app, not one per feature. See .claude/rules/data-layer.md.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private socket: Socket | null = null;

  readonly connected = signal(false);

  connect(): void {
    if (this.socket) {
      return;
    }
    this.socket = io(realtimeUrl, { transports: ['websocket'] });
    this.socket.on('connect', () => this.connected.set(true));
    this.socket.on('disconnect', () => this.connected.set(false));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
  }

  /** Subscribe to a named server-emitted event. */
  on<T>(eventName: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      if (!this.socket) {
        subscriber.error(new Error('RealtimeService: connect() must be called first.'));
        return;
      }
      const handler = (payload: T) => subscriber.next(payload);
      this.socket.on(eventName, handler);
      return () => this.socket?.off(eventName, handler);
    });
  }

  /** Emit an event to the server. */
  emit(eventName: string, payload?: unknown): void {
    this.socket?.emit(eventName, payload);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
