import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-loops',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './admin-loops.component.html',
  styleUrls: ['./admin-loops.component.scss']
})
export class AdminLoopsComponent implements OnInit {
  loops: any[] = [];
  errorMessage = '';

  searchTerm = '';
  // sortField: string = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  currentPage = 1;
  itemsPerPage = 10;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadLoops();
  }

  loadLoops() {
    const token = localStorage.getItem('token');
    this.http.get<any>(`${environment.apiUrl}/api/admin/loops`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.loops = res.loops;
        }
      },
      error: (err) => {
        console.error('Hiba a loopok betöltésekor:', err);
        this.errorMessage = 'Nem sikerült betölteni a loopokat.';
      }
    });
  }

  deleteLoop(loopId: string) {
    if (!confirm('Biztosan törlöd ezt a loopot?')) return;

    const token = localStorage.getItem('token');
    this.http.delete(`${environment.apiUrl}/api/admin/loops/${loopId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => this.loadLoops(),
      error: (err) => {
        console.error('Loop törlése sikertelen:', err);
        this.errorMessage = 'Nem sikerült törölni a loopot.';
      }
    });
  }

  applyFilters() {
    this.currentPage = 1;
  }

  // get filteredLoops() {
  //   const term = this.searchTerm.toLowerCase();
  //   return this.loops.filter(loop =>
  //     (loop.title || '').toLowerCase().includes(term) ||
  //     (loop.username || '').toLowerCase().includes(term)
  //   );
  // }

  get filteredLoops() {
  const term = this.searchTerm.toLowerCase();
  return this.loops.filter(loop => {
    const title = (loop.filename || '').toLowerCase();
    const uploader = (loop.uploader?.username || '').toLowerCase();
    return title.includes(term) || uploader.includes(term);
  });
}

sortField: string = 'uploadDate';

get sortedLoops() {
  const sorted = [...this.filteredLoops];
  sorted.sort((a, b) => {
    if (this.sortField === 'uploadDate') {
      const av = new Date(a.uploadDate || a.createdAt || 0).getTime();
      const bv = new Date(b.uploadDate || b.createdAt || 0).getTime();
      return this.sortDirection === 'asc' ? av - bv : bv - av;
    }

    if (this.sortField === 'uploader') {
      const av = (a.uploader?.username || '').toLowerCase();
      const bv = (b.uploader?.username || '').toLowerCase();
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


  

  get paginatedLoops() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.sortedLoops.slice(start, start + this.itemsPerPage);
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    const totalPages = Math.ceil(this.sortedLoops.length / this.itemsPerPage);
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

  exportToCSV() {
    // const rows = this.sortedLoops.map(loop => ({
    //   Cím: loop.title,
    //   Feltöltő: loop.username,
    //   Dátum: new Date(loop.createdAt).toLocaleDateString(),
    //   Likeok: loop.likes,
    //   Letöltések: loop.downloads
    // }));
    const rows = this.sortedLoops.map(loop => ({
      Cím: loop.filename,
      Feltöltő: loop.uploader?.username || '',
      Dátum: new Date(loop.uploadDate || loop.createdAt).toLocaleDateString(),
      Likeok: loop.likes ?? 0,
      Letöltések: loop.downloads ?? 0
    }));

    const csv = this.convertToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'loops.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  convertToCsv(data: any[]): string {
    if (!data.length) return '';
    const headers = Object.keys(data[0]).join(';');
    const rows = data.map(row => Object.values(row).join(';'));
    return [headers, ...rows].join('\n');
  }

  selectedLoop: any = null;

openModal(loop: any) {
  const token = localStorage.getItem('token');
  this.http.get<any>(`${environment.apiUrl}/api/admin/loops/${loop._id}`, {
    headers: { Authorization: `Bearer ${token}` }
  }).subscribe({
    next: (res) => {
      this.selectedLoop = res.loop;
    },
    error: (err) => {
      console.error('Részletek betöltése sikertelen:', err);
      this.selectedLoop = loop; // fallback, ha nem jön be a részletes
    }
  });
}


closeModal() {
  this.selectedLoop = null;
}

// getAudioUrl(path: string): string {
//   return `${environment.apiUrl}/${path}`;
// }
getAudioUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${environment.apiUrl}/${path.replace(/^\/+/, '')}`;
}

getLoopLink(loopId: string): string {
  return `/loop-detail/${loopId}`;
}

openInNewTab(loopId: string) {
  window.open(this.getLoopLink(loopId), '_blank');
}
}