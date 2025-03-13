import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient, private router: Router) {}

  register(username: string, email: string, password: string, country: string) {
    const body = { username, email, password, country };
    return this.http.post(`${environment.apiUrl}/api/register`, body);
  }

  login(username: string, email: string, password: string) {
    const body = { username, email, password };
    return this.http.post<{token: string}>(`${environment.apiUrl}/api/login`, body);
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  getToken() {
    return localStorage.getItem('token');
  }
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
