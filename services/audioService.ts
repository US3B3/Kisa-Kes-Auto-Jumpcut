import type { AudioAnalysis, MediaFile, ProcessingSettings } from '../types';
// @ts-ignore
import * as MP4Box from 'mp4box';
import { isMp4Compatible } from './mediaHelpers';
import { analyzeVolumeTimeline, calculateRMS, createVolumeTimeline, type VolumePoint } from './silence';

// 200MB üzeri dosyalar için streaming dene
const LARGE_FILE_THRESHOLD = 200 * 1024 * 1024;

export const extractAudioAndDetectSilence = async (
  file: MediaFile,
  settings: ProcessingSettings,
  onProgress: (msg: string) => void,
  onLoadProgress?: (percent: number) => void
): Promise<AudioAnalysis> => {

  // Streaming Modu Şartları: Büyük dosya + MP4 uyumlu (MP4Box MKV desteklemez) + WebCodecs desteği
  if (file.size > LARGE_FILE_THRESHOLD && isMp4Compatible(file) && 'AudioDecoder' in window) {
    try {
      return await processLargeVideoFile(file, settings, onProgress, onLoadProgress);
    } catch (e) {
      console.warn("Streaming modunda hata oluştu:", e);

      // Eğer dosya 1GB'dan büyükse, fallback (klasik yöntem) muhtemelen tarayıcıyı çökertir.
      if (file.size > 1024 * 1024 * 1024) {
        throw new Error(`Streaming işlemi başarısız oldu ve dosya klasik yöntem için çok büyük (Limit: 1GB). \nTeknik Hata: ${e instanceof Error ? e.message : String(e)}`);
      }

      onProgress("Streaming başarısız, bellek tabanlı yöntem deneniyor (Bu işlem uzun sürebilir)...");
    }
  }

  // Güvenlik: Eğer dosya MKV ise ve çok büyükse (örn > 2GB), kullanıcıyı uyar.
  // Çünkü ArrayBuffer'a 2GB+ dosya yüklemek çoğu tarayıcıda limiti aşar.
  if (file.size > 2 * 1024 * 1024 * 1024) {
      throw new Error("Bu dosya boyutu (2GB+) tarayıcı belleği için çok büyük ve formatı streaming için uygun değil (Sadece MP4/MOV streaming destekler).");
  }

  // Küçük dosyalar veya fallback için klasik yöntem
  try {
    return await processSmallFile(file, settings, onProgress, onLoadProgress);
  } catch (e: any) {
    if (e.message === "Dosya okunamadı.") {
       // FileReader hatasını daha anlaşılır hale getir
       throw new Error("Dosya belleğe alınırken hata oluştu. Dosya bozuk olabilir veya tarayıcı belleği yetersiz geldi.");
    }
    throw e;
  }
};

// --- YÖNTEM 1: KLASİK (Belleğe Yüklemeli) ---
const processSmallFile = async (
  file: MediaFile,
  settings: ProcessingSettings,
  onProgress: (msg: string) => void,
  onLoadProgress?: (percent: number) => void
): Promise<AudioAnalysis> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  onProgress("Dosya belleğe yükleniyor...");
  const arrayBuffer = await readFileAsArrayBuffer(file, (percent) => {
    if (onLoadProgress) onLoadProgress(percent);
  });

  onProgress("Ses çözümleniyor...");
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (e) {
    throw new Error("Ses dosyası çözümlenemedi (Decode Error). Format desteklenmiyor olabilir.");
  } finally {
    audioContext.close();
  }

  onProgress("Analiz ediliyor...");
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, c) => audioBuffer.getChannelData(c));
  const timeline = createVolumeTimeline(channels, audioBuffer.sampleRate, 0.05);

  return {
    segments: analyzeVolumeTimeline(timeline, settings),
    duration: audioBuffer.duration,
    channelCount: audioBuffer.numberOfChannels,
  };
};

// --- YÖNTEM 2: STREAMING (Büyük Dosyalar İçin) ---
const processLargeVideoFile = async (
  file: MediaFile,
  settings: ProcessingSettings,
  onProgress: (msg: string) => void,
  onLoadProgress?: (percent: number) => void
): Promise<AudioAnalysis> => {
  return new Promise(async (resolve, reject) => {
    onProgress("Büyük dosya modu başlatılıyor...");

    const mp4boxfile = MP4Box.createFile();
    let audioTrack: any = null;
    let decoder: AudioDecoder | null = null;
    let duration = 0;
    let failed = false;

    const fail = (e: unknown) => {
      failed = true;
      reject(e);
    };

    const timeline: VolumePoint[] = [];
    let samplesProcessed = 0;
    let totalSamples = 0;

    mp4boxfile.onError = (e: any) => {
      console.error("MP4Box Error:", e);
      fail(new Error("MP4 ayrıştırma hatası: Dosya yapısı bozuk veya desteklenmiyor."));
    };

    mp4boxfile.onReady = async (info: any) => {
      audioTrack = info.audioTracks[0];
      if (!audioTrack) {
        fail(new Error("Video dosyasında ses izi bulunamadı."));
        return;
      }

      duration = info.duration / info.timescale;
      totalSamples = audioTrack.nb_samples;
      onProgress(`Ses izi bulundu: ${audioTrack.codec}. Kod çözme başlıyor...`);

      decoder = new AudioDecoder({
        output: (audioData) => {
          // Her kanalın RMS'ini al, en yükseğini kullan: konuşma tek kanalda olsa bile kesilmesin
          let maxVolume = 0;
          const plane = new Float32Array(audioData.numberOfFrames);
          for (let c = 0; c < audioData.numberOfChannels; c++) {
            audioData.copyTo(plane, { planeIndex: c, format: 'f32-planar' });
            maxVolume = Math.max(maxVolume, calculateRMS(plane));
          }

          timeline.push({ time: audioData.timestamp / 1e6, maxVolume });
          audioData.close();
        },
        error: (e) => {
          console.error("Decoder error", e);
          fail(e);
        }
      });

      const { sample_rate: sampleRate, channel_count: numberOfChannels } = audioTrack.audio;
      // MOV'da esds 'wave' kutusunda kalır, MP4Box okuyamaz ve codec sadece "mp4a" gelir: AAC-LC varsay
      const isBareMp4a = audioTrack.codec === 'mp4a';
      const config = {
        codec: isBareMp4a ? 'mp4a.40.2' : audioTrack.codec,
        sampleRate,
        numberOfChannels,
        description: getDescription(mp4boxfile, audioTrack.id)
          ?? (isBareMp4a || audioTrack.codec === 'mp4a.40.2' ? buildAacLcConfig(sampleRate, numberOfChannels) : undefined)
      };

      try {
        const support = await AudioDecoder.isConfigSupported(config);
        if (!support.supported) throw new Error("unsupported");
        decoder.configure(config);

        // MP4Box extraction options
        mp4boxfile.setExtractionOptions(audioTrack.id, null, { nbSamples: 100 });
        mp4boxfile.start();
      } catch (e) {
        fail(new Error("Ses kodeği tarayıcı tarafından desteklenmiyor: " + audioTrack.codec));
      }
    };

    mp4boxfile.onSamples = (id: number, user: any, samples: any[]) => {
      if (!decoder || failed) return;

      for (const sample of samples) {
        // MP4 zamanları track timescale biriminde, WebCodecs mikrosaniye ister
        const chunk = new EncodedAudioChunk({
          type: sample.is_sync ? "key" : "delta",
          timestamp: (sample.cts * 1e6) / sample.timescale,
          duration: (sample.duration * 1e6) / sample.timescale,
          data: sample.data
        });

        try {
            decoder.decode(chunk);
        } catch(e) {
            console.error("Decode error on chunk", e);
        }
        samplesProcessed++;
      }

      mp4boxfile.releaseUsedSamples(audioTrack.id, samplesProcessed);

      if (onLoadProgress && totalSamples > 0) {
         onLoadProgress((samplesProcessed / totalSamples) * 100);
      }

      if (samplesProcessed % 200 === 0) {
        onProgress(`İşleniyor: %${Math.round((samplesProcessed / totalSamples) * 100)}`);
      }
    };

    // --- AKILLI DOSYA OKUMA DÖNGÜSÜ ---
    try {
      const reader = file.stream().getReader();
      let offset = 0;
      let nextScanReport = 0;
      let lastYieldTime = Date.now();
      const MAX_QUEUE_SIZE = 100;

      while (!failed) {
        // 1. Backpressure: Decoder şiştiyse bekle
        if (decoder && decoder.decodeQueueSize >= MAX_QUEUE_SIZE) {
          await new Promise(r => setTimeout(r, 20));
          continue;
        }

        // 2. UI Nefes Alma
        if (Date.now() - lastYieldTime > 50) {
           await new Promise(r => setTimeout(r, 0));
           lastYieldTime = Date.now();
        }

        // 3. Dosyadan Oku
        const { done, value } = await reader.read();

        if (done) {
          mp4boxfile.flush();
          break;
        }

        // 4. MP4Box'a Besle (Uint8Array değil, fileStart'lı ArrayBuffer ister)
        const chunkBuffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);

        // @ts-ignore
        chunkBuffer.fileStart = offset;
        mp4boxfile.appendBuffer(chunkBuffer);

        // Metadata (moov atom) ararken kullanıcıya bilgi ver
        if (!audioTrack && offset >= nextScanReport) {
             onProgress(`Dosya yapısı taranıyor (%${Math.round((offset / file.size) * 100)})...`);
             nextScanReport += 50 * 1024 * 1024;
        }

        offset += value.length;
      }

      if (failed) {
        reader.cancel();
        return;
      }

      // Flush Decoder
      if (decoder) {
        await decoder.flush();
        decoder.close();
      } else {
        // Eğer döngü bitti ama decoder hiç oluşmadıysa (onReady çalışmadı)
        throw new Error("Dosya işlendi ama ses parçası başlatılamadı (moov atom bulunamadı veya geçersiz).");
      }

      onProgress("Ses haritası oluşturuluyor...");

      if (timeline.length === 0) {
        throw new Error("Ses verisi çıkartılamadı (Sessiz dosya veya decoder çıktısı boş).");
      }

      resolve({
        segments: analyzeVolumeTimeline(timeline, settings),
        duration,
        channelCount: audioTrack.audio.channel_count,
      });

    } catch (err) {
      reject(err);
    }
  });
};

// AAC için WebCodecs, esds içindeki AudioSpecificConfig'i ister (DecoderConfig tag 4 > DecoderSpecificInfo tag 5)
const getDescription = (mp4boxfile: any, trackId: number): Uint8Array | undefined => {
  const entry = mp4boxfile.getTrackById(trackId)?.mdia?.minf?.stbl?.stsd?.entries?.[0];
  return entry?.esds?.esd?.findDescriptor(4)?.findDescriptor(5)?.data ?? undefined;
};

const AAC_SAMPLE_RATES = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350];

// AudioSpecificConfig: 5 bit nesne tipi (2 = LC), 4 bit hız indeksi, 4 bit kanal, 3 bit 0
export const buildAacLcConfig = (sampleRate: number, channels: number): Uint8Array | undefined => {
  const freqIndex = AAC_SAMPLE_RATES.indexOf(sampleRate);
  if (freqIndex < 0) return undefined;
  return new Uint8Array([(2 << 3) | (freqIndex >> 1), ((freqIndex & 1) << 7) | (channels << 3)]);
};

const readFileAsArrayBuffer = (
  file: MediaFile,
  onProgress?: (percent: number) => void
): Promise<ArrayBuffer> => {
  if (!(file instanceof Blob)) return file.arrayBuffer(); // Premiere'de diskten okunur, ilerleme yok
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress((event.loaded / event.total) * 100);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
