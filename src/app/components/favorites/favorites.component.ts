import { Component, OnInit, ViewChildren, QueryList, ElementRef, OnDestroy } from '@angular/core';
import { FavoriteService } from '../../services/favorite.service';
import { LoopService } from '../../services/loop.service';
import { AuthService } from '../../services/auth.service';
import { ILoop } from '../../../../api/src/models/loop.model';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReportsService } from '../../services/reports.service';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit, OnDestroy {
  @ViewChildren('audioPlayer') audioPlayers!: QueryList<ElementRef<HTMLAudioElement>>;

  favoriteLoops: ILoop[] = [];
  isLoading = true;

  // audio state
  currentlyPlayingId: string | null = null;
  waveforms: { [key: string]: number[] } = {};
  currentPositions: { [key: string]: number } = {};
  durations: { [key: string]: number } = {};
  volumes: { [key: string]: number } = {};

  // report modal
  isLoopReportModalOpen = false;
  reportTargetLoopId: string | null = null;
  loopReportReason = '';
  isReportingLoop = false;
  loopReportError = '';
  loopReportSuccess = '';

  // admin
  isAdmin = false;
  isEditModalOpen = false;
  editingLoopId: string | null = null;
  isSavingEdit = false;
  editError: string | null = null;

  editForm = {
    name: '',
    bpm: null as number | null,
    key: '',
    scale: '',
    instrument: '',
    tags: ''
  };

  // const-ok
  keys = ["A","Am","A#","A#m","B","Bm","C","Cm","C#","C#m","D","Dm","D#","D#m","E","Em","F","Fm","F#","F#m","G","Gm","G#","G#m"];
  scales = ["major","minor","dorian","phrygian","lydian","mixolydian","locrian"];
  instruments = ["Kick","Snare","Hihat","Clap","Cymbal","Percussion","Bass","Synth","Guitar","Vocal","FX"];

  private destroy$ = new Subject<void>();

  constructor(
    private favoriteService: FavoriteService,
    public loopService: LoopService,
    public authService: AuthService,
    private reportsSvc: ReportsService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.checkIsAdmin();
    this.loadFavorites();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFavorites(): void {
    this.isLoading = true;
    this.favoriteService.getUserFavorites()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const raw = res?.favorites ?? [];
          this.favoriteLoops = raw.filter((l: any) => l && typeof l === 'object' && l._id);
          // audio
          this.favoriteLoops.forEach(l => {
            this.volumes[l._id] = 0.7;
            this.generateWaveform(l._id);
          });
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading favorites:', err);
          this.favoriteLoops = [];
          this.isLoading = false;
        }
      });
  }

  // URL
  getAudioUrl(path?: string | null): string | null {
    if (!path) return null;

    const driveId = path.match(/[?&]id=([A-Za-z0-9_\-]+)/)?.[1];
    if (path.includes('drive.google.com') && driveId) {
      return `${this.loopService.apiUrl}/api/files/${driveId}`;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleaned = path.replace(/\\/g, '/').replace(/^\/?uploads\//, 'uploads/');
    return `${this.loopService.apiUrl}/${cleaned}`;
  }

  // Lejátszás
  togglePlay(loopId: string, audioEl: HTMLAudioElement | ElementRef<HTMLAudioElement>): void {
    const audio = audioEl instanceof ElementRef ? audioEl.nativeElement : audioEl;

    if (this.currentlyPlayingId && this.currentlyPlayingId !== loopId) {
      const prev = document.querySelector<HTMLAudioElement>(`#fav-audio-${this.currentlyPlayingId}`);
      if (prev) { prev.pause(); prev.currentTime = 0; }
    }

    if (audio.paused) {
      audio.play().then(() => {
        this.currentlyPlayingId = loopId;
        audio.volume = this.volumes[loopId] ?? 0.7;
        audio.ontimeupdate = () => {
          this.currentPositions[loopId] = audio.currentTime;
          this.durations[loopId] = audio.duration;
        };
      }).catch(err => {
        console.error('Playback error:', err);
        this.currentlyPlayingId = null;
      });
    } else {
      audio.pause();
      this.currentlyPlayingId = null;
    }
  }

  onAudioPlay(loopId: string) { this.currentlyPlayingId = loopId; }
  onAudioPause() { this.currentlyPlayingId = null; }

  onAudioError(audio: HTMLAudioElement | ElementRef<HTMLAudioElement>) {
    const el = audio instanceof ElementRef ? audio.nativeElement : audio;
    console.error('Playback error:', el?.error, 'src:', el?.src);
    this.currentlyPlayingId = null;
  }

  // Progress / seek / volume
  updateProgress(loopId: string) {
    const el = document.querySelector<HTMLAudioElement>(`#fav-audio-${loopId}`);
    if (el) {
      this.currentPositions[loopId] = el.currentTime;
      this.durations[loopId] = el.duration;
    }
  }

  getProgress(loopId: string): number {
    const el = document.querySelector<HTMLAudioElement>(`#fav-audio-${loopId}`);
    if (!el || !el.duration) return 0;
    return (el.currentTime / el.duration) * 100;
  }

  seekAudio(evt: MouseEvent, loopId: string, _waveform: boolean) {
    const el = document.querySelector<HTMLAudioElement>(`#fav-audio-${loopId}`);
    if (!el) return;
    const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect();
    const click = evt.clientX - rect.left;
    const p = Math.max(0, Math.min(1, click / rect.width));
    el.currentTime = p * (el.duration || 0);
    if (this.currentlyPlayingId === loopId) this.currentPositions[loopId] = el.currentTime;
  }

  setVolume(loopId: string, v: number | string) {
    const vol = typeof v === 'string' ? +v : v;
    this.volumes[loopId] = vol;
    if (this.currentlyPlayingId === loopId) {
      const el = document.querySelector<HTMLAudioElement>(`#fav-audio-${loopId}`);
      if (el) el.volume = vol;
    }
  }

  // waveform (loops)
  async generateWaveform(loopId: string): Promise<void> {
    try {
      const target = this.favoriteLoops.find(l => l._id === loopId);
      const url = this.getAudioUrl(target?.path || '');
      if (!url) return;

      const ctx = new AudioContext();
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);

      const ch = buf.getChannelData(0);
      const spp = Math.max(1, Math.floor(ch.length / 100));
      const wf: number[] = [];

      for (let i = 0; i < 100; i++) {
        const s = i * spp;
        const e = Math.min(s + spp, ch.length);
        let sum = 0;
        for (let j = s; j < e; j++) sum += Math.abs(ch[j]);
        const avg = sum / (e - s);
        wf.push(Math.min(100, Math.floor(avg * 200)));
      }

      this.waveforms[loopId] = wf;
      await ctx.close();
    } catch (err) {
      console.error('Waveform gen error:', err);
      this.waveforms[loopId] = new Array(100).fill(30);
    }
  }

  // Like (loops)
  hasLiked(loop: ILoop): boolean {
    const uid = this.authService.getUserId();
    if (!uid || !loop?.likedBy) return false;
    const idStr = uid.toString();
    return loop.likedBy.some((x: any) => x.toString() === idStr);
  }

  toggleLike(loop: any): void {
    const uid = this.authService.getUserId();
    if (!uid) { alert('Please log in to like loops'); return; }
    const idStr = uid.toString();

    if (this.hasLiked(loop)) {
      this.loopService.unlikeLoop(loop._id).subscribe({
        next: (resp) => {
          loop.likes = resp.likes;
          loop.likedBy = loop.likedBy.filter((x: any) => x.toString() !== idStr);
        },
        error: (e) => console.error('Unlike error:', e)
      });
    } else {
      this.loopService.likeLoop(loop._id).subscribe({
        next: (resp) => {
          loop.likes = resp.likes;
          if (!loop.likedBy) loop.likedBy = [];
          loop.likedBy.push(uid);
        },
        error: (e) => console.error('Like error:', e)
      });
    }
  }

  // letöltés (loops)
  async downloadLoop(loop: ILoop): Promise<void> {
    try {
      const verified = await this.authService.isUserVerified().toPromise();
      if (!verified) { alert('Előbb igazold az e-mail címedet.'); return; }

      this.loopService.downloadLoop(loop._id).subscribe({
        next: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = loop.filename || `loop_${loop._id}.wav`;
          document.body.appendChild(a);
          a.click();
          URL.revokeObjectURL(url);
          a.remove();
        },
        error: (err) => {
          // részletes kezelések
          const handle = (data: any) => {
            const code = data?.code;
            if (err.status === 403 && code === 'BANNED') {
              const untilIso = data?.until;
              const reason = (data?.reason || '').trim();
              let msg = 'A fiókod tiltva.';
              if (untilIso) {
                const until = new Date(untilIso);
                const forever = until.getUTCFullYear() >= 9999;
                msg = forever ? 'A fiókod véglegesen tiltva.' : `Ideiglenes tiltás eddig: ${until.toLocaleString()}.`;
              }
              if (reason) msg += `\nOk: ${reason}`;
              alert(msg); return;
            }
            if (err.status === 403 && code === 'EMAIL_NOT_VERIFIED') { alert('Előbb igazold az e-mail címedet.'); return; }
            alert('A letöltés nem engedélyezett vagy hiba történt.');
          };

          if (err?.error instanceof Blob) {
            err.error.text().then((t: string) => { try { handle(JSON.parse(t)); } catch { handle({}); } });
          } else {
            handle(err?.error);
          }
        }
      });
    } catch (e) {
      console.error('Download flow error:', e);
    }
  }

  // Remove favorite
  removeFavorite(loopId: string): void {
    this.favoriteService.removeFavorite(loopId).subscribe({
      next: () => {
        this.favoriteLoops = this.favoriteLoops.filter(l => l._id !== loopId);
        delete this.waveforms[loopId];
        delete this.currentPositions[loopId];
        delete this.durations[loopId];
        delete this.volumes[loopId];
        if (this.currentlyPlayingId === loopId) this.currentlyPlayingId = null;
      },
      error: (e) => console.error('Remove favorite error:', e)
    });
  }

  // Report
  openLoopReportModal(loopId: string) {
    if (!this.authService.isLoggedIn()) { alert('Please log in to report loops'); return; }
    this.reportTargetLoopId = loopId;
    this.loopReportReason = '';
    this.loopReportError = '';
    this.loopReportSuccess = '';
    this.isLoopReportModalOpen = true;
  }

  closeLoopReportModal(evt?: Event) {
    if (!evt) { this.isLoopReportModalOpen = false; return; }
    const el = evt.target as HTMLElement;
    if (el.classList.contains('bg-black') || el.classList.contains('bg-black/50')) {
      this.isLoopReportModalOpen = false;
    }
  }

  submitLoopReport() {
    if (!this.reportTargetLoopId || !this.loopReportReason.trim()) return;
    this.isReportingLoop = true;
    this.loopReportError = '';
    this.loopReportSuccess = '';

    this.reportsSvc.reportLoop(this.reportTargetLoopId, this.loopReportReason.trim()).subscribe({
      next: () => {
        this.isReportingLoop = false;
        this.loopReportSuccess = 'Köszönjük! A jelentést megkaptuk.';
        setTimeout(() => { this.isLoopReportModalOpen = false; }, 900);
      },
      error: (err) => {
        console.error('[loop report] error:', err);
        this.isReportingLoop = false;
        this.loopReportError = err?.error?.message || 'Hiba történt a jelentés beküldésekor.';
      }
    });
  }

  // Admin
  private checkIsAdmin(): boolean {
    try {
      const tok = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!tok) return false;
      const payload = JSON.parse(atob(tok.split('.')[1] || ''));
      return payload?.role === 'admin' || payload?.isAdmin === true;
    } catch { return false; }
  }

  adminDeleteLoop(loop: ILoop): void {
    if (!this.isAdmin) return;
    if (!confirm('Biztosan törlöd ezt a loopot?')) return;

    this.http.delete(`${this.loopService.apiUrl}/api/admin/loops/${loop._id}`).subscribe({
      next: () => { this.favoriteLoops = this.favoriteLoops.filter(l => l._id !== loop._id); },
      error: (err) => { console.error('Loop törlés hiba:', err); alert('A törlés nem sikerült.'); }
    });
  }

  openEditModal(loop: any) {
    if (!this.isAdmin) return;
    this.editingLoopId = loop._id;
    this.isEditModalOpen = true;
    this.editError = null;

    this.editForm = {
      name: (loop.title ?? loop.customName ?? loop.filename ?? ''),
      bpm: typeof loop.bpm === 'number' ? loop.bpm : null,
      key: loop.key ?? '',
      scale: loop.scale ?? '',
      instrument: loop.instrument ?? '',
      tags: Array.isArray(loop.tags) ? loop.tags.join(', ') : (loop.tags || '')
    };
  }

  closeEditModal(evt: MouseEvent) {
    if (evt && evt.target === evt.currentTarget) this.isEditModalOpen = false;
  }

  saveLoopEdit() {
    if (!this.isAdmin || !this.editingLoopId) return;

    if (this.editForm.bpm !== null) {
      const bpm = Number(this.editForm.bpm);
      if (isNaN(bpm) || bpm < 40 || bpm > 300) { this.editError = 'A BPM értéke 40 és 300 között legyen.'; return; }
    }

    const payload: any = {};
    const loop = this.favoriteLoops.find(l => l._id === this.editingLoopId);
    if (loop && 'title' in loop) payload.title = this.editForm.name?.trim() || '';
    else payload.filename = this.editForm.name?.trim() || '';

    if (this.editForm.bpm !== null) payload.bpm = Number(this.editForm.bpm);
    if (this.editForm.key) payload.key = this.editForm.key;
    if (this.editForm.scale) payload.scale = this.editForm.scale;
    if (this.editForm.instrument) payload.instrument = this.editForm.instrument;
    payload.tags = this.editForm.tags ? this.editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    this.isSavingEdit = true;
    this.editError = null;

    this.http.patch<{ success: boolean; data?: any }>(
      `${this.loopService.apiUrl}/api/admin/loops/${this.editingLoopId}`,
      payload
    ).subscribe({
      next: (res) => {
        const idx = this.favoriteLoops.findIndex(l => l._id === this.editingLoopId);
        if (idx > -1) {
          const updated = { ...this.favoriteLoops[idx], ...payload };
          if (payload.tags) (updated as any).tags = payload.tags;
          this.favoriteLoops[idx] = updated;
        }
        this.isSavingEdit = false;
        this.isEditModalOpen = false;
      },
      error: (err) => {
        console.error('Loop mentés hiba:', err);
        this.isSavingEdit = false;
        this.editError = err?.error?.message || 'A mentés nem sikerült.';
      }
    });
  }

  // utils
  formatTime(sec?: number): string {
    if (sec === undefined || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  trackById(_: number, item: any) { return item?._id; }
}