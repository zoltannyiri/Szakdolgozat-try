import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

interface LoopFilters {
  minBpm?: number | null;
  maxBpm?: number | null;
  key?: string;
  scale?: string;
  instrument?: string;
  tags?: string;
  sortBy?: 'recent' | 'downloads' | 'likes';
  uploader?: string;
}

export interface UploadResponse {
  message: string;
  loop: {
    id: string;
    filename: string;
    bpm: number;
    key: string;
    scale: string;
    instrument: string;
    duration: number;
    status: 'pending' | 'approved' | 'rejected';
  }
}

export interface LoopsPagedResponse {
  success: boolean;
  items: any[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class LoopService {
  apiUrl = environment.apiUrl;
  loopService: any;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Loop feltöltése
  uploadLoop(file: File, metadata: any): Observable<any> {
    const formData = new FormData();
    formData.append('loop', file, file.name);
    const metadataJson = {
      customName: metadata.customName || '',
      bpm: Number(metadata.bpm),
      key: metadata.key,
      scale: metadata.scale,
      instrument: metadata.instrument,
      tags: metadata.tags ? metadata.tags.split(',').map((t: string) => t.trim()) : []
    };

    formData.append('metadata', JSON.stringify(metadataJson));

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(`${environment.apiUrl}/api/upload`, formData, {
      headers: headers
    }).pipe(
      catchError(error => {
        console.error('Feltöltési hiba részletei:', error);
        return throwError(() => error);
      })
    );
  }


  getLoopById(id: string): Observable<any> {

    return this.http.get(`${this.apiUrl}/api/loops/${id}`).pipe(
      catchError(error => {
        console.error('API hiba:', error);
        return throwError(() => new Error('Nem sikerült betölteni a loop-ot'));
      })
    );
  }

  getAudioUrl(path: string | undefined): string {
    if (!path) return '';

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const cleanPath = path.replace(/\\/g, '/').replace(/^\/?uploads\//, '');
    return `${this.apiUrl}/uploads/${cleanPath}`;
  }



  getLoops(filters: LoopFilters, page = 1, limit = 8): Observable<LoopsPagedResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));

    if (filters.minBpm != null) params = params.set('minBpm', String(filters.minBpm));
    if (filters.maxBpm != null) params = params.set('maxBpm', String(filters.maxBpm));
    if (filters.key) params = params.set('key', filters.key);
    if (filters.scale) params = params.set('scale', filters.scale);
    if (filters.instrument) params = params.set('instrument', filters.instrument);
    if (filters.tags) params = params.set('tags', filters.tags);
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.uploader) params = params.set('uploader', filters.uploader);

    return this.http
      .get<any>(`${this.apiUrl}/api/loops`, { params })
      .pipe(
        map(resp => Array.isArray(resp)
          ? ({ success: true, items: resp, total: resp.length, page, pageSize: limit } as LoopsPagedResponse)
          : (resp as LoopsPagedResponse)
        ),
        catchError((error) => {
          console.error('Loopok betöltési hiba:', error);
          return throwError(() => error);
        })
      );
  }

  // Loop letöltése
  downloadLoop(loopId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/loops/download/${loopId}`, {
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      },
      observe: 'response'
    }).pipe(
      tap(response => {
        console.log('Download response:', {
          status: response.status,
          headers: response.headers,
          body: response.body
        });
      }),
      map(response => response.body as Blob),
      catchError(error => {
        console.error('Download error:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        return throwError(() => error);
      })
    );
  }


  //loop likeolása
  likeLoop(loopId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/loop-detail/${loopId}/like`, {});
  }

  unlikeLoop(loopId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/loop-detail/${loopId}/unlike`, {});
  }


  getPendingLoops() {
    return this.http.get<{ success: boolean; loops: any[] }>(
      `${this.apiUrl}/api/admin/loops?status=pending`
    );
  }

  approveLoop(loopId: string) {
    return this.http.patch<{ success: boolean }>(
      `${this.apiUrl}/api/admin/loops/${loopId}/approve`, {}
    );
  }

  rejectLoop(loopId: string, reason: string) {
    return this.http.patch<{ success: boolean }>(
      `${this.apiUrl}/api/admin/loops/${loopId}/reject`,
      { reason }
    );
  }
}

