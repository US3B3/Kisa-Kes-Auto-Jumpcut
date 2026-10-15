// Premiere eklentisini geliştirme modunda kurar: imzasız eklentilere izin verir ve
// premiere/ klasörünü CEP eklenti klasörüne bağlar. Kullanım: npm run premiere:install
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const source = path.resolve(__dirname, '../premiere');
const extensionsDir = process.platform === 'win32'
  ? path.join(process.env.APPDATA, 'Adobe', 'CEP', 'extensions')
  : path.join(os.homedir(), 'Library', 'Application Support', 'Adobe', 'CEP', 'extensions');
const target = path.join(extensionsDir, 'com.kisakes.panel');

if (!fs.existsSync(path.join(source, 'panel', 'index.html'))) {
  console.error('Önce paneli derleyin: npm run premiere:build');
  process.exit(1);
}

// CSXS 9-12: Premiere 2020 ve sonrası
for (const version of [9, 10, 11, 12]) {
  execSync(process.platform === 'win32'
    ? `reg add HKCU\\Software\\Adobe\\CSXS.${version} /v PlayerDebugMode /t REG_SZ /d 1 /f`
    : `defaults write com.adobe.CSXS.${version} PlayerDebugMode 1`, { stdio: 'ignore' });
}

fs.mkdirSync(extensionsDir, { recursive: true });
if (fs.existsSync(target) || fs.lstatSync(target, { throwIfNoEntry: false })) {
  const stat = fs.lstatSync(target);
  if (!stat.isSymbolicLink()) {
    console.error(`${target} zaten var ve bir bağlantı değil; elle silin.`);
    process.exit(1);
  }
  fs.unlinkSync(target);
}
// Windows'ta junction yönetici izni istemez
fs.symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir');

console.log(`Kuruldu: ${target}\nPremiere Pro'yu yeniden başlatın, sonra Pencere > Uzantılar > Kısa Kes.`);
