# ✂️ Kısa Kes - Otomatik Jump Cut

**Kısa Kes**, video dosyalarınızdaki sessiz bölümleri analiz eden, bu bölümleri çıkartan ve **Adobe Premiere Pro**'ya aktarabileceğiniz bir XML dosyası üreten açık kaynaklı bir araçtır.

Tüm işlem **bilgisayarınızda** gerçekleşir. Videolarınız herhangi bir sunucuya yüklenmez.

![Kısa Kes ekran görüntüsü](docs/ekran-goruntusu.png)

## 🌟 Özellikler

*   **Yerel Analiz:** Web Audio API ve WebCodecs ile çalışır; büyük MP4/MOV dosyaları belleğe yüklenmeden parça parça işlenir.
*   **Tüm Kanallar:** Ses tek kanalda olsa bile (ör. yaka mikrofonu) konuşma kesilmez.
*   **Hassas Ayarlar:**
    *   **Sessizlik Eşiği (dB):** Hangi ses seviyesinin altının sessizlik sayılacağını belirleyin.
    *   **Min. Sessizlik Süresi:** Ne kadar süren sessizliklerin kesileceğini seçin.
    *   **Pay (Padding):** Kesimlerin sert olmaması için konuşmaların başına ve sonuna pay bırakın.
    *   **Min. Klip Süresi:** Tık, çıt gibi kısa ses patlamalarının ayrı klip olmasını engelleyin.
*   **Premiere Pro Uyumu:** Kare hızı (23.976, 25, 29.97, 60...) MP4/MOV dosyalarından otomatik algılanır, gerekirse elle seçilir.
*   **Masaüstü Sürümü:** XML'e dosyanın gerçek yolu yazılır, Premiere'de medyayı yeniden bağlamak gerekmez.

## 🌐 Web Sürümü

```bash
git clone https://github.com/US3B3/Kisa-Kes-Auto-Jumpcut.git
cd Kisa-Kes-Auto-Jumpcut
npm install
npm run dev
```

## 🖥 Masaüstü Sürümü (Electron)

```bash
npm install
npm run electron:dev     # geliştirme
npm run electron:build   # kurulum dosyası (release/ klasörüne)
```

Windows'ta `Kısa Kes Setup 1.0.0.exe`, macOS'ta `.dmg` üretilir.

> npm 11 kurulum betiklerini varsayılan olarak çalıştırmaz. `electron` çalışmazsa bir kez `node node_modules/electron/install.js` komutunu çalıştırın.

## 📖 Kullanım

1.  **Video Yükleme:** Videoyu sürükleyip bırakın veya tıklayarak seçin.
2.  **Ayarlar:**
    *   Gürültülü bir ortamda çekim yaptıysanız **Sessizlik Eşiği**ni artırın (örn. -20dB).
    *   Konuşmaların kesilmemesi için **Pay** değerini 0.1s - 0.2s civarında tutun.
    *   Kare hızının videonuzla aynı olduğundan emin olun, yoksa kesimler kayar.
3.  **Analiz:** "Analiz Et" butonuna basın. Ayarları değiştirip "Yeniden Analiz Et" ile tekrar deneyebilirsiniz.
4.  **İndirme:** XML dosyasını indirip Premiere Pro'ya sürükleyin.

### ⚠️ Web Sürümünde Premiere'e Aktarım

Tarayıcı dosyanın konumunu bilemediği için medya "Offline" görünür:
1.  "Link Media" penceresinde **"Locate"** butonuna basın.
2.  Orijinal video dosyasını seçin.

## 🧪 Test

```bash
npm test
```

## 🛠 Teknolojiler

*   [React](https://react.dev/)
*   [Electron](https://www.electronjs.org/)
*   [Vite](https://vitejs.dev/)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [MP4Box.js](https://github.com/gpac/mp4box.js)

## 📄 Lisans

[MIT](LICENSE)
