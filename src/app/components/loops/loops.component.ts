import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoopService } from '../../services/loop.service';
import { AuthService } from '../../services/auth.service';
import { ILoop } from '../../../../api/src/models/loop.model'; // Import your Loop interface/model
import { catchError, retry, throwError, timeout, timer } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-loops',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loops.component.html',
  styleUrls: ['./loops.component.scss']
})
export class LoopsComponent implements OnInit {
  // UI States
  isAdvancedSearchOpen = false;
  isUploadModalOpen = false;
  isLoading = false;
  isUploading = false;
  
  // Search
  searchQuery = '';
  loops: ILoop[] = []; // Use proper type instead of any[]
  
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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadLoops();
  }

  loadLoops(): void {
    this.isLoading = true;
    this.loopService.getLoops(this.filters).subscribe({
      next: (loops: ILoop[]) => {
        this.loops = loops;
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
    return this.loopService.apiUrl ? 
      `${this.loopService.apiUrl}/${path.replace(/\\/g, '/')}` : 
      '';
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
      
      // Validate file type
      const validTypes = ['audio/wav', 'audio/mpeg', 'audio/aiff'];
      if (!validTypes.includes(file.type)) {
        this.fileError = "Only WAV, MP3, or AIFF files are allowed.";
        this.selectedFile = null;
        return;
      }

      // Validate file size
      if (file.size > 20 * 1024 * 1024) {
        this.fileError = "File size must be under 20MB.";
        this.selectedFile = null;
        return;
      }

      this.fileError = "";
      this.selectedFile = file;
    }
  }

  // uploadFile(): void {
  //   if (!this.selectedFile) {
  //     this.fileError = "Válassz ki egy fájlt!";
  //     return;
  //   }
    
  //   if (!this.metadata.bpm || !this.metadata.key || !this.metadata.instrument) {
  //     this.fileError = "Töltsd ki az összes kötelező mezőt!";
  //     return;
  //   }
  
  //   this.isUploading = true;
    
  //   this.loopService.uploadLoop(this.selectedFile, this.metadata).subscribe({
  //     next: (response) => {
  //       console.log('Sikeres feltöltés:', response);
  //       this.isUploading = false;
  //       this.isUploadModalOpen = false;
  //       this.loadLoops();
  //     },
  //     error: (err) => {
  //       console.error('Feltöltési hiba:', err);
  //       this.isUploading = false;
        
  //       if (err.status === 400) {
  //         this.fileError = 'Érvénytelen kérés. Ellenőrizd a megadott adatokat!';
  //       } else {
  //         this.fileError = 'Hiba történt a feltöltés során. Próbáld újra később.';
  //       }
  //     }
  //   });
  // }

  uploadFile(): void {
    if (!this.selectedFile) {
        this.fileError = "Válassz ki egy fájlt!";
        return;
    }

    this.isUploading = true;
    const startTime = Date.now();
    
    this.loopService.uploadLoop(this.selectedFile, this.metadata).pipe(
        retry({
            count: 3,
            delay: error => {
                console.error('Feltöltési hiba:', error);
                return timer(1000); // 1 másodperc várakozás
            }
        }),
        timeout(30000), // 30 másodperc időtúllépés
        catchError(error => {
            this.isUploading = false;
            const duration = (Date.now() - startTime) / 1000;
            
            if (error instanceof HttpErrorResponse) {
                if (error.status === 500) {
                    this.fileError = `Szerverhiba történt a feltöltés során (${duration.toFixed(1)} másodperc után).
                    Kérlek, próbáld újra később.`;
                } else if (error.status === 413) {
                    this.fileError = 'A fájl túl nagy a szerver számára.';
                } else {
                    this.fileError = `Hálózati hiba történt (${error.status})`;
                }
            } else if (error.name === 'TimeoutError') {
                this.fileError = 'A feltöltés túl sokáig tartott. Kérlek, próbáld újra.';
            } else {
                this.fileError = 'Ismeretlen hiba történt a feltöltés során.';
            }
            
            console.error('Feltöltési hiba részletei:', {
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

downloadLoop(loopId: string): void {
  if (!loopId) {
    console.warn('Érvénytelen loop ID');
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
      console.error('Letöltési hiba:', err);
    }
  });
}

  getAudioUrl(path: string): string {
    return `${this.loopService.apiUrl}/${path.replace(/\\/g, '/')}`;
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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