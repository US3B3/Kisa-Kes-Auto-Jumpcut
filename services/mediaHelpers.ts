// @ts-ignore
import * as MP4Box from 'mp4box';
import type { MediaInfo } from '../types';

export const STANDARD_FPS = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];

const DEFAULT_RESOLUTION = { width: 1920, height: 1080 };

export const isMp4Compatible = (file: File) =>
  /\.(mp4|mov|m4a|m4v)$/i.test(file.name) || file.type.includes('mp4') || file.type.includes('quicktime');

// Değişken kare hızlı (telefon) videolar için en yakın standart değere yuvarlar
const snapFps = (fps: number) =>
  STANDARD_FPS.reduce((best, f) => (Math.abs(f - fps) < Math.abs(best - fps) ? f : best));

const detectFps = async (file: File): Promise<number | undefined> => {
  if (!isMp4Compatible(file)) return undefined;

  const mp4 = MP4Box.createFile();
  let fps: number | undefined;
  let done = false;
  mp4.onReady = (info: any) => {
    done = true;
    const track = info.videoTracks?.[0];
    if (track?.nb_samples && track.duration) {
      fps = snapFps((track.nb_samples * track.timescale) / track.duration);
    }
  };
  mp4.onError = () => { done = true; };

  // moov sonda olabilir; MP4Box bir sonraki okunacak konumu döndürür, mdat atlanır
  let pos = 0;
  for (let i = 0; i < 200 && !done && pos < file.size; i++) {
    const buffer: any = await file.slice(pos, pos + 1024 * 1024).arrayBuffer();
    buffer.fileStart = pos;
    const next = mp4.appendBuffer(buffer);
    pos = next > pos ? next : pos + buffer.byteLength;
  }
  return fps;
};

const readVideoMetadata = (file: File): Promise<Omit<MediaInfo, 'fps'>> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      const duration = Number.isFinite(video.duration) ? video.duration : undefined;
      // Ses dosyalarında boyut 0 gelir, varsayılan çözünürlük kullanılır
      if (video.videoWidth && video.videoHeight) {
        resolve({ width: video.videoWidth, height: video.videoHeight, duration });
      } else {
        resolve({ ...DEFAULT_RESOLUTION, duration });
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(DEFAULT_RESOLUTION); // Hata durumunda varsayılan
    };

    video.src = URL.createObjectURL(file);
  });
};

export const getMediaInfo = async (file: File): Promise<MediaInfo> => {
  const [metadata, fps] = await Promise.all([
    readVideoMetadata(file),
    detectFps(file).catch(() => undefined),
  ]);
  return { ...metadata, fps };
};
