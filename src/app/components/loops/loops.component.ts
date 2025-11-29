import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ViewChildren, QueryList, ElementRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoopService } from '../../services/loop.service';
import { AuthService } from '../../services/auth.service';
import { ILoop } from '../../../../api/src/models/loop.model';
import { catchError, retry, throwError, timeout, timer } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { WaveformService } from '../../services/waveform.service';
import { FavoriteService } from '../../services/favorite.service';
import { ReportsService } from '../../services/reports.service';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-loops',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './loops.component.html',
  styleUrls: ['./loops.component.scss']
})
export class LoopsComponent implements OnInit, OnDestroy {
  @ViewChildren('audioPlayer') audioPlayers!: QueryList<ElementRef<HTMLAudioElement>>;

  toast = { text: '', variant: 'default' as 'success' | 'error' | 'default', timer: 0 as any };

  // Audio
  currentlyPlayingId: string | null = null;
  waveforms: { [key: string]: number[] } = {};
  progressValues: { [key: string]: number } = {};
  currentTimes: { [key: string]: number } = {};
  durations: { [key: string]: number } = {};
  volumes: { [key: string]: number } = {};
  currentPositions: { [key: string]: number } = {};

  // UI
  isAdvancedSearchOpen = false;
  isUploadModalOpen = false;
  isLoading = false;
  isUploading = false;

  // Search
  searchQuery = '';
  loops: ILoop[] = [];

  // Upload
  selectedFile: File | null = null;
  fileError = '';
  metadata = {
    customName: '',
    bpm: null as number | null,
    key: '',
    scale: 'minor',
    instrument: '',
    tags: ''
  };

  // Filter
  filters = {
    q: '',
    minBpm: null as number | null,
    maxBpm: null as number | null,
    key: '',
    scale: '',
    instrument: '',
    tags: '',
    sortBy: 'recent' as 'recent' | 'downloads' | 'likes'
  };

  // Report
  isLoopReportModalOpen = false;
  reportTargetLoopId: string | null = null;
  loopReportReason = '';
  isReportingLoop = false;
  loopReportError = '';
  loopReportSuccess = '';

  // Admin
  isAdmin = false;
  isEditModalOpen = false;
  editingLoopId: string | null = null;
  isSavingEdit = false;
  editError: string | null = null;

  uploadInfoMessage = '';
  uploadInfoType: 'info' | 'success' | 'warning' = 'info';

  editForm: {
    name: string;
    bpm: number | null;
    key: string;
    scale: string;
    instrument: string;
    tags: string;
  } = {
      name: '',
      bpm: null,
      key: '',
      scale: '',
      instrument: '',
      tags: ''
    };

  page = 1;
  pageSize = 8;
  total = 0;

  // const
  keys = ["Ismeretlen", "A", "Am", "A#", "A#m", "B", "Bm", "C", "Cm", "C#", "C#m", "D", "Dm", "D#", "D#m", "E", "Em", "F", "Fm", "F#", "F#m", "G", "Gm", "G#", "G#m"];
  scales = [
    "Hip Hop", 
    "Trap", 
    "Rap",
    "Drill", 
    "R&B", 
    "Pop", 
    "Lo-Fi", 
    "EDM", 
    "House", 
    "Techno", 
    "Dubstep", 
    "Cinematic", 
    "Rock", 
    "Jazz", 
    "Afrobeat", 
    "Reggaeton",
    "Ambient",
    "Funk",
    "Soul"
  ];
  instruments = ["Kick",
    "Snare",
    "Hi-Hat",
    "Clap",
    "Drum Loop",
    "Bass", 
    "808", 
    "Synth", 
    "Piano", 
    "Guitar", 
    "Strings", 
    "Brass", 
    "Woodwind", 
    "Vocal", 
    "FX", 
    "Pad", 
    "Pluck", 
    "Percussion",
    "Bells",
    "Organ"
  ];

  constructor(
    private loopService: LoopService,
    private authService: AuthService,
    private waveformService: WaveformService,
    private favoriteService: FavoriteService,
    private reportsSvc: ReportsService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.isAdmin = this.checkIsAdmin();
    if (this.authService.isLoggedIn()) {
      this.authService.getUserProfile().subscribe({
        next: (res: any) => {
          if (res?.user?.role === 'admin') {
            this.isAdmin = true;
          } else {
            this.isAdmin = false; 
          }
        },
        error: () => {
          this.isAdmin = false;
        }
      });
    }

    this.loadLoops();
  }

  private destroy$ = new Subject<void>();
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLoops(): void {
    this.isLoading = true;

    this.pageLoadStart = performance.now();

    const loops$ = this.loopService
      .getLoops(this.filters, this.page, this.pageSize)
      .pipe(takeUntil(this.destroy$));

    const favs$ = this.authService.isLoggedIn()
      ? this.favoriteService.getFavoriteIds().pipe(takeUntil(this.destroy$))
      : of({ success: true, ids: [] as string[] });

    forkJoin([loops$, favs$]).subscribe({
      next: ([loopsRes, favRes]) => {
        const favSet = new Set((favRes?.ids) ?? []);
        const loops = (loopsRes?.items ?? []) as ILoop[];

        const items = (loopsRes?.items ?? []) as ILoop[];
        this.total = Number(loopsRes?.total ?? items.length);
        this.page = Number(loopsRes?.page ?? this.page);
        this.pageSize = Number(loopsRes?.pageSize ?? this.pageSize);

        this.loops = loops;

        loops.forEach((loop: ILoop) => {
          this.volumes[loop._id] = 0.7;
          this.favoriteStatus[loop._id] = favSet.has(loop._id);
          this.generateWaveform(loop._id);
        });

        this.isLoading = false;
        const elapsedMs = performance.now() - this.pageLoadStart;
        this.listLoadTimes.push(elapsedMs);

        console.log(
          `[perf] loops list betöltve ${loops.length} elemmel: ${elapsedMs.toFixed(2)} ms`
        );

        if (this.listLoadTimes.length % 5 === 0) {
          const stats = this.getListLoadStats();
          console.log('[perf] lista stat eddig:', {
            mintavetelek_szama: stats.count,
            atlag_ms: stats.avgMs.toFixed(2),
            median_ms: stats.medianMs.toFixed(2),
            p90_ms: stats.p90Ms.toFixed(2)
          });
        }
      },
      error: () => {
        this.isLoading = false;
        const elapsedMs = performance.now() - this.pageLoadStart;
        console.warn(
          `[perf] loops list ERROR után idő: ${elapsedMs.toFixed(2)} ms`
        );
      }
    });
  }

  loadFavoritesOnce(): void {
    if (!this.authService.isLoggedIn()) return;

    this.favoriteService.getUserFavorites().subscribe({
      next: (res: any) => {
        if (Array.isArray(res.favorites)) {
          res.favorites.forEach((loop: any) => {
            if (loop?._id) this.favoriteStatus[loop._id] = true;
          });
        }
      },
      error: (err) => console.error('Error loading favorites:', err)
    });
  }

  private listLoadTimes: number[] = [];
  private pageLoadStart = 0;

  getListLoadStats() {
    if (this.listLoadTimes.length === 0) {
      return { count: 0, avgMs: 0, medianMs: 0, p90Ms: 0 };
    }

    const arr = [...this.listLoadTimes].sort((a, b) => a - b);
    const sum = this.listLoadTimes.reduce((acc, v) => acc + v, 0);

    const avgMs = sum / this.listLoadTimes.length;
    const mid = Math.floor(arr.length / 2);
    const medianMs = arr.length % 2 === 0
      ? (arr[mid - 1] + arr[mid]) / 2
      : arr[mid];
    const p90Idx = Math.floor(arr.length * 0.9);
    const p90Ms = arr[Math.min(p90Idx, arr.length - 1)];

    return {
      count: this.listLoadTimes.length,
      avgMs,
      medianMs,
      p90Ms
    };
  }

  private loadTimes: number[] = [];

  getLoadStats() {
    if (this.loadTimes.length === 0) {
      return {
        count: 0,
        avgMs: 0,
        medianMs: 0,
        p90Ms: 0
      };
    }

    const sorted = [...this.loadTimes].sort((a, b) => a - b);
    const sum = this.loadTimes.reduce((acc, v) => acc + v, 0);

    const avgMs = sum / this.loadTimes.length;

    const mid = Math.floor(sorted.length / 2);
    const medianMs = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    const p90Index = Math.floor(sorted.length * 0.9);
    const p90Ms = sorted[Math.min(p90Index, sorted.length - 1)];

    return {
      count: this.loadTimes.length,
      avgMs,
      medianMs,
      p90Ms
    };
  }

  getSafeAudioUrl(path: string | undefined): string {
    if (!path) return '';

    if (path.includes('localhost:3000')) {
        const relativePath = path.replace('http://localhost:3000', '').replace('https://localhost:3000', '');
        return `${this.loopService.apiUrl}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
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

  searchLoops(): void {
    if (this.searchQuery.trim()) {
      this.filters.tags = this.searchQuery;
      this.page = 1;
      this.loadLoops();
    }
  }

  applyAdvancedSearch(): void {
    this.page = 1;
    this.loadLoops();
    this.isAdvancedSearchOpen = false;
  }

  toggleUploadModal(): void {
    if (!this.authService.isLoggedIn()) {
      alert('Please log in to upload loops');
      return;
    }
    this.isUploadModalOpen = !this.isUploadModalOpen;
    if (this.isUploadModalOpen) {
      this.resetUploadForm();
    }
  }

  togglePlay(loopId: string, audioElement: HTMLAudioElement | ElementRef<HTMLAudioElement>): void {
    const audio = audioElement instanceof ElementRef ? audioElement.nativeElement : audioElement;

    if (this.currentlyPlayingId && this.currentlyPlayingId !== loopId) {
      const prevAudio = document.querySelector(`#audio-${this.currentlyPlayingId}`) as HTMLAudioElement;
      if (prevAudio) {
        prevAudio.pause();
        prevAudio.currentTime = 0;
      }
    }

    if (audio.paused) {
      audio.play()
        .then(() => {
          this.currentlyPlayingId = loopId;
          audio.volume = this.volumes[loopId] ?? 0.7;
          audio.ontimeupdate = () => {
            this.currentPositions[loopId] = audio.currentTime;
            this.durations[loopId] = audio.duration;
          };
        })
        .catch(err => {
          console.error('Playback error:', err);
          this.currentlyPlayingId = null;
        });
    } else {
      audio.pause();
      this.currentlyPlayingId = null;
    }
  }

  seekAudio(event: MouseEvent, loopId: string, isWaveform: boolean) {
    const audioElement = document.getElementById(`audio-${loopId}`) as HTMLAudioElement;
    if (!audioElement) return;

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const percentClicked = (clickPosition / rect.width) * 100;


    const newTime = (percentClicked / 100) * audioElement.duration;
    audioElement.currentTime = newTime;


    if (this.currentlyPlayingId === loopId) {
      this.currentPositions[loopId] = newTime;
    }
  }

  updateProgress(loopId: string) {
    const audioElement = document.getElementById(`audio-${loopId}`) as HTMLAudioElement;
    if (audioElement) {
      this.currentPositions[loopId] = audioElement.currentTime;
      this.durations[loopId] = audioElement.duration;
    }
  }

  getProgress(loopId: string): number {
    const audio = document.querySelector(`#audio-${loopId}`) as HTMLAudioElement;
    if (!audio || !audio.duration) return 0;
    return (audio.currentTime / audio.duration) * 100;
  }

  setVolume(loopId: string, newVolume: number | string): void {
    const volume = typeof newVolume === 'string' ? +newVolume : newVolume;
    this.volumes[loopId] = volume;

    if (this.currentlyPlayingId === loopId) {
      const audio = document.querySelector(`#audio-${loopId}`) as HTMLAudioElement;
      if (audio) audio.volume = volume;
    }
  }

  onAudioPlay(loopId: string) {
    this.currentlyPlayingId = loopId;
    if (this.bandHeights[loopId]) {
      this.animateBands(loopId);
    }
  }

  onAudioPause() {
    this.currentlyPlayingId = null;
  }

  isCurrentPosition(index: number, loopId: string): boolean {
    if (!this.currentlyPlayingId || this.currentlyPlayingId !== loopId) return false;

    const audio = document.querySelector(`#audio-${loopId}`) as HTMLAudioElement;
    if (!audio || !audio.duration) return false;

    const position = index / 100;
    const currentPos = audio.currentTime / audio.duration;
    return Math.abs(position - currentPos) < 0.02;
  }

  onAudioError(audioElement: HTMLAudioElement | ElementRef<HTMLAudioElement>): void {
    const audio = audioElement instanceof ElementRef ? audioElement.nativeElement : audioElement;
    console.error('Playback error:', audio.error);
    console.error('File path:', audio.src);
    this.currentlyPlayingId = null;
  }

  closeUploadModal(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('bg-black')) {
      this.isUploadModalOpen = false;
    }
  }

  toggleAdvancedSearch(): void {
    this.isAdvancedSearchOpen = !this.isAdvancedSearchOpen;
  }

  closeAdvancedSearch(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('bg-black')) {
      this.isAdvancedSearchOpen = false;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const validTypes = [
        'audio/wav', 'audio/x-wav',
        'audio/aiff', 'audio/x-aiff'
      ];
      const validExt = ['.wav', '.aif', '.aiff'];
      const hasValidMime = validTypes.includes(file.type);
      const hasValidExt = validExt.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!(hasValidMime && hasValidExt)) {
        this.fileError = "Csak WAV/AIFF kiterjesztésű fájl tölthető fel!";
        this.selectedFile = null;
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        this.fileError = "File size must be under 20MB.";
        this.selectedFile = null;
        return;
      }

      this.fileError = "";
      this.selectedFile = file;
    }
  }


  uploadFile(): void {
    if (!this.selectedFile) {
      this.fileError = "Válassz egy fájlt!";
      return;
    }

    const bpm = this.metadata.bpm;
    if (bpm === null || bpm === undefined || isNaN(bpm as any)) {
      this.fileError = 'Add meg a BPM értékét!';
      return;
    }
    if (bpm < 30 || bpm > 600) {
      this.fileError = 'A BPM értékének 30 és 600 között kell lennie.';
      return;
    }

    this.authService.isUserVerified().subscribe({
      next: (isVerified) => {
        if (!isVerified) {
          this.fileError = "Erősítsd meg az email címed, hogy feltölthess!";
          return;
        }

        this.performFileUpload();
      },
      error: (err) => {
        this.fileError = "Error checking verification status";
        console.error('Verification check error:', err);
      }
    });
  }

  private performFileUpload(): void {
    this.isUploading = true;
    const startTime = Date.now();

    this.loopService.uploadLoop(this.selectedFile!, this.metadata).pipe(
      retry({
        count: 3,
        delay: error => {
          console.error('Upload error:', error);
          return timer(1000);
        }
      }),
      timeout(30000),
      catchError(error => {
        this.isUploading = false;
        const duration = (Date.now() - startTime) / 1000;

        if (error instanceof HttpErrorResponse) {
          if (error.status === 500) {
            this.fileError = `Server error occurred during upload (after ${duration.toFixed(1)} seconds). Please try again later.`;
          } else if (error.status === 413) {
            this.fileError = 'The file is too large for the server.';
          } else if (error.status === 400) {
            const apiErr: any = error.error || {};
            const errs: string[] | undefined = apiErr.errors;

            if (Array.isArray(errs) && errs.length) {
              if (errs.some(e => e.toLowerCase().includes('bpm'))) {
                this.fileError = 'A BPM értékének 30 és 600 között kell lennie.';
              } else {
                this.fileError = errs.join(' ');
              }
            } else if (apiErr.message) {
              this.fileError = apiErr.message;
            } else {
              this.fileError = 'Érvénytelen adatok a feltöltésnél.';
            }
          } else {
            this.fileError = `Network error occurred (${error.status})`;
          }
        } else if (error.name === 'TimeoutError') {
          this.fileError = 'Upload took too long. Please try again.';
        } else {
          this.fileError = 'Unknown error occurred during upload.';
        }

        console.error('Upload error details:', {
          status: (error as any).status,
          message: (error as any).message,
          duration: duration
        });

        return throwError(() => error);
      })

    ).subscribe({
      next: (response) => {
        this.isUploading = false;
        this.isUploadModalOpen = false;

        const st = response?.loop?.status as 'pending' | 'approved' | undefined;
        if (st === 'pending') {
          this.uploadInfoMessage = 'Köszönjük a feltöltést! Az első 5 feltöltésedet moderáljuk. Amint jóváhagyjuk, meg fog jelenni.';
          this.uploadInfoType = 'info';
        } else {
          this.uploadInfoMessage = 'Loop sikeresen feltöltve!';
          this.uploadInfoType = 'success';
        }
        this.loadLoops();
      },
      error: (error) => {
        this.isUploading = false;
        console.error('Full upload error:', error);

        if (error?.error?.message) {
          this.fileError = error.error.message;
        } else {
          this.fileError = 'Upload failed. Please try again.';
        }
      }
    });
  }

  formatTime(seconds: number | undefined): string {
    if (seconds === undefined || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  onLoadedMeta(loopId: string, audio: HTMLAudioElement) {
    if (!audio) return;
    const d = Number.isFinite(audio.duration) ? audio.duration : 0;
    this.durations[loopId] = d;
    if (!this.waveforms[loopId]?.length) this.generateWaveform(loopId);
  }

  onDurationChange(loopId: string, audio: HTMLAudioElement) {
    if (!audio) return;
    const d = Number.isFinite(audio.duration) ? audio.duration : 0;
    this.durations[loopId] = d;
  }

  onCanPlay(loopId: string) {
    if (!this.waveforms[loopId]?.length) this.generateWaveform(loopId);
  }

  formatTimeSafe(val: number | undefined): string {
    if (!Number.isFinite(val || NaN) || (val as number) <= 0) return '0:00';
    const secs = Math.floor(val as number);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  async generateWaveform(loopId: string): Promise<void> {
    const loop = this.loops.find(l => l._id === loopId);
    if (!loop) return;

    const audioUrl = this.getSafeAudioUrl(loop.path);
    if (!audioUrl) return;

    const startTime = performance.now();

    const wf = await this.waveformService.getOrCreate(loopId, audioUrl);
    this.waveforms[loopId] = wf;

    const elapsed = performance.now() - startTime;
    this.loadTimes.push(elapsed);
    console.log(`[perf] waveform ${loopId} ready in ${elapsed.toFixed(2)}ms`);
  }

  trackDownload(loopId: string) {
    console.log(`Letöltve a loop: ${loopId}`);
  }

  async downloadLoop(loop: ILoop): Promise<void> {
    console.log('Starting download for loop:', loop._id);
    try {
      const isVerified = await this.authService.isUserVerified().toPromise();
      this.loopService.downloadLoop(loop._id).subscribe({
        next: (response: any) => {
          if (response && response.downloadUrl) {
            let url = response.downloadUrl;
            const idMatch = url.match(/\/files\/([a-zA-Z0-9_-]+)/) || 
                            url.match(/id=([a-zA-Z0-9_-]+)/) || 
                            url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (idMatch && idMatch[1]) {
               const fileId = idMatch[1];
               url = `https://drive.google.com/uc?export=download&id=${fileId}`;
            } else {
               if (url.includes('localhost:3000')) {
                 url = url.replace('http://localhost:3000', this.loopService.apiUrl);
                 url = url.replace('https://localhost:3000', this.loopService.apiUrl);
               }
            }
            console.log('Force download URL:', url);
            const a = document.createElement('a');
            a.href = url;
            a.target = '_self'; 
            a.download = loop.filename || `loop_${loop._id}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
          else if (response instanceof Blob) {
             const url = window.URL.createObjectURL(response);
             const a = document.createElement('a');
             a.href = url;
             a.download = loop.filename || `loop_${loop._id}`;
             document.body.appendChild(a);
             a.click();
             window.URL.revokeObjectURL(url);
             document.body.removeChild(a);
          }
        },
        error: async (err) => {
           if (err.status === 401) {
              this.showToast('Jelentkezz be a letöltéshez!', 'error');
              return;
           }

           const payload = await this.readErrorPayload(err);
           const code = payload?.code;

           if (code === 'NO_CREDITS') {
             this.showToast('Nincs elég kredited! Tölts fel loopot.', 'error');
           } else if (code === 'BANNED') {
             this.showToast('A fiókod tiltva van.', 'error');
           } else if (code === 'EMAIL_NOT_VERIFIED') {
             this.showToast('Erősítsd meg az e-mail címedet!', 'error');
           } else {
             this.showToast(payload?.message || 'A letöltés nem sikerült.', 'error');
           }
        }
      });
    } catch (err) {
      console.error('Error in download process:', err);
    }
  }


  bandHeights: { [key: string]: number[] } = {};

  getBandHeight(loopId: string, bandIndex: number): number {
    if (!this.bandHeights[loopId]) {

      this.bandHeights[loopId] = Array(16).fill(0).map(() =>
        Math.floor(Math.random() * 30) + 10
      );


      if (this.currentlyPlayingId === loopId) {
        this.animateBands(loopId);
      }
    }
    return this.bandHeights[loopId][bandIndex];
  }

  initializeWaveforms() {
    this.loops.forEach(loop => {
      this.waveforms[loop._id] = Array(100).fill(0).map(() => Math.random() * 40 + 10);
    });
  }

  animateBands(loopId: string) {
    if (this.currentlyPlayingId === loopId) {
      this.bandHeights[loopId] = this.bandHeights[loopId].map(height => {
        const change = Math.random() > 0.7 ? Math.random() * 30 : 0;
        return Math.min(100, Math.max(5, height + change));
      });


      setTimeout(() => this.animateBands(loopId), 100);
    }
  }


  private resetUploadForm(): void {
    this.selectedFile = null;
    this.fileError = '';
    this.metadata = {
      customName: '',
      bpm: null,
      key: '',
      scale: 'minor',
      instrument: '',
      tags: ''
    };
  }

  hasLiked(loopId: string): boolean {
    const userId = this.authService.getUserId();
    if (!userId) return false;

    const loop = this.loops.find(l => l._id === loopId);
    if (!loop || !loop.likedBy) return false;

    const userIdStr = userId.toString();
    return loop.likedBy.some((id: any) => id.toString() === userIdStr);
  }

  toggleLike(loop: any): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.showToast('Jelentkezz be a likeoláshoz!', 'error');
      return;
    }

    const userIdStr = userId.toString();

    if (this.hasLiked(loop._id)) {
      this.loopService.unlikeLoop(loop._id).subscribe({
        next: (response) => {
          loop.likes = response.likes;
          loop.likedBy = loop.likedBy.filter(
            (id: any) => id.toString() !== userIdStr
          );
        },
        error: (err) => {
          console.error('Unlike error:', err);
          if (err.status === 403) {
             this.showToast('Erősítsd meg az e-mail címedet vagy ellenőrizd a fiókod állapotát!', 'error');
          } else {
             this.showToast('Hiba történt a like visszavonásakor.', 'error');
          }
        }
      });
    } else {
      this.loopService.likeLoop(loop._id).subscribe({
        next: (response) => {
          loop.likes = response.likes;
          if (!loop.likedBy) loop.likedBy = [];
          loop.likedBy.push(userId);
        },
        error: (err) => {
          console.error('Like error:', err);
          if (err.status === 403 && err.error?.code === 'BANNED') {
             this.showToast('Tiltott fiókkal nem likeolhatsz.', 'error');
          } else if (err.status === 403 && err.error?.code === 'EMAIL_NOT_VERIFIED') {
             this.showToast('Erősítsd meg az e-mail címedet a likeoláshoz!', 'error');
          } else {
             this.showToast('Hiba történt a likeoláskor.', 'error');
          }
        }
      });
    }
  }

  isCheckingFavorites = false;
  favoriteStatus: { [key: string]: boolean } = {};

  isFavorite(loopId: string): boolean {
    return this.favoriteStatus[loopId] || false;
  }


  checkFavoriteStatus(loopId: string): void {
    if (!this.authService.isLoggedIn()) return;

    this.isCheckingFavorites = true;
    this.favoriteService.checkFavoriteStatus(loopId).subscribe({
      next: (response) => {
        this.favoriteStatus[loopId] = response.isFavorite;
        this.isCheckingFavorites = false;
      },
      error: (err) => {
        console.error('Error checking favorite status:', err);
        this.isCheckingFavorites = false;
      }
    });
  }

  toggleFavorite(loop: ILoop): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      alert('Please log in to add loops to favorites');
      return;
    }

    if (this.isFavorite(loop._id)) {
      this.favoriteService.removeFavorite(loop._id).subscribe({
        next: () => {
          this.favoriteStatus[loop._id] = false;
        },
        error: (err) => console.error('Error removing favorite:', err)
      });
    } else {
      this.favoriteService.addFavorite(loop._id).subscribe({
        next: () => {
          this.favoriteStatus[loop._id] = true;
        },
        error: (err) => console.error('Error adding favorite:', err)
      });
    }
  }

  openLoopReportModal(loopId: string) {
    if (!this.authService.isLoggedIn()) {
      alert('Please log in to report loops');
      return;
    }
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
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      return payload?.role === 'admin' || payload?.isAdmin === true;
    } catch {
      return false;
    }
  }

  adminDeleteLoop(loop: ILoop): void {
    if (!this.isAdmin) return;
    if (!confirm('Biztosan törlöd ezt a loopot?')) return;

    this.http.delete(`${this.loopService.apiUrl}/api/admin/loops/${loop._id}`).subscribe({
      next: () => {
        this.loops = this.loops.filter(l => l._id !== loop._id);
      },
      error: (err) => {
        console.error('Loop törlés hiba:', err);
        alert('A törlés nem sikerült.');
      }
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
    if (evt && evt.target === evt.currentTarget) {
      this.isEditModalOpen = false;
    }
  }


  saveLoopEdit() {
    if (!this.isAdmin || !this.editingLoopId) return;

    if (this.editForm.bpm !== null) {
      const bpm = Number(this.editForm.bpm);
      if (isNaN(bpm) || bpm < 40 || bpm > 600) {
        this.editError = 'A BPM értéke 40 és 600 között legyen.';
        return;
      }
    }

    const payload: any = {};
    const loop = this.loops.find(l => l._id === this.editingLoopId);
    if (loop) {
      if ('title' in loop) payload.title = this.editForm.name?.trim() || '';
      else payload.filename = this.editForm.name?.trim() || '';
    } else {
      payload.filename = this.editForm.name?.trim() || '';
    }

    if (this.editForm.bpm !== null) payload.bpm = Number(this.editForm.bpm);
    if (this.editForm.key) payload.key = this.editForm.key;
    if (this.editForm.scale) payload.scale = this.editForm.scale;
    if (this.editForm.instrument) payload.instrument = this.editForm.instrument;

    payload.tags = this.editForm.tags
      ? this.editForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    this.isSavingEdit = true;
    this.editError = null;

    this.http.patch<{ success: boolean; data?: any }>(
      `${this.loopService.apiUrl}/api/admin/loops/${this.editingLoopId}`,
      payload
    ).subscribe({
      next: () => {
        const i = this.loops.findIndex(l => l._id === this.editingLoopId);
        if (i > -1) {
          const updated = { ...this.loops[i], ...payload };
          if (payload.tags) updated.tags = payload.tags;
          this.loops[i] = updated;
        }
        this.isSavingEdit = false;
        this.isEditModalOpen = false;
      },
      error: (err) => {
        console.error('Loop mentés hiba:', err);
        this.isSavingEdit = false;
        this.editError = 'A mentés nem sikerült.';
      }
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }
  get fromIndex(): number {
    return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }
  get toIndex(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.page;
    const windowSize = 7;
    if (total <= windowSize) return Array.from({ length: total }, (_, i) => i + 1);
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + windowSize - 1);
    if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }


  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.loadLoops();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadLoops();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadLoops();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

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