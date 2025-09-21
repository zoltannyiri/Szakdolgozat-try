import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../environments/environment';
import { catchError, map, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommentService {




  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  addComment(loopId: string, text: string) {
    return this.http.post(`${this.apiUrl}/api/loops/${loopId}/comments`, { text })
      .pipe(
        map((res: any) => res?.data),
        catchError(this.handleError)
      );
  }


  getCommentsForLoop(loopId: string) {
    return this.http.get<any>(`${this.apiUrl}/api/loops/${loopId}/comments`).pipe(
      catchError(error => {
        console.error('Hiba a kommentek lekérdezésekor:', error);
        return throwError(() => error);
      })
    );
  }

  //  reportComment(commentId: string, message: string) {
  //   return this.http.post(`${this.apiUrl}/api/reports/comments/${commentId}`, { message })
  //     .pipe(
  //       catchError((error: HttpErrorResponse) => {
  //         console.error('Hiba a jelentés küldésekor:', error);
  //         return throwError(() => error);
  //       })
  //     );
  // }
  reportComment(commentId: string, message: string) {
    return this.http.post(`${this.apiUrl}/api/reports/comments/${commentId}`, { message });
  }


  deleteCommentAdmin(commentId: string) {
    return this.http.delete(`${this.apiUrl}/api/admin/comments/${commentId}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Hiba történt:', error);
    return throwError(() => new Error('Hiba a komment küldésekor'));
  }


  getCommentsByUser(userId: string) {
    return this.http.get<{ items: any[] }>(`${this.apiUrl}/api/users/${userId}/comments`)
      .pipe(catchError(this.handleError));
  }
}


