import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-users',
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss'
})
export class AdminUsersComponent implements OnInit{
  users: any[] = [];
  errorMessage = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  // loadUsers() {
  //   this.http.get(`${environment.apiUrl}/api/admin/users`).subscribe({
  //     next: (res: any) => {
  //       this.users = res.users || [];
  //     },
  //     error: (err) => {
  //       console.error('Nem sikerült lekérni a felhasználókat:', err);
  //       this.errorMessage = 'Nem sikerült betölteni a felhasználókat.';
  //     }
  //   });
  // }
loadUsers() {
  const token = localStorage.getItem('token');

  this.http.get(`${environment.apiUrl}/api/admin`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).subscribe({
    next: (res: any) => {
      this.users = res.users || [];
    },
    error: (err) => {
      console.error('Error loading users:', err);
      this.errorMessage = 'Nem sikerült betölteni a felhasználókat.';
    }
  });
}

isBanned(user: any): boolean {
    if (!user?.bannedUntil) return false;
    const until = new Date(user.bannedUntil).getTime();
    return until > Date.now() && !this.isPermanent(user);
  }

  isPermanent(user: any): boolean {
    if (!user?.bannedUntil) return false;
    const y = new Date(user.bannedUntil).getUTCFullYear();
    return y >= 9999;
  }


  banLabel(user: any): string {
    if (this.isPermanent(user)) return 'permanent';
    return this.isBanned(user) ? 'Igen' : 'Nem';
  }


  isAnyBanActive(user: any): boolean {
    return this.isPermanent(user) || this.isBanned(user);
  }


  toggleBan(user: any) {
    const token = localStorage.getItem('token');
    const base = `${environment.apiUrl}/api/admin/users/${user._id}`;

    // ha tiltva → UNBAN
    if (this.isAnyBanActive(user)) {
      this.http.post(`${base}/unban`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => this.loadUsers(),
        error: (err) => console.error('Unban hiba:', err)
      });
      return;
    }

    // ha nincs tiltva → BAN
    // default: 1 hónap
    const body = { duration: '1m', reason: '' as string }; // '1d' | '1m' | 'permanent'
    this.http.post(`${base}/ban`, body, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => this.loadUsers(),
      error: (err) => console.error('Ban hiba:', err)
    });
  }
}
