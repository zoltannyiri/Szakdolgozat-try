import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();
  private tokenCheckInterval: any;

  constructor(private http: HttpClient, private router: Router) {
    this.initializeAuthState();
    this.setupTokenRefreshCheck();
  }

  private initializeAuthState(): void {
    const token = localStorage.getItem('token');
    if (token && this.isTokenValid(token)) {
      this.isLoggedInSubject.next(true);
    } else {
      this.clearAuthData();
    }
  }

  private setupTokenRefreshCheck(): void {
    this.tokenCheckInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && !this.isTokenValid(token)) {
        this.clearAuthData();
      }
    }, 60000); // Minden percben ellenőriz
  }

  private isTokenValid(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp ? (Date.now() < decoded.exp * 1000) : false;
    } catch {
      return false;
    }
  }

  isAuthenticated(): Observable<boolean> {
    return this.isLoggedIn$;
  }

  login(redirectUrl?: string): Observable<boolean> {
    if (this.isLoggedIn()) {
      this.router.navigate([redirectUrl || '/']);
      return of(true);
    }
    
    this.router.navigate(['/login'], { 
      queryParams: { redirectUrl: redirectUrl || '/' } 
    });
    return of(false);
  }

  register(username: string, email: string, password: string, country: string) {
    const body = { username, email, password, country };
    return this.http.post(`${environment.apiUrl}/api/register`, body).pipe(
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  loginWithCredentials(username: string, email: string, password: string) {
    const body = { username, email, password };
    return this.http.post<{ token: string }>(`${environment.apiUrl}/api/login`, body).pipe(
      tap(({ token }) => {
        this.handleSuccessfulLogin(token);
      }),
      catchError(error => {
        this.clearAuthData();
        return throwError(() => error);
      })
    );
  }

  private handleSuccessfulLogin(token: string): void {
    localStorage.setItem('token', token);
    this.isLoggedInSubject.next(true);
  }

  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  private clearAuthData(): void {
    localStorage.removeItem('token');
    this.isLoggedInSubject.next(false);
  }

  checkToken(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.clearAuthData();
      return;
    }

    if (!this.isTokenValid(token)) {
      this.clearAuthData();
      return;
    }

    this.http.get<{ isValid: boolean }>(`${environment.apiUrl}/api/validate-token`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      catchError(() => of({ isValid: false }))
    ).subscribe({
      next: (response) => {
        if (!response.isValid) {
          this.clearAuthData();
        } else {
          this.isLoggedInSubject.next(true);
        }
      },
      error: () => this.clearAuthData()
    });
  }

  getUserProfile() {
    const token = localStorage.getItem('token');
    if (!token) return throwError(() => new Error('No token available'));

    return this.http.get(`${environment.apiUrl}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      catchError(error => {
        console.error('Profile fetch error:', error);
        return throwError(() => error);
      })
    );
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return !!token && this.isTokenValid(token);
  }

  getToken(): string | null {
    const token = localStorage.getItem('token');
    return token && this.isTokenValid(token) ? token : null;
  }

  getUserId(): string | null {
    const token = this.getToken();
    if (!token) return null;
  
    try {
      const decoded: any = jwtDecode(token);
      return decoded.userId || null;
    } catch (error) {
      console.error('Invalid token:', error);
      return null;
    }
  }

  getUsernameFromToken(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded: any = jwtDecode(token);
      return decoded.username || null;
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  }

  ngOnDestroy(): void {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
    }
  }
}