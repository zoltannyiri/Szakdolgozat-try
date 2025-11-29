import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoopService } from '../../../services/loop.service';

type PendingLoop = {
  _id: string;
  filename: string;
  path: string;
  bpm?: number;
  key?: string;
  scale?: string;
  instrument?: string;
  duration?: number;          // mp
  uploadDate?: string | Date;
  tags?: string[];
  uploader?: { username?: string; _id?: string };
};

@Component({
  selector: 'app-admin-loop-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-loop-moderation.component.html',
  styleUrls: ['./admin-loop-moderation.component.scss']
})
export class AdminLoopModerationComponent implements OnInit {
  isLoading = false;
  errorMessage = '';

  // a template ezt használja
  pendingLoops: PendingLoop[] = [];

  // indok mezők tartalma loop ID szerint
  reasonMap: Record<string, string> = {};

  // szűrők a felső sávhoz
  filters: {
    q?: string;
    minBpm?: number | null;
    maxBpm?: number | null;
    key?: string;
    scale?: string;
  } = {
    q: '',
    minBpm: null,
    maxBpm: null,
    key: '',
    scale: ''
  };

  constructor(private loopSvc: LoopService) {}

  ngOnInit(): void {
    this.load();
  }

  refresh(): void {
    this.load();
  }

  clearFilters(): void {
    this.filters = { q: '', minBpm: null, maxBpm: null, key: '', scale: '' };
    this.load();
  }

  private buildQuery() {
    const q: any = {};
    if (this.filters.q?.trim()) q.q = this.filters.q.trim();
    if (this.filters.minBpm != null) q.minBpm = this.filters.minBpm;
    if (this.filters.maxBpm != null) q.maxBpm = this.filters.maxBpm;
    if (this.filters.key?.trim()) q.key = this.filters.key.trim();
    if (this.filters.scale?.trim()) q.scale = this.filters.scale.trim();
    return q;
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // lekérdezés a szűrőkkel
    this.loopSvc.getPendingLoops().subscribe({
      next: (res: any) => {
        
        this.pendingLoops = res?.loops ?? [];
        // indok reset
        this.reasonMap = {};
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Nem sikerült betölteni a listát.';
        this.isLoading = false;
      }
    });
  }

  
  approve(loop: PendingLoop): void {
    if (!loop?._id) return;
    this.loopSvc.approveLoop(loop._id).subscribe({
      next: () => {
        this.pendingLoops = this.pendingLoops.filter(l => l._id !== loop._id);
      },
      error: () => {
        alert('Jóváhagyás sikertelen.');
      }
    });
  }

  
  reject(loop: PendingLoop, reason?: string): void {
    if (!loop?._id) return;
    const r = (reason || '').trim();
    if (!r) { alert('Adj meg elutasítási indokot.'); return; }

    this.loopSvc.rejectLoop(loop._id, r).subscribe({
      next: () => {
        this.pendingLoops = this.pendingLoops.filter(l => l._id !== loop._id);
        delete this.reasonMap[loop._id];
      },
      error: () => {
        alert('Elutasítás sikertelen.');
      }
    });
  }
}
