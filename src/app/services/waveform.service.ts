import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class WaveformService {
  constructor(private http: HttpClient) {}

  async generateWaveform(audioUrl: string): Promise<number[]> {
    return new Array(100).fill(0).map(() => Math.random() * 100);
  }
}