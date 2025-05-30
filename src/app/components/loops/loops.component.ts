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
import { FavoriteService } from '../../services/favorite.service';
import mongoose from 'mongoose';

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
    private waveformService: WaveformService,
    private favoriteService: FavoriteService
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
          this.checkFavoriteStatus(loop._id);
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
  
  // Ha már teljes URL, akkor visszaadjuk azt
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Egyébként összeállítjuk a teljes URL-t
  return `${this.loopService.apiUrl}/${path.replace(/^\/?uploads\//, 'uploads/')}`;
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

  seekAudio(event: MouseEvent, loopId: string, isWaveform: boolean) {
    const audioElement = document.getElementById(`audio-${loopId}`) as HTMLAudioElement;
    if (!audioElement) return;
  
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const percentClicked = (clickPosition / rect.width) * 100;
    
    // Calculate new time
    const newTime = (percentClicked / 100) * audioElement.duration;
    audioElement.currentTime = newTime;
    
    // Update progress immediately
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
  
    // Double-check verification status
  this.authService.isUserVerified().subscribe({
    next: (isVerified) => {
      if (!isVerified) {
        this.fileError = "You need to verify your email before uploading";
        return;
      }
      
      // Proceed with upload if verified
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
  //commented at 04. 27
  // uploadFile(): void {
  //   if (!this.selectedFile) {
  //       this.fileError = "Please select a file!";
  //       return;
  //   }

  //   this.isUploading = true;
  //   const startTime = Date.now();
    
  //   this.loopService.uploadLoop(this.selectedFile, this.metadata).pipe(
  //       retry({
  //           count: 3,
  //           delay: error => {
  //               console.error('Upload error:', error);
  //               return timer(1000);
  //           }
  //       }),
  //       timeout(30000),
  //       catchError(error => {
  //           this.isUploading = false;
  //           const duration = (Date.now() - startTime) / 1000;
            
  //           if (error instanceof HttpErrorResponse) {
  //               if (error.status === 500) {
  //                   this.fileError = `Server error occurred during upload (after ${duration.toFixed(1)} seconds). Please try again later.`;
  //               } else if (error.status === 413) {
  //                   this.fileError = 'The file is too large for the server.';
  //               } else {
  //                   this.fileError = `Network error occurred (${error.status})`;
  //               }
  //           } else if (error.name === 'TimeoutError') {
  //               this.fileError = 'Upload took too long. Please try again.';
  //           } else {
  //               this.fileError = 'Unknown error occurred during upload.';
  //           }
            
  //           console.error('Upload error details:', {
  //               status: error.status,
  //               message: error.message,
  //               duration: duration
  //           });
            
  //           return throwError(() => error);
  //       })
  //   ).subscribe({
  //       next: (response) => {
  //           this.isUploading = false;
  //           this.isUploadModalOpen = false;
  //           this.loadLoops();
  //       }
  //   });
  // }

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

  trackDownload(loopId: string) {
    console.log(`Letöltve a loop: ${loopId}`);
    // this.loopService.recordDownload(loopId).subscribe();
  }

  

  // loops.component.ts
  async downloadLoop(loop: ILoop): Promise<void> {
    console.log('Starting download for loop:', loop._id); // [14]
    
    try {
      const isVerified = await this.authService.isUserVerified().toPromise();
      console.log('User verified status:', isVerified); // [15]
  
      this.loopService.downloadLoop(loop._id).subscribe({
        next: (blob: Blob) => {
          console.log('Received blob:', { // [16]
            size: blob.size,
            type: blob.type
          });
          
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = loop.filename || `loop_${loop._id}.wav`;
          document.body.appendChild(a);
          a.click();
          
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          console.log('Download completed successfully'); // [17]
        },
        error: (err) => {
          console.error('Download failed:', { // [18]
            error: err,
            loopId: loop._id,
            path: loop.path
          });
          alert('You need to authenticate your email.');
          // window.open(this.getSafeAudioUrl(loop.path), '_blank');
        }
      });
    } catch (err) {
      console.error('Error in download process:', err); // [19]
    }
  }
  // async downloadLoop(loop: ILoop): Promise<void> {
  //   try {
  //     // 1. Fetch the file
  //     const response = await fetch(this.getSafeAudioUrl(loop.path));
  //     const blob = await response.blob();
      
  //     // 2. Create download link
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.style.display = 'none';
  //     a.href = url;
  //     a.download = loop.filename || `loop_${loop._id}.wav`;
      
  //     // 3. Trigger download
  //     document.body.appendChild(a);
  //     a.click();
      
  //     // 4. Cleanup
  //     window.URL.revokeObjectURL(url);
  //     document.body.removeChild(a);
      
  //     // 5. Track download
  //     this.trackDownload(loop._id);
  //   } catch (err) {
  //     console.error('Letöltési hiba:', err);
  //     // Fallback: új lapon megnyitás
  //     window.open(this.getSafeAudioUrl(loop.path), '_blank');
  //   }
  // }

  // Add this with your other component properties
  bandHeights: { [key: string]: number[] } = {};
  // Add this method to your component class
getBandHeight(loopId: string, bandIndex: number): number {
  if (!this.bandHeights[loopId]) {
    // Initialize random heights for each band (16 bands)
    this.bandHeights[loopId] = Array(16).fill(0).map(() => 
      Math.floor(Math.random() * 30) + 10 // Random between 10-40%
    );
    
    // If audio is playing this loop, animate the bands
    if (this.currentlyPlayingId === loopId) {
      this.animateBands(loopId);
    }
  }
  return this.bandHeights[loopId][bandIndex];
}

initializeWaveforms() {
  this.loops.forEach(loop => {
    // Generate random waveform data (replace with actual waveform data if available)
    this.waveforms[loop._id] = Array(100).fill(0).map(() => Math.random() * 40 + 10);
  });
}

animateBands(loopId: string) {
  if (this.currentlyPlayingId === loopId) {
    this.bandHeights[loopId] = this.bandHeights[loopId].map(height => {
      // Random fluctuation for animation effect
      const change = Math.random() > 0.7 ? Math.random() * 30 : 0;
      return Math.min(100, Math.max(5, height + change));
    });
    
    // Continue animation if still playing
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


  //likeolás
  // Komponens osztályhoz új metódusok
  hasLiked(loopId: string): boolean {
    const userId = this.authService.getUserId();
    if (!userId) return false;
    
    const loop = this.loops.find(l => l._id === loopId);
    if (!loop || !loop.likedBy) return false;
  
    // Konvertáljuk a userId-t string-re és hasonlítsuk össze
    const userIdStr = userId.toString();
    return loop.likedBy.some((id: any) => id.toString() === userIdStr);
  }

  toggleLike(loop: any): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      alert('Please log in to like loops');
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
        error: (err) => console.error('Unlike error:', err)
      });
    } else {
      this.loopService.likeLoop(loop._id).subscribe({
        next: (response) => {
          loop.likes = response.likes;
          if (!loop.likedBy) loop.likedBy = [];
          loop.likedBy.push(userId);
        },
        error: (err) => console.error('Like error:', err)
      });
    }
  }


  //favorite
  isCheckingFavorites = false;
  favoriteStatus: { [key: string]: boolean } = {};

  // A komponens osztályhoz új metódusok
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

}