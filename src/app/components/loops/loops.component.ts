import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoopService } from '../../services/loop.service';
import { AuthService } from '../../services/auth.service';
import { ILoop } from '../../../../api/src/models/loop.model';
import { catchError, retry, throwError, timeout, timer } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { WaveformService } from '../../services/waveform.service';

@Component({
  selector: 'app-loops',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './loops.component.html',
  styleUrls: ['./loops.component.scss']
})
export class LoopsComponent implements OnInit {
  @ViewChildren('audioPlayer') audioPlayers!: QueryList<ElementRef<HTMLAudioElement>>;

  // Audio state variables
  currentlyPlayingId: string | null = null;
  waveforms: { [key: string]: number[] } = {};
  progressValues: { [key: string]: number } = {};
  currentTimes: { [key: string]: number } = {};
  durations: { [key: string]: number } = {};
  volumes: { [key: string]: number } = {};
  currentPositions: { [key: string]: number } = {};

  // UI States
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
  
  // Filters
  filters = {
    minBpm: null as number | null,
    maxBpm: null as number | null,
    key: '',
    scale: '',
    instrument: '',
    tags: '',
    sortBy: 'recent' as 'recent' | 'downloads' | 'likes'
  };
  
  // Constants
  keys = ["A", "Am", "A#", "A#m", "B", "Bm", "C", "Cm", "C#", "C#m", "D", "Dm", "D#", "D#m", "E", "Em", "F", "Fm", "F#", "F#m", "G", "Gm", "G#", "G#m"];
  scales = ["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "locrian"];
  instruments = ["Kick", "Snare", "Hihat", "Clap", "Cymbal", "Percussion", "Bass", "Synth", "Guitar", "Vocal", "FX"];

  constructor(
    private loopService: LoopService,
    private authService: AuthService,
    private waveformService: WaveformService
  ) {}

  ngOnInit(): void {
    this.loadLoops();
  }

  loadLoops(): void {
    this.isLoading = true;
    this.loopService.getLoops(this.filters).subscribe({
      next: (loops: ILoop[]) => {
        this.loops = loops;
        loops.forEach(loop => {
          this.volumes[loop._id] = 0.7;
          this.generateWaveform(loop._id);
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading loops:', err);
        this.isLoading = false;
      }
    });
  }

  getSafeAudioUrl(path: string | undefined): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    
    const cleanPath = path.replace(/\\/g, '/').replace(/^\/?uploads\//, '');
    return `${this.loopService.apiUrl}/uploads/${cleanPath}`;
  }

  searchLoops(): void {
    if (this.searchQuery.trim()) {
      this.filters.tags = this.searchQuery;
      this.loadLoops();
    }
  }

  applyAdvancedSearch(): void {
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

  seekAudio(event: MouseEvent, loopId: string, isWaveform: boolean = true): void {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const pos = (event.clientX - rect.left) / rect.width;
    const audio = document.querySelector(`#audio-${loopId}`) as HTMLAudioElement;
    
    if (audio) {
      audio.currentTime = pos * audio.duration;
      this.currentPositions[loopId] = audio.currentTime;
    }
  }

  updateProgress(loopId: string): void {
    const audio = document.querySelector(`#audio-${loopId}`) as HTMLAudioElement;
    if (!audio || isNaN(audio.duration)) return;

    this.currentTimes[loopId] = audio.currentTime;
    this.durations[loopId] = audio.duration;
    this.progressValues[loopId] = (audio.currentTime / audio.duration) * 100;
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

  onAudioPlay(loopId: string): void {
    this.currentlyPlayingId = loopId;
  }

  onAudioPause(): void {
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
      
      const validTypes = ['audio/wav', 'audio/mpeg', 'audio/aiff'];
      if (!validTypes.includes(file.type)) {
        this.fileError = "Only WAV, MP3, or AIFF files are allowed.";
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
        this.fileError = "Please select a file!";
        return;
    }

    this.isUploading = true;
    const startTime = Date.now();
    
    this.loopService.uploadLoop(this.selectedFile, this.metadata).pipe(
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
                } else {
                    this.fileError = `Network error occurred (${error.status})`;
                }
            } else if (error.name === 'TimeoutError') {
                this.fileError = 'Upload took too long. Please try again.';
            } else {
                this.fileError = 'Unknown error occurred during upload.';
            }
            
            console.error('Upload error details:', {
                status: error.status,
                message: error.message,
                duration: duration
            });
            
            return throwError(() => error);
        })
    ).subscribe({
        next: (response) => {
            this.isUploading = false;
            this.isUploadModalOpen = false;
            this.loadLoops();
        }
    });
  }

  formatTime(seconds: number | undefined): string {
    if (seconds === undefined || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  async generateWaveform(loopId: string): Promise<void> {
    let audioContext: AudioContext | null = null;
    try {
      const audioUrl = this.getSafeAudioUrl(this.loops.find(l => l._id === loopId)?.path);
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
      
      this.waveforms[loopId] = waveform;
    } catch (error) {
      console.error('Waveform generation error:', error);
      this.waveforms[loopId] = new Array(100).fill(30);
    } finally {
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
      }
    }
  }

  downloadLoop(loopId: string): void {
    if (!loopId) {
      console.warn('Invalid loop ID');
      return;
    }

    this.loopService.downloadLoop(loopId).subscribe({
      next: (blob: Blob) => {
        const filename = this.loops.find(l => l._id === loopId)?.filename || 'loop';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.loadLoops();
      },
      error: (err) => {
        console.error('Download error:', err);
      }
    });
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
}