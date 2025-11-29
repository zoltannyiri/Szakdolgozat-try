import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent implements OnInit {
  stats = {
    activeUsers: 0
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadSidebarStats();
  }

  loadSidebarStats() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any>(`${environment.apiUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.stats.activeUsers = res.data.activeUsers ?? 0;
        }
      },
      error: (err) => {
        console.error('Sidebar stats hiba:', err);
      }
    });
  }
}
