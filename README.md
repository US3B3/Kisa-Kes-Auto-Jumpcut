# ✂️ Uskut - Otomatik Sessizlik Giderici

**Uskut**, video dosyalarınızdaki sessiz bölümleri tarayıcı üzerinde analiz eden, bu bölümleri çıkartan ve **Adobe Premiere Pro**'ya aktarabileceğiniz bir XML dosyası üreten açık kaynaklı bir araçtır.

Tüm işlem **istemci tarafında (tarayıcınızda)** gerçekleşir. Videolarınız herhangi bir sunucuya yüklenmez, bu sayede maksimum gizlilik ve hız sağlanır.

![Uskut Ekran Görüntüsü](https://via.placeholder.com/800x450?text=Uskut+Arayuz+Onizleme)

## 🌟 Özellikler

*   **Tarayıcı Tabanlı Analiz:** Web Audio API kullanılarak videolar saniyeler içinde analiz edilir.
*   **Gizlilik Odaklı:** Dosyalarınız bilgisayarınızdan dışarı çıkmaz.
*   **Hassas Ayarlar:**
    *   **Sessizlik Eşiği (dB):** Hangi ses seviyesinin altının sessizlik sayılacağını belirleyin.
    *   **Minimum Süre:** Ne kadar süren sessizliklerin kesileceğini seçin.
    *   **Güvenlik Payı (Padding):** Kesimlerin çok sert olmaması için konuşmaların başına ve sonuna pay bırakın.
*   **Premiere Pro Uyumu:** Final Cut Pro XML formatında çıktı vererek Premiere Pro ile sorunsuz çalışır.
*   **Modern Arayüz:** React, Tailwind CSS ve Lucide ikonları ile hazırlanmış şık tasarım.

## 🚀 Masaüstü Uygulaması Olarak Kurulum (.exe)

Bu projeyi Windows için bir `setup.exe` dosyasına dönüştürmek için aşağıdaki adımları izleyin.

### 1. Hazırlık ve Paketlerin Yüklenmesi

Projeyi Electron uyumlu hale getirmek için gerekli paketleri yükleyin:

```bash
# Electron ve Builder araçlarını yükle
npm install --save-dev electron electron-builder concurrently wait-on

# Uygulama bağımlılıklarını yerel olarak yükle (ÖNEMLİ: İnternetsiz çalışması için)
npm install react react-dom @google/genai react-markdown lucide-react mp4box
```

### 2. package.json Ayarları

`package.json` dosyanızı açın ve aşağıdaki değişiklikleri yapın:

1.  **"main"** alanını ekleyin.
2.  **"scripts"** bölümüne `electron` komutlarını ekleyin.
3.  **"build"** ayarlarını ekleyin.

Örnek `package.json` yapısı şöyle olmalıdır:

```json
{
  "name": "uskut",
  "version": "1.0.0",
  "main": "electron/main.js", 
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron:dev": "concurrently -k \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.uskut.app",
    "productName": "Uskut",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": "nsis",
      "icon": "public/icon.png" 
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
  // ... diğer bağımlılıklar
}
```

### 3. Setup.exe Oluşturma

Tüm ayarlar tamamsa, aşağıdaki komutu çalıştırarak `.exe` dosyasını oluşturun:

```bash
npm run electron:build
```

İşlem tamamlandığında projenizin içinde oluşan `release` klasöründe `Uskut Setup 1.0.0.exe` dosyasını bulabilirsiniz.

---

## 🌐 Web Sürümü Kurulumu

Bu projeyi sadece tarayıcıda çalıştırmak isterseniz:

1.  **Repoyu klonlayın:**
    ```bash
    git clone https://github.com/kullaniciadi/uskut.git
    cd uskut
    ```

2.  **Bağımlılıkları yükleyin:**
    ```bash
    npm install
    ```

3.  **Geliştirme sunucusunu başlatın:**
    ```bash
    npm run dev
    ```

## 📖 Kullanım Talimatları

1.  **Video Yükleme:** İşlemek istediğiniz video dosyasını sürükleyip bırakın veya tıklayarak seçin.
2.  **Ayarlar:**
    *   Gürültülü bir ortamda çekim yaptıysanız **Sessizlik Eşiği**ni artırın (örn. -20dB).
    *   Konuşmaların kesilmemesi için **Padding** (Pay) değerini 0.1s - 0.2s civarında tutun.
3.  **Analiz:** "Analiz Et" butonuna basın. İşlem süresi dosya boyutuna ve bilgisayarınızın hızına göre değişebilir.
4.  **İndirme:** İşlem bittiğinde XML dosyasını indirin.

### ⚠️ Premiere Pro'ya Aktarım (Önemli)

XML dosyasını Premiere Pro'ya attığınızda medya "Offline" görünecektir. Bunu düzeltmek için:
1.  Dosyayı Premiere'e sürükleyin.
2.  "Link Media" penceresinde **"Locate"** butonuna basın.
3.  Orijinal video dosyasını seçin.

## 🛠 Teknolojiler

*   [React](https://reactjs.org/)
*   [Electron](https://www.electronjs.org/)
*   [Vite](https://vitejs.dev/)
*   [Tailwind CSS](https://tailwindcss.com/)

## 📄 Lisans

MIT lisansı ile lisanslanmıştır.