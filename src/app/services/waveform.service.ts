import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WaveformService {
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

  async generateFromAudioUrl(audioUrl: string): Promise<number[]> {
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
            sum += v * v;
            if (v > peak) peak = v;
        }

        const rms = Math.sqrt(sum / (end - start));
        const combinedValue = (peak * 0.7 + rms * 0.3) * 1.5;
        const scaled = Math.min(100, Math.floor(combinedValue * 150));

        waveform.push(scaled);
    }

    await audioContext.close();

    return waveform;
  }

  async getOrCreate(loopId: string, audioUrl: string): Promise<number[]> {
    if (this.has(loopId)) {
      return this.get(loopId)!;
    }

    try {
      const wf = await this.generateFromAudioUrl(audioUrl);
      this.set(loopId, wf);
      return wf;
    } catch (err) {
      console.error('[WaveformService] generation failed for', loopId, err);

      const fallback: number[] = [];
      const seedBase = Array.from(loopId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      for (let i = 0; i < 200; i++) {
        const v = ((seedBase * (i + 13)) % 37) + 20;
        fallback.push(v);
      }

      this.set(loopId, fallback);
      return fallback;
    }
  }
}
