export interface AudioSegment {
  start: number; // seconds
  end: number;   // seconds
  duration: number; // seconds
}

export interface ProcessingSettings {
  thresholdDb: number;
  minSilenceDuration: number; // seconds
  padding: number; // seconds
  minClipDuration: number; // seconds, bundan kısa ses patlamaları (tık, çıt) atlanır
}

export interface VideoResolution {
  width: number;
  height: number;
  label?: string;
}

export interface MediaInfo extends VideoResolution {
  duration?: number; // seconds
  fps?: number; // sadece MP4/MOV'dan okunabilir
}

export interface AudioAnalysis {
  segments: AudioSegment[]; // The "Keep" segments
  duration: number; // seconds
  channelCount: number;
}

export enum ProcessingStatus {
  IDLE,
  EXTRACTING_AUDIO,
  COMPLETED,
  ERROR
}

export interface AnalysisResult {
  segments: AudioSegment[]; // The "Keep" segments
  originalDuration: number;
  newDuration: number;
  cutCount: number;
  resolution: VideoResolution;
  fps: number;
  channelCount: number;
}

// Premiere eklentisinde diskteki dosyayı belleğe almadan File gibi okur (Node fs ile)
export interface LocalFile {
  name: string;
  size: number;
  type: string;
  path: string;
  url: string;
  slice(start?: number, end?: number): { arrayBuffer(): Promise<ArrayBuffer> };
  arrayBuffer(): Promise<ArrayBuffer>;
  stream(): ReadableStream<Uint8Array>;
}

export type MediaFile = File | LocalFile;

declare global {
  interface Window {
    // electron/preload.cjs tarafından eklenir; tarayıcıda yoktur
    kisaKes?: { getPathForFile(file: File): string };
    // Premiere CEP paneli içinde eklenir
    __adobe_cep__?: { evalScript(script: string, callback: (result: string) => void): void };
  }
}
