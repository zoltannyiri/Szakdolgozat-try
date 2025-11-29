import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';


type ToastVariant = 'default' | 'success' | 'error';

@Component({
  selector: 'app-admin-users',
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss'
})
export class AdminUsersComponent implements OnInit {
  apiUrl = environment.apiUrl;
  users: any[] = [];
  errorMessage = '';

  filteredUsers: any[] = [];
  loading = false;
  searchTerm = '';
  currentFilter = 'all';
  currentSort = 'recent';

  toast = { text: '', variant: 'default' as ToastVariant, timer: 0 as number };

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    const token = localStorage.getItem('token');

    this.http.get(`${environment.apiUrl}/api/admin`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res: any) => {
        this.users = res.users || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.errorMessage = 'Nem sikerült betölteni a felhasználókat.';
        this.showToast('Hiba a felhasználók betöltésekor', 'error');
        this.loading = false;
      }
    });
  }

  onSearch(event: any) {
    this.searchTerm = event.target.value.toLowerCase();
    this.applyFilters();
  }

  onFilterChange(event: any) {
    this.currentFilter = event.target.value;
    this.applyFilters();
  }

  onSortChange(event: any) {
    this.currentSort = event.target.value;
    this.applyFilters();
  }

  applyFilters() {
    let result = [...this.users];

    if (this.searchTerm) {
      result = result.filter(user =>
        user.username.toLowerCase().includes(this.searchTerm) ||
        user.email.toLowerCase().includes(this.searchTerm) ||
        (user.firstName && user.firstName.toLowerCase().includes(this.searchTerm)) ||
        (user.lastName && user.lastName.toLowerCase().includes(this.searchTerm))
      );
    }

    switch (this.currentFilter) {
      case 'active':
        result = result.filter(user => !this.isAnyBanActive(user));
        break;
      case 'banned':
        result = result.filter(user => this.isBanned(user) && !this.isPermanent(user));
        break;
      case 'permanent':
        result = result.filter(user => this.isPermanent(user));
        break;
    }

    switch (this.currentSort) {
      case 'recent':
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'name':
        result.sort((a, b) => a.username.localeCompare(b.username));
        break;
    }

    this.filteredUsers = result;
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

  bannedUsersCount(): number {
    return this.users.filter(user => this.isAnyBanActive(user)).length;
  }


  toggleBan(user: any) {
    const token = localStorage.getItem('token');
    const base = `${environment.apiUrl}/api/admin/users/${user._id}`;

    if (this.isAnyBanActive(user)) {
      this.http.post(`${base}/unban`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.loadUsers();
          this.showToast(`${user.username} tiltása feloldva`, 'success');
        },
        error: (err) => {
          console.error('Unban hiba:', err);
          this.showToast('Hiba a felhasználó tiltásának feloldásakor', 'error');
        }
      });
    } else {
      const body = { duration: '1m', reason: '' };
      this.http.post(`${base}/ban`, body, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.loadUsers();
          this.showToast(`${user.username} tiltva (1 hónap)`, 'success');
        },
        error: (err) => {
          console.error('Ban hiba:', err);
          this.showToast('Hiba a tiltás alkalmazásakor', 'error');
        }
      });
    }
  }

  quickBan(user: any, duration: '1d' | '1m' | 'permanent') {
    const token = localStorage.getItem('token');
    const base = `${environment.apiUrl}/api/admin/users/${user._id}`;

    const durationLabels = {
      '1d': '1 nap',
      '1m': '1 hónap',
      'permanent': 'véglegesen'
    };

    const body = { duration, reason: '' };
    this.http.post(`${base}/ban`, body, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.loadUsers();
        this.showToast(`${user.username} tiltva (${durationLabels[duration]})`, 'success');
      },
      error: (err) => {
        console.error('Quick ban hiba:', err);
        this.showToast('Hiba a tiltás alkalmazásakor', 'error');
      }
    });
  }

  getInitials(username: string): string {
    if (!username) return '';
    const parts = username.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  }

  isUserActive(user: any): boolean {
    const v = user?.lastLogin;
    if (!v) return false;

    const t = typeof v === 'number'
      ? (v > 1e12 ? v : v * 1000)
      : Date.parse(v);

    if (isNaN(t)) return false;

    const diffMin = (Date.now() - t) / 60000;
    return diffMin >= 0 && diffMin <= 5;
  }

  getDaysSince(date: string): number {
    const regDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - regDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  private showToast(text: string, variant: ToastVariant = 'default', ms = 3000) {
    this.toast.text = text;
    this.toast.variant = variant;
    if (this.toast.timer) clearTimeout(this.toast.timer);
    this.toast.timer = window.setTimeout(() => (this.toast.text = ''), ms);
  }


  getStatusLabel(user: any): string {
    if (this.isPermanent(user)) return 'Véglegesen tiltott';
    if (this.isBanned(user)) return 'Ideiglenesen tiltott';
    return 'Aktív';
  }

  openDropdownFor: string | null = null;

  toggleDropdown(userId: string) {
    this.openDropdownFor = this.openDropdownFor === userId ? null : userId;
  }

  toggleRole(user: any) {
    const token = localStorage.getItem('token');
    if (!token) {
      this.showToast('Nincs érvényes token (jelentkezz be újra)', 'error');
      return;
    }

    const newRole = user.role === 'admin' ? 'user' : 'admin';

    this.http.patch(
      `${environment.apiUrl}/api/admin/users/${user._id}/role`,
      { role: newRole },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({
      next: () => {
        this.showToast(
          newRole === 'admin'
            ? `${user.username} mostantól admin`
            : `${user.username} admin jogai visszavonva`,
          'success'
        );
        this.loadUsers();
      },
      error: (err) => {
        console.error('Role módosítás hiba:', err);
        this.showToast('Hiba a szerepkör módosításakor', 'error');
      }
    });
  }

}
