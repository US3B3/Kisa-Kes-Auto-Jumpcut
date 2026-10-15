import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeVolumeTimeline } from '../services/silence.ts';
import { generateFcpXml, toPathUrl } from '../services/xmlService.ts';

// '#' = sesli, '.' = sessiz; her karakter 0.1 saniye
const timeline = (pattern: string) =>
  [...pattern].map((c, i) => ({ time: i * 0.1, maxVolume: c === '#' ? 0.5 : 0 }));
const settings = { thresholdDb: -30, minSilenceDuration: 0.5, padding: 0, minClipDuration: 0 };
const round = (segs: { start: number; end: number }[]) =>
  segs.map(s => [Math.round(s.start * 10) / 10, Math.round(s.end * 10) / 10]);

test('uzun sessizlik kesilir, kısa sessizlik kalır', () => {
  const segs = analyzeVolumeTimeline(timeline('###..###.........###'), settings);
  assert.deepEqual(round(segs), [[0, 0.8], [1.7, 1.9]]);
});

test('tamamen sessiz dosyada klip çıkmaz', () => {
  assert.deepEqual(analyzeVolumeTimeline(timeline('..........'), settings), []);
});

test('min. klip süresinden kısa tık atlanır', () => {
  const segs = analyzeVolumeTimeline(timeline('....#........####....'), { ...settings, minClipDuration: 0.15 });
  assert.deepEqual(round(segs), [[1.3, 2.0]]);
});

test('XML: NTSC hız, kanal sayısı, kaçış ve dosya yolu', () => {
  const xml = generateFcpXml('a & b.mp4', [{ start: 10, end: 12, duration: 2 }], { width: 1920, height: 1080 }, {
    fps: 29.97, channelCount: 2, filePath: '/Users/me/Video Klasörü/a & b.mp4',
  });
  assert.match(xml, /<timebase>30<\/timebase><ntsc>TRUE<\/ntsc>/);
  assert.match(xml, /<in>300<\/in>/); // 10s * 29.97 = 299.7 → 300
  assert.match(xml, /<trackindex>2<\/trackindex>/);
  assert.ok(xml.includes('<name>a &amp; b.mp4</name>'));
  assert.ok(!xml.includes('a & b'));
  assert.ok(xml.includes('<pathurl>file://localhost/Users/me/Video%20Klas%C3%B6r%C3%BC/a%20%26%20b.mp4</pathurl>'));
});

test('Windows yolu Premiere biçimine çevrilir', () => {
  assert.equal(toPathUrl('C:\\Videolar\\x.mp4'), 'file://localhost/C%3A/Videolar/x.mp4');
});
