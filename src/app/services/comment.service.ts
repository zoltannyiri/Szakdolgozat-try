import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../environments/environment';
import { catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommentService {



  
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  addComment(loopId: string, text: string) {
    return this.http.post(`${this.apiUrl}/api/loops/${loopId}/comments`, { text })
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Hiba történt:', error);
    return throwError(() => new Error('Hiba a komment küldésekor'));
  }

  getCommentsForLoop(loopId: string) {
    return this.http.get<any>(`${this.apiUrl}/api/loops/${loopId}/comments`).pipe(
      catchError(error => {
        console.error('Hiba a kommentek lekérdezésekor:', error);
        return throwError(() => error);
      })
    );
  }
}