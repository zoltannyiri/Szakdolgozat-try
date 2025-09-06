import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';

interface Notification {
    id: string;
    userId: string;
    type: string;
    message: string;
    relatedItemId: string;
    read: boolean;
    createdAt: Date;
    user?: {
      username: string;
      profileImage?: string;
    };
  }

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:3000/api/notifications';

  

    constructor(
        private http: HttpClient,
        private authService: AuthService) {}

        

        getNotifications(): Observable<{success: boolean, data: Notification[]}> {
            return this.http.get<{success: boolean, data: Notification[]}>(this.apiUrl);
          }

  markAsRead(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all`, {});
  }
}