import type { AudioSegment, ProcessingSettings } from '../types';

export interface VolumePoint {
  time: number;
  maxVolume: number; // 0-1 arası genlik
}

export const calculateRMS = (data: Float32Array) => {
  let sum = 0;
  let count = 0;
  const step = 4;
  for (let i = 0; i < data.length; i += step) {
    sum += data[i] * data[i];
    count++;
  }
  return count ? Math.sqrt(sum / count) : 0;
};

// Her pencerede kanalların en yükseğini alır: konuşma tek kanalda olsa bile kesilmez
export const createVolumeTimeline = (
  channels: Float32Array[],
  sampleRate: number,
  resolutionSeconds: number
): VolumePoint[] => {
  const timeline: VolumePoint[] = [];
  const samplesPerPoint = Math.floor(sampleRate * resolutionSeconds);
  const length = channels[0]?.length ?? 0;

  for (let i = 0; i < length; i += samplesPerPoint) {
    let maxVolume = 0;
    for (const channel of channels) {
      maxVolume = Math.max(maxVolume, calculateRMS(channel.subarray(i, i + samplesPerPoint)));
    }
    timeline.push({ time: i / sampleRate, maxVolume });
  }
  return timeline;
};

export const analyzeVolumeTimeline = (
  timeline: VolumePoint[],
  settings: ProcessingSettings
): AudioSegment[] => {
  const { thresholdDb, minSilenceDuration, padding, minClipDuration } = settings;
  const thresholdAmp = Math.pow(10, thresholdDb / 20);
  const lastTime = timeline.length ? timeline[timeline.length - 1].time : 0;

  const keepSegments: AudioSegment[] = [];

  let currentSegment: { start: number, end: number, loudStart: number } | null = null;
  let silenceStartTime: number | null = null;

  const closeSegment = (end: number, loudEnd: number) => {
    // Pay eklenmeden önceki sesli kısım çok kısaysa (tık, çıt) klip oluşturma
    if (currentSegment && loudEnd - currentSegment.loudStart >= minClipDuration) {
      keepSegments.push({ start: currentSegment.start, end, duration: end - currentSegment.start });
    }
    currentSegment = null;
  };

  for (let i = 0; i < timeline.length; i++) {
    const point = timeline[i];
    const isLoud = point.maxVolume > thresholdAmp;

    if (isLoud) {
      silenceStartTime = null;

      if (!currentSegment) {
        currentSegment = { start: Math.max(0, point.time - padding), end: point.time, loudStart: point.time };
      } else {
        currentSegment.end = point.time;
      }
    } else {
      if (silenceStartTime === null) {
        silenceStartTime = point.time;
      }

      const currentSilenceDuration = point.time - silenceStartTime;

      if (currentSegment && currentSilenceDuration > minSilenceDuration) {
        closeSegment(Math.min(lastTime, silenceStartTime + padding), silenceStartTime);
      }
    }
  }

  if (currentSegment) {
    closeSegment(lastTime, silenceStartTime ?? lastTime);
  }

  // Merge Overlaps
  const mergedSegments: AudioSegment[] = [];
  if (keepSegments.length > 0) {
    let current = keepSegments[0];
    for (let i = 1; i < keepSegments.length; i++) {
      const next = keepSegments[i];
      if (current.end >= next.start) {
        current.end = Math.max(current.end, next.end);
        current.duration = current.end - current.start;
      } else {
        mergedSegments.push(current);
        current = next;
      }
    }
    mergedSegments.push(current);
  }

  return mergedSegments;
};
