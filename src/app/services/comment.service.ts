import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCommentsForLoop(loopId: string) {
    return this.http.get(`${this.apiUrl}/comments/loop/${loopId}`);
  }

  addComment(loopId: string, text: string) {
    return this.http.post(`${this.apiUrl}/comments`, { loopId, text });
  }
}