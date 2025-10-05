import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  addFavorite(loopId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/loops/${loopId}/favorite`, {});
  }

  removeFavorite(loopId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/loops/${loopId}/favorite`);
  }

  getUserFavorites(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/favorites`);
  }

  checkFavoriteStatus(loopId: string): Observable<{ isFavorite: boolean }> {
    return this.http.get<{ isFavorite: boolean }>(
      `${this.apiUrl}/api/loops/${loopId}/favorite-status`
    );
  }

  toggleFavorite(loopId: string, isFavorite: boolean): Observable<any> {
    return isFavorite 
      ? this.removeFavorite(loopId)
      : this.addFavorite(loopId);
  }



  // új: teljesítmény miatt
  getFavoriteIds() {
  return this.http.get<{ success: boolean; ids: string[] }>(
    `${this.apiUrl}/api/favorites/ids`
  );
}
}