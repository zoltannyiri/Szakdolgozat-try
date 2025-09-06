// src/app/services/reports.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';
import { map, Observable } from 'rxjs';

export type ReportType = 'comment' | 'loop' | 'profile';
export type ReportStatus = 'pending' | 'resolved' | 'rejected';

export interface ReportCountsWire {
  success: true;
  data: {
    totals: { total: number; pending: number; resolved: number; rejected: number };
    byType: Record<ReportType, { total: number; pending: number; resolved: number; rejected: number }>;
  };
}

export interface ReportListWire {
  success: boolean;
  data: any[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private api = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  // Oldalsáv számlálók
  getCounts(status: ReportStatus = 'pending'): Observable<{ success: boolean; data: Record<ReportType, number> }> {
    return this.http.get<ReportCountsWire>(`${this.api}/admin/reports/counts`).pipe(
      map(res => {
        const pick = (t: ReportType) => res.data.byType[t]?.[status] ?? 0;
        return {
          success: true,
          data: {
            comment: pick('comment'),
            loop: pick('loop'),
            profile: pick('profile'),
          }
        };
      })
    );
  }

  // Jelentések listázása
  getReports(type?: ReportType, status: ReportStatus = 'pending', page = 1, limit = 20) {
    let params = new HttpParams().set('status', status).set('page', page).set('limit', limit);
    if (type) params = params.set('type', type);
    return this.http.get<ReportListWire>(`${this.api}/admin/reports`, { params });
  }

  // Státusz állítása
  setStatus(reportId: string, status: ReportStatus) {
    return this.http.patch<{ success: boolean }>(`${this.api}/admin/reports/${reportId}/status`, { status });
  }

  // Komment jelentése (user)
  reportComment(commentId: string, message: string) {
    return this.http.post<{ success: boolean; data: any }>(`${this.api}/reports/comments/${commentId}`, { message });
  }

  // Admin komment törlés
  deleteCommentAdmin(commentId: string) {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.api}/admin/comments/${commentId}`);
  }
}
