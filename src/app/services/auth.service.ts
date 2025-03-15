import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { BehaviorSubject, catchError, map, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();


  constructor(private http: HttpClient, private router: Router) {
    this.checkToken();
  }

  register(username: string, email: string, password: string, country: string) {
    const body = { username, email, password, country };
    return this.http.post(`${environment.apiUrl}/api/register`, body);
  }

  login(username: string, email: string, password: string) {
    const body = { username, email, password };
    return this.http.post<{token: string}>(`${environment.apiUrl}/api/login`, body).pipe(
      tap(({ token }) => {
        localStorage.setItem('token', token);
        this.isLoggedInSubject.next(true);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.isLoggedInSubject.next(false);
    this.router.navigate(['/login']);
  }

  public checkToken() {
    const token = localStorage.getItem('token');
    if (token) {
      // Token validálása a backenden
      this.validateToken(token).subscribe(
        (isValid) => {
          this.isLoggedInSubject.next(isValid);
        },
        () => {
          this.isLoggedInSubject.next(false);
          localStorage.removeItem('token');
        }
      );
    } else {
      this.isLoggedInSubject.next(false);
    }
  }
  private validateToken(token: string) {
    return this.http.get(`${environment.apiUrl}/api/validate-token`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      map((response: any) => response.isValid),
      catchError(() => of(false))
    );
  }

  getUserProfile() {
    const token = localStorage.getItem('token');
    return this.http.get(`${environment.apiUrl}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  getToken() {
    return localStorage.getItem('token');
  }

  getUsernameFromToken(): string | null {
    const token = this.getToken();
    if (token) {
      const decoded: any = jwt_decode(token);
      return decoded.username || null;
    }
    return null;
  }
}


function jwt_decode(token: string): any {
  throw new Error('Function not implemented.');
}
//commented at 03.11 19:00
// // auth.service.ts
// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthService {
//   private apiUrl = 'http://localhost:8000/api/login';

//   constructor(private http: HttpClient) {}

//   login(username: string, password: string): Observable<{ token: string }> {
//     return this.http.post<{ token: string }>(this.apiUrl, { username, password });
//   }
// }
