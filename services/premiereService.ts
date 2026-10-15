import type { LocalFile } from '../types';

// CEP paneli --enable-nodejs --mixed-context ile açılır; Node modülleri window.require ile gelir
const nodeRequire = (name: string) => (window as any).require(name);

export const isPremiere = () => !!window.__adobe_cep__;

const CHUNK_SIZE = 4 * 1024 * 1024;

export const openLocalFile = (filePath: string): LocalFile => {
  const fs = nodeRequire('fs');
  const path = nodeRequire('path');
  const { pathToFileURL } = nodeRequire('url');
  const size: number = fs.statSync(filePath).size;

  const read = (start: number, end: number): ArrayBuffer => {
    const length = Math.max(0, Math.min(end, size) - start);
    const buffer = new Uint8Array(length);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, length, start);
    } finally {
      fs.closeSync(fd);
    }
    return buffer.buffer;
  };

  return {
    name: path.basename(filePath),
    size,
    type: '',
    path: filePath,
    url: pathToFileURL(filePath).href,
    slice: (start = 0, end = size) => ({ arrayBuffer: async () => read(start, end) }),
    arrayBuffer: async () => read(0, size),
    stream: () => {
      let offset = 0;
      return new ReadableStream<Uint8Array>({
        pull(controller) {
          if (offset >= size) return controller.close();
          controller.enqueue(new Uint8Array(read(offset, offset + CHUNK_SIZE)));
          offset += CHUNK_SIZE;
        },
      });
    },
  };
};

const evalScript = (script: string) =>
  new Promise<string>((resolve) => window.__adobe_cep__!.evalScript(script, resolve));

const HOST_ERRORS: Record<string, string> = {
  NO_SELECTION: "Premiere'de bir klip seçin (timeline'da veya Proje panelinde).",
  NO_MEDIA: 'Seçilen öğe bir medya dosyası değil (sekans veya klasör seçilmiş olabilir).',
  IMPORT_FAILED: "XML Premiere'e aktarılamadı.",
};

const hostError = (code: string) =>
  new Error(HOST_ERRORS[code] ?? `Premiere betik hatası: ${code}`);

export const getSelectedClip = async (): Promise<LocalFile> => {
  const raw = await evalScript('kisaKes_getSelectedMedia()');
  let result: { path?: string; error?: string };
  try {
    result = JSON.parse(raw);
  } catch {
    throw hostError(raw);
  }
  if (!result.path) throw hostError(result.error ?? 'NO_MEDIA');
  return openLocalFile(result.path);
};

// XML'i geçici klasöre yazar, Premiere'e içe aktarır ve oluşan sekansı açar
export const importSequenceXml = async (xml: string, baseName: string) => {
  const fs = nodeRequire('fs');
  const path = nodeRequire('path');
  const os = nodeRequire('os');
  const dir = path.join(os.tmpdir(), 'kisa-kes');
  fs.mkdirSync(dir, { recursive: true });
  const xmlPath = path.join(dir, `${baseName}_${Date.now()}.xml`);
  fs.writeFileSync(xmlPath, xml, 'utf8');

  const result = await evalScript(`kisaKes_importXml(${JSON.stringify(xmlPath)})`);
  if (result !== 'OK') throw hostError(result);
};
