import { CommonModule } from '@angular/common';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LoopService } from '../../services/loop.service';
import { AuthService } from '../../services/auth.service';
import { CommentService } from '../../services/comment.service';
import { Location } from '@angular/common';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-loop-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './loop-detail.component.html',
  styleUrl: './loop-detail.component.scss'
})
export class LoopDetailComponent implements OnInit {
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

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

  // Audio player state
  isPlaying = false;
  progress = 0;
  currentTime = 0;
  duration = 0;
  volume = 0.7;
  waveform: number[] = [];

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private loopService: LoopService,
    private commentService: CommentService,
    private userService: UserService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadLoop(id);
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

  // A loadLoop metódus módosítása
  loadLoop(id: string): void {
    this.isLoading = true;
    this.loopService.getLoopById(id).subscribe({
      next: (loop) => {
        console.log('Loop response:', loop); // Debug log
        this.loop = loop;
        
        // Ha az uploader stringként van (ID)
        if (typeof this.loop.uploader === 'string') {
          this.userService.getUserById(this.loop.uploader).subscribe({
            next: (user) => {
              this.loop.uploader = user || { username: 'Ismeretlen' };
              this.loadComments();
              this.generateWaveform();
              this.isLoading = false;
            },
            error: () => {
              this.loop.uploader = { username: 'Ismeretlen' };
              this.loadComments();
              this.generateWaveform();
              this.isLoading = false;
            }
          });
        }
        // Ha az uploader objektum, de nincs username
        else if (!this.loop.uploader?.username) {
          this.loop.uploader = this.loop.uploader || { username: 'Ismeretlen' };
          this.loadComments();
          this.generateWaveform();
          this.isLoading = false;
        }
        // Minden rendben
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

  // ... rest of the methods remain the same ...
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
      this.errorMessage = 'Érvénytelen komment';
      return;
    }
  
    this.isAddingComment = true;
    this.errorMessage = '';
  
    this.commentService.addComment(this.loop._id, this.newComment).subscribe({
      next: (newComment) => {
        this.comments.unshift(newComment);
        this.newComment = '';
        this.isAddingComment = false;
      },
      error: (err) => {
        console.error('Hiba:', err);
        this.errorMessage = this.getErrorMessage(err);
        this.isAddingComment = false;
      }
    });
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

  // Audio player methods
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
    this.progress = (this.currentTime / this.duration) * 100 || 0;
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
    this.progress = percentClicked;
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
    if (!this.loop?.path) return;
    
    let audioContext: AudioContext | null = null;
    try {
      const audioUrl = this.getAudioUrl(this.loop.path);
      if (!audioUrl) return;

      audioContext = new AudioContext();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const samplesPerPixel = Math.floor(channelData.length / 100);
      const waveform = [];
      
      for (let i = 0; i < 100; i++) {
        let sum = 0;
        const start = i * samplesPerPixel;
        const end = Math.min(start + samplesPerPixel, channelData.length);
        
        for (let j = start; j < end; j++) {
          sum += Math.abs(channelData[j]);
        }
        
        const avg = sum / (end - start);
        waveform.push(Math.min(100, Math.floor(avg * 200)));
      }
      
      this.waveform = waveform;
    } catch (error) {
      console.error('Waveform generation error:', error);
      this.waveform = new Array(100).fill(30);
    } finally {
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
      }
    }
  }

  async downloadLoop(): Promise<void> {
    if (!this.loop?.path) return;
    
    try {
      const response = await fetch(this.getAudioUrl(this.loop.path));
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = this.loop.filename || `loop_${this.loop._id}.wav`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Letöltési hiba:', err);
      window.open(this.getAudioUrl(this.loop.path), '_blank');
    }
  }


  //likeolás
  // A komponens osztályhoz új metódusok
hasLiked(): boolean {
  const userId = this.authService.getUserId();
  if (!userId || !this.loop?.likedBy) return false;
  
  const userIdStr = userId.toString();
  return this.loop.likedBy.some((id: any) => id.toString() === userIdStr);
}

toggleLike(): void {
  const userId = this.authService.getUserId();
  if (!userId) {
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
        this.errorMessage = 'Hiba történt a like visszavonásakor';
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
        this.errorMessage = 'Hiba történt a likeoláskor';
      }
    });
  }
}
}