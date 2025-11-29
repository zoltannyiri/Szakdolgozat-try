import { CommonModule } from '@angular/common';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LoopService } from '../../services/loop.service';
import { AuthService } from '../../services/auth.service';
import { CommentService } from '../../services/comment.service';
import { Location } from '@angular/common';
import { UserService } from '../../services/user.service';
import { FavoriteService } from '../../services/favorite.service';
import { ILoop } from '../../../../api/src/models/loop.model';
import { ReportsService } from '../../services/reports.service';
import { HttpClient } from '@angular/common/http';
import { WaveformService } from '../../services/waveform.service';


@Component({
  selector: 'app-loop-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './loop-detail.component.html',
  styleUrls: ['./loop-detail.component.scss']
})
export class LoopDetailComponent implements OnInit {
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
  toast = { text: '', variant: 'default' as 'success' | 'error' | 'default', timer: 0 as any };
  loop: any = {
    uploader: {
      _id: '',
      username: 'Ismeretlen',
      profileImage: ''
    }
  };
  comments: any[] = [];
  newComment: string = '';
  isLoggedIn: boolean = false;
  isLoading: boolean = false;
  isAddingComment: boolean = false;
  errorMessage: string = '';


  isReportModalOpen = false;
  reportTargetCommentId: string | null = null;
  reportReason = '';
  isReporting = false;
  reportError = '';
  reportSuccess = '';


  isPlaying = false;
  currentTime = 0;
  duration = 0;
  volume = 0.7;
  waveform: number[] = [];

  get progress(): number {
    if (!this.duration) return 0;
    const value = (this.currentTime / this.duration) * 100;
    return Math.max(0, Math.min(100, value));
  }

  get playedBars(): number {
    if (!this.waveform?.length || !this.duration) return 0;
    const ratio = this.currentTime / this.duration;
    return Math.floor(ratio * this.waveform.length);
  }

  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toast.text = message;
    this.toast.variant = type;
    if (this.toast.timer) clearTimeout(this.toast.timer);
    this.toast.timer = setTimeout(() => {
      this.toast.text = '';
    }, 3000);
  }



  isLoopReportOpen = false;
  loopReportReason = '';
  isReportingLoop = false;
  loopReportError = '';
  loopReportSuccess = '';


  isAdmin = false;
  isEditModalOpen = false;
  isSavingEdit = false;
  editError: string | null = null;
  isDeletingCommentId: string | null = null;


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

  // const
  keys = ["A", "Am", "A#", "A#m", "B", "Bm", "C", "Cm", "C#", "C#m", "D", "Dm", "D#", "D#m", "E", "Em", "F", "Fm", "F#", "F#m", "G", "Gm", "G#", "G#m"];
  scales = ["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "locrian"];
  instruments = ["Kick", "Snare", "Hihat", "Clap", "Cymbal", "Percussion", "Bass", "Synth", "Guitar", "Vocal", "FX"];

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private loopService: LoopService,
    private commentService: CommentService,
    private userService: UserService,
    public authService: AuthService,
    private favoriteService: FavoriteService,
    private reportsSvc: ReportsService,
    private http: HttpClient,
    private waveformService: WaveformService
  ) { }

  ngOnInit(): void {
    this.checkAuthStatus();
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
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadLoop(id);
        this.checkFavoriteStatus(id);
      }
    });
  }

  checkAuthStatus(): void {
    this.authService.isAuthenticated().subscribe({
      next: (isAuthenticated) => {
        this.isLoggedIn = isAuthenticated;
      },
      error: (err) => {
        console.error('Hitelesítés ellenőrzése sikertelen:', err);
        this.isLoggedIn = false;
      }
    });
  }

  handleLogin(): void {
    const currentRoute = this.route.snapshot.url.join('/');
    this.authService.login(currentRoute).subscribe({
      next: (success) => {
        if (success) {
          this.checkAuthStatus();
        }
      },
      error: (err) => {
        console.error('Bejelentkezési hiba:', err);
        this.errorMessage = 'Bejelentkezés sikertelen';
      }
    });
  }

  goBack(): void {
    this.location.back();
  }


  loadLoop(id: string): void {
    this.isLoading = true;
    this.loopService.getLoopById(id).subscribe({
      next: (loop) => {
        console.log('Loop response:', loop);
        this.loop = loop;


        if (typeof this.loop.uploader === 'string') {
          this.userService.getUserById(this.loop.uploader).subscribe({
            next: (user) => {
              this.loop.uploader = user || { username: 'Ismeretlen' };
              this.loadComments();
              this.generateWaveform();
              this.checkFavoriteStatus(loop._id);
              this.isLoading = false;
            },
            error: () => {
              this.loop.uploader = { username: 'Ismeretlen' };
              this.loadComments();
              this.generateWaveform();
              this.checkFavoriteStatus(loop._id);
              this.isLoading = false;
            }
          });
        }
        else if (!this.loop.uploader?.username) {
          this.loop.uploader = this.loop.uploader || { username: 'Ismeretlen' };
          this.loadComments();
          this.generateWaveform();
          this.isLoading = false;
        }
        else {
          this.loadComments();
          this.generateWaveform();
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Hiba a loop betöltésekor:', err);
        this.isLoading = false;
        this.errorMessage = 'Nem sikerült betölteni a loop-ot';
      }
    });
  }


  fetchUserDetails(userId: string): void {
    this.userService.getUserById(userId).subscribe({
      next: (user: any) => {
        this.loop.user = user || {
          _id: '',
          username: 'Ismeretlen',
          profileImage: ''
        };
        this.loadComments();
        this.generateWaveform();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Hiba a felhasználó betöltésekor:', err);
        this.loop.user = {
          _id: '',
          username: 'Ismeretlen',
          profileImage: ''
        };
        this.loadComments();
        this.generateWaveform();
        this.isLoading = false;
      }
    });
  }


  loadComments(): void {
    if (!this.loop?._id) return;

    this.commentService.getCommentsForLoop(this.loop._id).subscribe({
      next: (response: any) => {
        this.comments = Array.isArray(response?.data) ? response.data : [];
      },
      error: (err) => {
        console.error('Kommentek betöltése sikertelen:', err);
        this.comments = [];
        this.errorMessage = 'Hiba a kommentek betöltésekor';
      }
    });
  }

  addComment(): void {
    if (!this.newComment.trim() || this.newComment.length > 500 || !this.loop?._id) {
      this.showToast('Érvénytelen komment.', 'error');
      return;
    }
    this.isAddingComment = true;

    this.commentService.addComment(this.loop._id, this.newComment).subscribe({
      next: (newComment) => {
        this.comments.unshift(newComment);
        this.newComment = '';
        this.isAddingComment = false;
      },
      error: (err) => {
        this.isAddingComment = false;
        console.error('Hiba:', err);
        if (err.status === 401) {
          this.showToast('Jelentkezz be a kommenteléshez!', 'error');
        } else if (err.status === 403 && err.error?.code === 'BANNED') {
          this.showToast('Tiltott fiókkal nem kommentelhetsz.', 'error');
        } else if (err.status === 403 && err.error?.code === 'EMAIL_NOT_VERIFIED') {
          this.showToast('Erősítsd meg az e-mail címedet a kommenteléshez!', 'error');
        } else {
          this.showToast('Hiba a komment elküldésekor.', 'error');
        }
      }
    });
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${this.loopService.apiUrl}${clean}`;
  }

  private getErrorMessage(error: any): string {
    if (error.status === 404) {
      return 'A kommentelési funkció jelenleg nem elérhető';
    }
    if (error.status === 401) {
      return 'Be kell jelentkezned a kommenteléshez';
    }
    return 'Hiba történt a komment hozzáadásakor';
  }

  getAudioUrl(path: string | undefined): string {
    if (!path) return '';

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const cleanPath = path.replace(/\\/g, '/').replace(/^\/?uploads\//, '');
    return `${this.loopService.apiUrl}/uploads/${cleanPath}`;
  }


  togglePlay(): void {
    const audio = this.audioPlayer.nativeElement;

    if (audio.paused) {
      audio.play()
        .then(() => {
          this.isPlaying = true;
          audio.volume = this.volume;
        })
        .catch(err => {
          console.error('Playback error:', err);
          this.isPlaying = false;
        });
    } else {
      audio.pause();
      this.isPlaying = false;
    }
  }

  onAudioPlay(): void {
    this.isPlaying = true;
  }

  onAudioPause(): void {
    this.isPlaying = false;
  }

  onAudioError(audioElement: HTMLAudioElement): void {
    console.error('Playback error:', audioElement.error);
    console.error('File path:', audioElement.src);
    this.isPlaying = false;
  }

  updateProgress(): void {
    const audio = this.audioPlayer.nativeElement;
    this.currentTime = audio.currentTime;
    this.duration = audio.duration || 0;
  }

  seekAudio(event: MouseEvent, isWaveform: boolean): void {
    const audio = this.audioPlayer.nativeElement;
    if (!audio) return;

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const percentClicked = (clickPosition / rect.width) * 100;

    const newTime = (percentClicked / 100) * audio.duration;
    audio.currentTime = newTime;

    this.currentTime = newTime;
  }

  setVolume(): void {
    const audio = this.audioPlayer.nativeElement;
    if (audio) {
      audio.volume = this.volume;
    }
  }

  formatTime(seconds: number | undefined): string {
    if (seconds === undefined || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  async generateWaveform(): Promise<void> {
    if (!this.loop?._id || !this.loop?.path) return;

    const audioUrl = this.getAudioUrl(this.loop.path);
    if (!audioUrl) return;

    this.waveform = await this.waveformService.getOrCreate(this.loop._id, audioUrl);
  }

  private readErrorPayload(err: any): Promise<any> {
    if (err?.error instanceof Blob) {
      return err.error.text().then((t: string) => {
        try { return JSON.parse(t || '{}'); } catch { return {}; }
      });
    }
    return Promise.resolve(err?.error || {});
  }

  async downloadLoop(): Promise<void> {
    if (!this.loop?._id) return;

    console.log('Starting download for loop:', this.loop._id);

    try {
      const isVerified = await this.authService.isUserVerified().toPromise();
      console.log('User verified status:', isVerified);

      this.loopService.downloadLoop(this.loop._id).subscribe({
        next: (blob: Blob) => {
          console.log('Received blob:', { size: blob.size, type: blob.type });

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.loop.filename || `loop_${this.loop._id}.wav`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          console.log('Download completed successfully');
        },
        error: async (err) => {
          console.error('Download failed:', {
            error: err,
            loopId: this.loop?._id,
            path: this.loop?.path
          });

          if (err?.status === 401) {
            this.handleLogin();
            this.showToast('Jelentkezz be a letöltéshez!', 'error');
            return;
          }

          const payload = await this.readErrorPayload(err);
          const code = payload?.code;

          if (code === 'BANNED') {
            this.showToast('A fiókod tiltva van, a letöltés nem engedélyezett.', 'error');
          } else if (code === 'NO_CREDITS') {
            this.showToast('Nincs elég kredited! Tölts fel loopot.', 'error');
          } else if (code === 'EMAIL_NOT_VERIFIED') {
            this.showToast('Erősítsd meg az e-mail címedet!', 'error');
          } else {
            this.showToast(payload?.message || 'A letöltés nem sikerült.', 'error');
          }
        }
      });
    } catch (e) {
      console.error('Error in download process:', e);
    }
  }


  hasLiked(): boolean {
    const userId = this.authService.getUserId();
    if (!userId || !this.loop?.likedBy) return false;

    const userIdStr = userId.toString();
    return this.loop.likedBy.some((id: any) => id.toString() === userIdStr);
  }

  toggleLike(): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.showToast('Jelentkezz be a likeoláshoz!', 'error');
      this.handleLogin();
      return;
    }

    if (this.hasLiked()) {
      this.loopService.unlikeLoop(this.loop._id).subscribe({
        next: (response) => {
          this.loop.likes = response.likes;
          this.loop.likedBy = this.loop.likedBy.filter(
            (id: any) => id.toString() !== userId.toString()
          );
        },
        error: (err) => {
          console.error('Unlike error:', err);
          if (err.status === 403) {
            this.showToast('Művelet megtagadva.', 'error');
          } else {
            this.showToast('Hiba történt a like visszavonásakor.', 'error');
          }
        }
      });
    } else {
      this.loopService.likeLoop(this.loop._id).subscribe({
        next: (response) => {
          this.loop.likes = response.likes;
          if (!this.loop.likedBy) this.loop.likedBy = [];
          this.loop.likedBy.push(userId);
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

  favoriteLoops: ILoop[] = [];

  toggleFavorite(loop: ILoop): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.handleLogin();
      return;
    }

    if (this.isFavorite(loop._id)) {
      this.favoriteService.removeFavorite(loop._id).subscribe({
        next: () => {
          this.favoriteStatus[loop._id] = false;

          if (this.favoriteLoops) {
            this.favoriteLoops = this.favoriteLoops.filter(l => l._id !== loop._id);
          }
        },
        error: (err) => console.error('Error removing favorite:', err)
      });
    } else {
      this.favoriteService.addFavorite(loop._id).subscribe({
        next: () => {
          this.favoriteStatus[loop._id] = true;

          if (this.favoriteLoops && this.loop) {
            this.favoriteLoops.unshift(this.loop);
          }
        },
        error: (err) => console.error('Error adding favorite:', err)
      });
    }
  }

  openLoopReportModal() {
    if (!this.isLoggedIn) { this.handleLogin(); return; }
    this.loopReportReason = '';
    this.loopReportError = '';
    this.loopReportSuccess = '';
    this.isLoopReportOpen = true;
  }

  closeLoopReportModal(evt?: Event) {
    if (!evt) { this.isLoopReportOpen = false; return; }
    const el = evt.target as HTMLElement;
    if (el.classList.contains('bg-black') || el.classList.contains('bg-black/50')) {
      this.isLoopReportOpen = false;
    }
  }

  openReportModal(commentId: string) {
    if (!this.isLoggedIn) { this.handleLogin(); return; }
    this.reportTargetCommentId = commentId;
    this.reportReason = '';
    this.reportError = '';
    this.reportSuccess = '';
    this.isReportModalOpen = true;
  }

  closeReportModal(event?: Event) {
    if (event && (event.target as HTMLElement).classList.contains('bg-black/50')) {
      this.isReportModalOpen = false;
    }
  }

  submitReport() {
    if (!this.reportTargetCommentId || !this.reportReason.trim()) return;
    this.isReporting = true;
    this.reportError = '';
    this.reportSuccess = '';

    this.commentService.reportComment(this.reportTargetCommentId, this.reportReason.trim()).subscribe({
      next: () => {
        this.isReporting = false;
        this.reportSuccess = 'Köszönjük! A jelentést megkaptuk.';
        setTimeout(() => { this.isReportModalOpen = false; }, 900);
      },
      error: (err) => {
        console.error('[report] error:', err);
        this.isReporting = false;
        this.reportError = err?.error?.message || 'Hiba történt a jelentés beküldésekor.';
      }
    });

  }

  submitLoopReport() {
    if (!this.loop?._id || !this.loopReportReason.trim()) return;
    this.isReportingLoop = true;
    this.loopReportError = '';
    this.loopReportSuccess = '';

    this.reportsSvc.reportLoop(this.loop._id, this.loopReportReason.trim()).subscribe({
      next: () => {
        this.isReportingLoop = false;
        this.loopReportSuccess = 'Köszönjük! A jelentést megkaptuk.';
      },
      error: (err) => {
        console.error('[loop-detail loop report] error:', err);
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

  adminDeleteLoop(): void {
    if (!this.isAdmin || !this.loop?._id) return;
    if (!confirm('Biztosan törlöd ezt a loopot?')) return;

    this.http.delete(`${this.loopService.apiUrl}/api/admin/loops/${this.loop._id}`).subscribe({
      next: () => {
        this.location.back();
      },
      error: (err) => {
        console.error('Loop törlés hiba:', err);
        alert('A törlés nem sikerült.');
      }
    });
  }



  adminDeleteComment(commentId: string): void {
    if (!this.isAdmin || !commentId) return;
    if (!confirm('Biztosan törlöd ezt a kommentet?')) return;

    this.isDeletingCommentId = commentId;

    this.http
      .delete(`${this.loopService.apiUrl}/api/admin/comments/${commentId}`)
      .subscribe({
        next: () => {
          this.comments = this.comments.filter(c => c._id !== commentId);
          this.isDeletingCommentId = null;
        },
        error: (err) => {
          console.error('Komment törlés hiba:', err);
          this.isDeletingCommentId = null;
          alert(err?.error?.message || 'A komment törlése nem sikerült.');
        }
      });
  }


  openEditModal(): void {
    console.log('[loop-detail] openEditModal clicked');
    this.editError = null;
    this.isEditModalOpen = true;

    this.editForm = {
      name: (this.loop.title ?? this.loop.customName ?? this.loop.filename ?? ''),
      bpm: typeof this.loop.bpm === 'number' ? this.loop.bpm : null,
      key: this.loop.key ?? '',
      scale: this.loop.scale ?? '',
      instrument: this.loop.instrument ?? '',
      tags: Array.isArray(this.loop.tags) ? this.loop.tags.join(', ') : (this.loop.tags || '')
    };
  }

  closeEditModal(evt?: Event) {
    if (!evt || evt.target === evt.currentTarget) {
      this.isEditModalOpen = false;
    }
  }


  saveLoopEdit(): void {
    if (!this.isAdmin || !this.loop?._id) return;

    if (this.editForm.bpm !== null) {
      const bpm = Number(this.editForm.bpm);
      if (isNaN(bpm) || bpm < 40 || bpm > 600) {
        this.editError = 'A BPM értéke 40 és 600 között legyen.';
        return;
      }
    }

    const payload: any = {};

    if ('title' in this.loop) payload.title = (this.editForm.name || '').trim();
    else payload.filename = (this.editForm.name || '').trim();

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
      `${this.loopService.apiUrl}/api/admin/loops/${this.loop._id}`,
      payload
    ).subscribe({
      next: (res) => {

        this.loop = res?.data ? res.data : { ...this.loop, ...payload };
        if (!res?.data && payload.tags) this.loop.tags = payload.tags;

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
}