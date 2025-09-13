import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ReportsService,
  ReportType,
  ReportStatus,
  ReportListWire
} from '../../../services/reports.service';
import { RouterModule } from '@angular/router';

type Tab = { key: ReportType | 'all'; label: string; count?: number };

// type ReportItem = {
//   _id: string;
//   type: ReportType;
//   status: ReportStatus;
//   message: string;
//   createdAt: string;
//   reporter?: { _id: string; username?: string } | string;
//   targetId: string;
//   targetOwnerId?: string;
//   meta?: {
//     commentText?: string;
//     loopId?: string;
//     loopTitle?: string;
//   };
// };

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.scss']
})
export class AdminReportsComponent implements OnInit {
  tabs: Tab[] = [
    { key: 'all', label: 'Összes' },
    { key: 'comment', label: 'Kommentek' },
    { key: 'loop', label: 'Loopok' },
    { key: 'profile', label: 'Profilok' },
  ];
  activeTab: Tab = this.tabs[1]; // default: Kommentek

  // Statusz szűrő
  status: ReportStatus = 'pending';

  counts: Record<ReportType, number> = { comment: 0, loop: 0, profile: 0 };

  loading = false;
  reports: any[] = [];
  page = 1;
  limit = 20;
  total = 0;
  pages = 1;

  expanded: Record<string, boolean> = {};

  constructor(private reportsSvc: ReportsService) {}

  ngOnInit() {
    this.loadCounts();
    this.loadReports();
  }

  setTab(tab: Tab) {
    this.activeTab = tab;
    this.page = 1;
    this.loadReports();
  }

  setStatus(status: ReportStatus) {
    this.status = status;
    this.page = 1;
    this.loadCounts();
    this.loadReports();
  }

  refresh() {
    this.loadCounts();
    this.loadReports();
  }

  private loadCounts() {
    this.reportsSvc.getCounts('pending').subscribe({
      next: (res: { success: boolean; data: Record<ReportType, number> }) => {
        if (res?.success) {
          this.counts = res.data;
          this.tabs = this.tabs.map(t =>
            t.key === 'all'
              ? { ...t, count: (this.counts.comment + this.counts.loop + this.counts.profile) }
              : { ...t, count: this.counts[t.key as ReportType] }
          );
        }
      }
    });
  }

  private loadReports() {
    this.loading = true;
    const type = this.activeTab.key === 'all' ? undefined : (this.activeTab.key as ReportType);
    this.reportsSvc.getReports(type, this.status, this.page, this.limit).subscribe({
      next: (res: ReportListWire) => {
        this.loading = false;
        this.reports = res?.data ?? [];
        this.total = res?.pagination?.total ?? 0;
        this.pages = res?.pagination?.pages ?? 1;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleExpand(id: string) {
    this.expanded[id] = !this.expanded[id];
  }

  handleSetStatus(reportId: string, status: ReportStatus) {
    this.reportsSvc.setStatus(reportId, status).subscribe({
      next: () => this.refresh()
    });
  }

  deleteCommentInline(report: any) {
    const commentId = report?.target?._id || report?.meta?.commentId;
    if (!commentId) return;
    if (!confirm('Biztosan törlöd a kommentet?')) return;
    this.reportsSvc.deleteCommentAdmin(commentId).subscribe({
      next: () => this.handleSetStatus(report._id, 'resolved')
    });
  }

  pagePrev() { if (this.page > 1) { this.page--; this.loadReports(); } }
  pageNext() { if (this.page < this.pages) { this.page++; this.loadReports(); } }
}
