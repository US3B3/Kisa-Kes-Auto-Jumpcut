// Premiere eklentisini imzalı .zxp olarak paketler: release/Kisa-Kes-Premiere.zxp
// Kullanım: npm run premiere:zxp
// Gerekli: Adobe'nin ücretsiz ZXPSignCmd aracı (.tools/ZXPSignCmd veya ZXPSIGNCMD ortam değişkeni)
// https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const tool = process.env.ZXPSIGNCMD
  || path.join(root, '.tools', process.platform === 'win32' ? 'ZXPSignCmd.exe' : 'ZXPSignCmd');
// Sertifika repoda değil kullanıcı klasöründe: güncellemeler aynı sertifikayla imzalanmalı
const certDir = path.join(os.homedir(), '.kisa-kes');
const cert = path.join(certDir, 'kisa-kes-cert.p12');
const passwordFile = path.join(certDir, 'cert-password.txt');
const output = path.join(root, 'release', 'Kisa-Kes-Premiere.zxp');

if (!fs.existsSync(tool)) {
  console.error(`ZXPSignCmd bulunamadı: ${tool}\nAdobe-CEP/CEP-Resources deposundan indirip .tools/ klasörüne koyun.`);
  process.exit(1);
}
if (!fs.existsSync(path.join(root, 'premiere', 'panel', 'index.html'))) {
  console.error('Önce paneli derleyin: npm run premiere:build');
  process.exit(1);
}

const run = (...args) => execFileSync(tool, args, { stdio: 'inherit' });

if (!fs.existsSync(cert)) {
  fs.mkdirSync(certDir, { recursive: true, mode: 0o700 });
  const password = crypto.randomBytes(18).toString('base64url');
  fs.writeFileSync(passwordFile, password, { mode: 0o600 });
  // Kendinden imzalı sertifika ücretsizdir ve CEP için yeterlidir (10 yıl geçerli)
  run('-selfSignedCert', 'TR', 'Istanbul', 'US3B3', 'Kisa Kes', password, cert, '-validityDays', '3650');
  console.log(`Sertifika oluşturuldu: ${cert} (yedekleyin; kaybolursa güncellemeler farklı imzayla çıkar)`);
}
const password = fs.readFileSync(passwordFile, 'utf8').trim();

// Sadece eklentinin çalışması için gereken klasörler pakete girer
const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'kisa-kes-zxp-'));
for (const dir of ['CSXS', 'jsx', 'panel']) {
  fs.cpSync(path.join(root, 'premiere', dir), path.join(staging, dir), { recursive: true });
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.rmSync(output, { force: true });
// Zaman damgası: sertifikanın süresi dolsa da imza geçerli kalır
run('-sign', staging, output, cert, password, '-tsa', 'http://timestamp.digicert.com');
run('-verify', output);
fs.rmSync(staging, { recursive: true, force: true });
console.log(`Hazır: ${output}`);
