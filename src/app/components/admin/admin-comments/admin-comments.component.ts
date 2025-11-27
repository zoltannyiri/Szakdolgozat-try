import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './admin-comments.component.html',
  styleUrls: ['./admin-comments.component.scss']
})
export class AdminCommentsComponent implements OnInit {
  comments: any[] = [];
  errorMessage = '';

  searchTerm = '';
  sortField: string = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  itemsPerPage = 10;

  selectedComment: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadComments();
  }

  loadComments() {
    const token = localStorage.getItem('token');
    this.http.get<any>(`${environment.apiUrl}/api/admin/comments`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.comments = res.comments;
        }
      },
      error: (err) => {
        console.error('Hiba a kommentek betöltésekor:', err);
        this.errorMessage = 'Nem sikerült betölteni a kommenteket.';
      }
    });
  }

  deleteComment(commentId: string) {
    if (!confirm('Biztosan törlöd ezt a kommentet?')) return;

    const token = localStorage.getItem('token');
    this.http.delete(`${environment.apiUrl}/api/admin/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c._id !== commentId);
        const maxPage = Math.max(1, Math.ceil(this.filteredComments.length / this.itemsPerPage));
        this.showToast('Komment sikeresen törölve', 'success');
      },
      error: (err) => {
        console.error('Komment törlése sikertelen:', err);
        this.errorMessage = 'Nem sikerült törölni a kommentet.';
        this.showToast('Hiba történt a törlés során', 'error');
      }
    });
  }

  deleteCommentFromModal(commentId: string) {
    if (!confirm('Biztosan törlöd ezt a kommentet?')) return;

    const token = localStorage.getItem('token');
    this.http.delete(`${environment.apiUrl}/api/admin/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.closeModal();
        this.loadComments();
        this.showToast('Komment sikeresen törölve', 'success');
      },
      error: (err) => {
        console.error('Komment törlése sikertelen:', err);
        this.errorMessage = 'Nem sikerült törölni a kommentet.';
        this.showToast('Hiba történt a törlés során', 'error');
      }
    });
  }

  applyFilters() {
    this.currentPage = 1;
  }

  showToast(message: string, type: 'success' | 'error' = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-xl backdrop-blur-sm ${
      type === 'success' ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-700' : 'bg-rose-900/90 text-rose-100 border border-rose-700'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }

  get filteredComments() {
    const term = this.searchTerm.toLowerCase();
    return this.comments.filter(comment => {
      const text = (comment.text || '').toLowerCase();
      const username = (comment.user?.username || '').toLowerCase();
      const loopName = (comment.loop?.filename || '').toLowerCase();
      
      return text.includes(term) || username.includes(term) || loopName.includes(term);
    });
  }

  get sortedComments() {
    const sorted = [...this.filteredComments];
    sorted.sort((a, b) => {
      if (this.sortField === 'createdAt') {
        const av = new Date(a.createdAt || 0).getTime();
        const bv = new Date(b.createdAt || 0).getTime();
        return this.sortDirection === 'asc' ? av - bv : bv - av;
      }

      if (this.sortField === 'user') {
        const av = (a.user?.username || '').toLowerCase();
        const bv = (b.user?.username || '').toLowerCase();
        return this.sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }

      if (this.sortField === 'loop') {
        const av = (a.loop?.filename || '').toLowerCase();
        const bv = (b.loop?.filename || '').toLowerCase();
        return this.sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }

      const aVal = (a[this.sortField] ?? '').toString().toLowerCase();
      const bVal = (b[this.sortField] ?? '').toString().toLowerCase();
      if (isNaN(aVal as any) && isNaN(bVal as any)) {
        return this.sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const an = Number(a[this.sortField] ?? 0);
      const bn = Number(b[this.sortField] ?? 0);
      return this.sortDirection === 'asc' ? an - bn : bn - an;
    });
    return sorted;
  }

  get paginatedComments() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.sortedComments.slice(start, start + this.itemsPerPage);
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    const totalPages = Math.ceil(this.sortedComments.length / this.itemsPerPage);
    if (this.currentPage < totalPages) this.currentPage++;
  }

  setSort(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  openModal(comment: any) {
    const token = localStorage.getItem('token');
    this.http.get<any>(`${environment.apiUrl}/api/admin/comments/${comment._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.selectedComment = res.comment;
        document.body.style.overflow = 'hidden';
      },
      error: (err) => {
        console.error('Részletek betöltése sikertelen:', err);
        this.selectedComment = comment;
        document.body.style.overflow = 'hidden';
      }
    });
  }

  closeModal() {
    this.selectedComment = null;
    document.body.style.overflow = 'auto';
  }

  getLoopLink(loopId: string): string {
    return `/loop-detail/${loopId}`;
  }

  // getUserProfileLink(userId: string): string {
  //   return `/profile/${userId}`;
  // }

  activeUsersCount(): number {
    const uniqueUsers = new Set(this.comments.map(comment => comment.user?._id).filter(id => id));
    return uniqueUsers.size;
  }

  loopsWithCommentsCount(): number {
    const uniqueLoops = new Set(this.comments.map(comment => comment.loop?._id).filter(id => id));
    return uniqueLoops.size;
  }

  get Math() {
    return Math;
  }
}