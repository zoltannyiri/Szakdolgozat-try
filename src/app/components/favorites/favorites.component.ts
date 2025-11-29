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
import { WaveformService } from '../../services/waveform.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit, OnDestroy {
  @ViewChildren('audioPlayer') audioPlayers!: QueryList<ElementRef<HTMLAudioElement>>;
  toast = { text: '', variant: 'default' as 'success' | 'error' | 'default', timer: 0 as any };
  favoriteLoops: ILoop[] = [];
  isLoading = true;

  // audio
  currentlyPlayingId: string | null = null;
  waveforms: { [key: string]: number[] } = {};
  currentPositions: { [key: string]: number } = {};
  durations: { [key: string]: number } = {};
  volumes: { [key: string]: number } = {};

  // report
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

  // const
  keys = ["A","Am","A#","A#m","B","Bm","C","Cm","C#","C#m","D","Dm","D#","D#m","E","Em","F","Fm","F#","F#m","G","Gm","G#","G#m"];
  scales = ["major","minor","dorian","phrygian","lydian","mixolydian","locrian"];
  instruments = ["Kick","Snare","Hihat","Clap","Cymbal","Percussion","Bass","Synth","Guitar","Vocal","FX"];

  private destroy$ = new Subject<void>();

  constructor(
    private favoriteService: FavoriteService,
    public loopService: LoopService,
    public authService: AuthService,
    private reportsSvc: ReportsService,
    private http: HttpClient,
    private waveformService: WaveformService
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

  getAudioUrl(path?: string | null): string {
    if (!path) return '';

    if (path.includes('localhost:3000')) {
        const relative = path.replace('http://localhost:3000', '').replace('https://localhost:3000', '');
        return `${this.loopService.apiUrl}${relative}`;
    }

    const driveIdMatch = path.match(/[?&]id=([A-Za-z0-9_\-]+)/);
    if (path.includes('drive.google.com') && driveIdMatch) {
      const fileId = driveIdMatch[1];
      return `${this.loopService.apiUrl}/api/files/${fileId}`;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const cleanPath = path.replace(/^\/?uploads\//, 'uploads/');
    return `${this.loopService.apiUrl}/${cleanPath}`;
  }

  async generateWaveform(loopId: string): Promise<void> {
    const loop = this.favoriteLoops.find(l => l._id === loopId);
    if (!loop) return;

    const audioUrl = this.getAudioUrl(loop.path);
    if (!audioUrl) return;

    const wf = await this.waveformService.getOrCreate(loopId, audioUrl);
    this.waveforms[loopId] = wf;
  }

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

  hasLiked(loop: ILoop): boolean {
    const uid = this.authService.getUserId();
    if (!uid || !loop?.likedBy) return false;
    const idStr = uid.toString();
    return loop.likedBy.some((x: any) => x.toString() === idStr);
  }

  toggleLike(loop: any): void {
    const uid = this.authService.getUserId();
    if (!uid) { 
      this.showToast('Jelentkezz be a likeoláshoz!', 'error'); 
      return; 
    }
    const idStr = uid.toString();

    if (this.hasLiked(loop)) {
      this.loopService.unlikeLoop(loop._id).subscribe({
        next: (resp) => {
          loop.likes = resp.likes;
          loop.likedBy = loop.likedBy.filter((x: any) => x.toString() !== idStr);
        },
        error: (e) => {
          console.error('Unlike error:', e);
          if (e.status === 403) {
             this.showToast('Erősítsd meg az e-mail címedet!', 'error');
          } else {
             this.showToast('Hiba történt.', 'error');
          }
        }
      });
    } else {
      this.loopService.likeLoop(loop._id).subscribe({
        next: (resp) => {
          loop.likes = resp.likes;
          if (!loop.likedBy) loop.likedBy = [];
          loop.likedBy.push(uid);
        },
        error: (e) => {
          console.error('Like error:', e);
          if (e.status === 403 && e.error?.code === 'BANNED') {
             this.showToast('Tiltott fiókkal nem likeolhatsz.', 'error');
          } else if (e.status === 403 && e.error?.code === 'EMAIL_NOT_VERIFIED') {
             this.showToast('Erősítsd meg az e-mail címedet!', 'error');
          } else {
             this.showToast('Hiba történt.', 'error');
          }
        }
      });
    }
  }
  
  async downloadLoop(loop: ILoop): Promise<void> {
    try {
      const verified = await this.authService.isUserVerified().toPromise();
      if (!verified) { 
        this.showToast('Erősítsd meg az e-mail címedet a letöltéshez!', 'error'); 
        return; 
      }

      this.loopService.downloadLoop(loop._id).subscribe({
        next: (response: any) => {
          if (response && response.downloadUrl) {
            let url = response.downloadUrl;
            
            if (url.includes('localhost:3000')) {
               url = url.replace('http://localhost:3000', this.loopService.apiUrl);
               url = url.replace('https://localhost:3000', this.loopService.apiUrl);
            }
            const idMatch = url.match(/\/files\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
            if (idMatch && idMatch[1]) {
               url = `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
            }

            const a = document.createElement('a');
            a.href = url;
            a.download = loop.filename || `loop_${loop._id}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
          else if (response instanceof Blob) {
            const url = URL.createObjectURL(response);
            const a = document.createElement('a');
            a.href = url;
            a.download = loop.filename || `loop_${loop._id}.wav`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
          }
        },
        error: async (err) => {
          console.error('Download error:', err);
          if (err.status === 401) {
             this.showToast('Jelentkezz be a letöltéshez!', 'error');
             return;
          }

          const payload = await this.readErrorPayload(err);
          const code = payload?.code;

          if (code === 'NO_CREDITS') {
            this.showToast('Nincs elég kredited! Tölts fel loopot a szerzéshez.', 'error');
          } else if (code === 'BANNED') {
            this.showToast('A fiókod tiltva van, a letöltés nem engedélyezett.', 'error');
          } else if (code === 'EMAIL_NOT_VERIFIED') {
            this.showToast('Erősítsd meg az e-mail címedet!', 'error');
          } else {
            this.showToast(payload?.message || 'A letöltés nem sikerült.', 'error');
          }
        }
      });
    } catch (e) {
      console.error('Download flow error:', e);
    }
  }

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

  formatTime(sec?: number): string {
    if (sec === undefined || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  trackById(_: number, item: any) { return item?._id; }

  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toast.text = message;
    this.toast.variant = type;
    if (this.toast.timer) clearTimeout(this.toast.timer);
    this.toast.timer = setTimeout(() => {
      this.toast.text = '';
    }, 3000);
  }

  private readErrorPayload(err: any): Promise<any> {
    if (err?.error instanceof Blob) {
      return err.error.text().then((t: string) => {
        try { return JSON.parse(t || '{}'); } catch { return {}; }
      });
    }
    return Promise.resolve(err?.error || {});
  }
}