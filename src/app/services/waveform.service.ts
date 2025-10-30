// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';

// @Injectable({
//   providedIn: 'root'
// })
// export class WaveformService {
//   constructor(private http: HttpClient) {}

//   async generateWaveform(audioUrl: string): Promise<number[]> {
//     return new Array(100).fill(0).map(() => Math.random() * 100);
//   }
// }

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WaveformService {
  // cache: loopId -> waveform bars
  private cache: { [loopId: string]: number[] } = {};

  get(loopId: string): number[] | undefined {
    return this.cache[loopId];
  }

  set(loopId: string, data: number[]): void {
    this.cache[loopId] = data;
  }

  has(loopId: string): boolean {
    return !!this.cache[loopId]?.length;
  }

  /**
   * Közös waveform generátor.
   * - audioUrl: lejátszható URL (pl. már proxyzott /api/files/... vagy /uploads/...)
   * - 200 oszlop
   * - peak + RMS mix (ugyanaz mint a loop-detail-es verziódban)
   */
  async generateFromAudioUrl(audioUrl: string): Promise<number[]> {
    // letölti a hangot, feldarabolja, kiszámolja az oszlopokat
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();

    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;

    const bars = 200;
    const samplesPerBar = Math.floor(totalSamples / bars);

    const waveform: number[] = [];

    for (let i = 0; i < bars; i++) {
        const start = i * samplesPerBar;
        const end = Math.min(start + samplesPerBar, totalSamples);

        let sum = 0;
        let peak = 0;

        for (let j = start; j < end; j++) {
            const v = Math.abs(channelData[j]);
            sum += v * v; // RMS komponens
            if (v > peak) peak = v;
        }

        const rms = Math.sqrt(sum / (end - start));

        // ugyanaz a mix, mint loop-detailben
        const combinedValue = (peak * 0.7 + rms * 0.3) * 1.5;
        const scaled = Math.min(100, Math.floor(combinedValue * 150));

        waveform.push(scaled);
    }

    await audioContext.close();

    return waveform;
  }

  /**
   * High-level API:
   * - ha már kiszámoltuk (cache), visszaadjuk azt
   * - ha nincs meg, legeneráljuk URL-ből, cache-eljük és azt adjuk vissza
   * - ha bármi hiba van, stabil fallbacket adunk vissza (és azt is cache-eljük)
   */
  async getOrCreate(loopId: string, audioUrl: string): Promise<number[]> {
    // van cache?
    if (this.has(loopId)) {
      return this.get(loopId)!;
    }

    try {
      const wf = await this.generateFromAudioUrl(audioUrl);
      this.set(loopId, wf);
      return wf;
    } catch (err) {
      console.error('[WaveformService] generation failed for', loopId, err);

      // stabil (nem változó) fallback a loopId alapján, ne random minden rendernél
      const fallback: number[] = [];
      const seedBase = Array.from(loopId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      for (let i = 0; i < 200; i++) {
        const v = ((seedBase * (i + 13)) % 37) + 20; // 20..56 kb
        fallback.push(v);
      }

      this.set(loopId, fallback);
      return fallback;
    }
  }
}
