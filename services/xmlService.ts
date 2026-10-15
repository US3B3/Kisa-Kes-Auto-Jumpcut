import type { AudioSegment, VideoResolution } from '../types';

export interface XmlOptions {
  fps: number;
  channelCount: number;
  filePath?: string; // Electron'da dosyanın gerçek yolu; yoksa Premiere'de medya yeniden bağlanmalı
  sourceDuration?: number; // seconds
}

const NTSC_FPS = [23.976, 29.97, 59.94];

const XML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const escapeXml = (text: string) => text.replace(/[&<>"']/g, (c) => XML_ENTITIES[c]);

// Premiere biçimi: file://localhost/Users/... veya file://localhost/C%3A/...
export const toPathUrl = (filePath: string) =>
  'file://localhost/' + filePath.replace(/\\/g, '/').replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');

export const generateFcpXml = (
  filename: string,
  segments: AudioSegment[],
  resolution: VideoResolution,
  { fps, channelCount, filePath, sourceDuration }: XmlOptions
): string => {
  // 29.97 gibi NTSC hızlar Premiere'de timebase 30 + ntsc TRUE olarak yazılır
  const timebase = Math.round(fps);
  const rate = `<rate><timebase>${timebase}</timebase><ntsc>${NTSC_FPS.includes(fps) ? 'TRUE' : 'FALSE'}</ntsc></rate>`;
  const toFrames = (seconds: number) => Math.round(seconds * fps);
  const name = escapeXml(filename);
  const { width, height } = resolution;

  let sequenceTime = 0;
  const clips = segments
    .map((seg) => ({ in: toFrames(seg.start), out: toFrames(seg.end) }))
    .filter((c) => c.out > c.in)
    .map((c) => {
      const clip = { ...c, start: sequenceTime, end: sequenceTime + c.out - c.in };
      sequenceTime = clip.end;
      return clip;
    });

  const fileDefinition = `<file id="file-1">
              <name>${name}</name>
              <pathurl>${toPathUrl(filePath || filename)}</pathurl>
              ${rate}${sourceDuration ? `\n              <duration>${toFrames(sourceDuration)}</duration>` : ''}
              <media>
                <video>
                  <samplecharacteristics>
                    <width>${width}</width>
                    <height>${height}</height>
                  </samplecharacteristics>
                </video>
                <audio>
                  <samplecharacteristics>
                    <depth>16</depth>
                    <samplerate>48000</samplerate>
                  </samplecharacteristics>
                  <channelcount>${channelCount}</channelcount>
                </audio>
              </media>
            </file>`;

  const clipItem = (id: string, clip: typeof clips[number], file: string, extra = '') => `          <clipitem id="${id}">
            <name>${name}</name>
            <duration>${clip.out - clip.in}</duration>
            ${rate}
            <start>${clip.start}</start>
            <end>${clip.end}</end>
            <in>${clip.in}</in>
            <out>${clip.out}</out>
            ${file}${extra}
          </clipitem>
`;

  const videoClips = clips
    .map((clip, i) => clipItem(`clipitem-${i + 1}`, clip, i === 0 ? fileDefinition : '<file id="file-1"/>'))
    .join('');

  // Kaynaktaki her ses kanalı ayrı bir izde (Premiere'in kendi dışa aktarımı gibi)
  const audioTracks = Array.from({ length: Math.max(1, channelCount) }, (_, ch) => `        <track>
${clips
  .map((clip, i) => clipItem(`clipitem-audio${ch + 1}-${i + 1}`, clip, '<file id="file-1"/>', `
            <sourcetrack>
              <mediatype>audio</mediatype>
              <trackindex>${ch + 1}</trackindex>
            </sourcetrack>`))
  .join('')}        </track>
`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="sequence-1">
    <name>${name} (Kısa Kes)</name>
    <duration>${sequenceTime}</duration>
    ${rate}
    <media>
      <video>
        <format>
          <samplecharacteristics>
            ${rate}
            <width>${width}</width>
            <height>${height}</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
          </samplecharacteristics>
        </format>
        <track>
${videoClips}        </track>
      </video>
      <audio>
${audioTracks}      </audio>
    </media>
  </sequence>
</xmeml>`;
};
