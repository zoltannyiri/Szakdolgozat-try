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


  toggleBan(userId: string, banned: boolean) {
    const endpoint = banned ? 'unban' : 'ban';
    this.http.put(`${environment.apiUrl}/api/admin/users/${userId}/${endpoint}`, {}).subscribe({
      next: () => this.loadUsers(),
      error: (err) => console.error('Nem sikerült módosítani a tiltást:', err)
    });
  }
}
