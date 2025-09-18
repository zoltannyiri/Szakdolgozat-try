import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { upload } from '../../../api/src/middlewares/upload.middleware';

// Szűrő interfész típusdefiníció
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

@Injectable({
  providedIn: 'root'
})
export class LoopService {
  apiUrl = environment.apiUrl;
  loopService: any;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Loop feltöltése
  uploadLoop(file: File, metadata: any): Observable<any> {
    const formData = new FormData();
    
    // 1. Fájl hozzáadása
    formData.append('loop', file, file.name);
    
    // 2. Metaadatok létrehozása JSON-ként
    const metadataJson = {
      customName: metadata.customName || '',
      bpm: Number(metadata.bpm),
      key: metadata.key,
      scale: metadata.scale,
      instrument: metadata.instrument,
      tags: metadata.tags ? metadata.tags.split(',').map((t: string) => t.trim()) : []
    };

    // 3. Metaadatok hozzáadása JSON stringként
    formData.append('metadata', JSON.stringify(metadataJson));
  
    // 4. Token hozzáadása
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

// getLoopById(id: string): Observable<any> {
//     // Ellenőrizd, hogy helyes-e az URL
//     return this.http.get(`${this.apiUrl}/loops/${id}`).pipe(
//       catchError(error => {
//         console.error('API hiba:', error);
//         return throwError(() => new Error('Nem sikerült betölteni a loop-ot'));
//       })
//     );
//   }

// getLoopById(id: string): Observable<any> {
//   return this.http.get(`${this.apiUrl}/loops/${id}`).pipe(
//     catchError((error: HttpErrorResponse) => {
//       if (error.status === 404) {
//         console.error('A loop nem található:', id);
//         return throwError(() => new Error('A loop nem található az adatbázisban'));
//       }
//       console.error('API hiba:', error);
//       return throwError(() => new Error('Hiba történt a kérés feldolgozása során'));
//     })
//   );
// }

getLoopById(id: string): Observable<any> {

  return this.http.get(`${this.apiUrl}/api/loops/${id}`).pipe(
    catchError(error => {
      console.error('API hiba:', error);
      return throwError(() => new Error('Nem sikerült betölteni a loop-ot'));
    })
  );
}

  
  // getAudioUrl(path: string): string {
  //   // Ha a path relatív útvonal, akkor hozzáfűzzük az API URL-t
  //   if (path && !path.startsWith('http')) {
  //     return `${this.apiUrl}/uploads/${path.split('/').pop()}`;
  //   }
  //   return path || '';
  // }
  getAudioUrl(path: string | undefined): string {
    if (!path) return '';
    
    // Ha már teljes URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // API URL hozzáadása és elérési út tisztítása
    const cleanPath = path.replace(/\\/g, '/').replace(/^\/?uploads\//, '');
    return `${this.loopService.apiUrl}/uploads/${cleanPath}`;
  }



  // Loopok lekérése szűrőkkel
  getLoops(filters: LoopFilters): Observable<any> {
    // Query paraméterek létrehozása
    const params: any = {};
    
    // if (filters.bpm) params.bpm = filters.bpm.toString();
  if (filters.minBpm) params.minBpm = filters.minBpm.toString();
  if (filters.maxBpm) params.maxBpm = filters.maxBpm.toString();
    if (filters.key) params.key = filters.key;
    if (filters.scale) params.scale = filters.scale;
    if (filters.instrument) params.instrument = filters.instrument;
    if (filters.tags) params.tags = filters.tags;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.uploader) params.uploader = filters.uploader;

    // console.log('Request params:', params);

    return this.http.get(`${this.apiUrl}/api/loops`, { params })
      .pipe(
        catchError(error => {
          console.error('Loopok betöltési hiba:', error);
          throw error;
        })
      );
  }

  // Loop letöltése
  downloadLoop(loopId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/api/loops/download/${loopId}`, {
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${this.authService.getToken()}`
      },
      observe: 'response'
    }).pipe(
      tap(response => {
        console.log('Download response:', { // [12]
          status: response.status,
          headers: response.headers,
          body: response.body
        });
      }),
      map(response => response.body as Blob),
      catchError(error => {
        console.error('Download error:', { // [13]
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
}

