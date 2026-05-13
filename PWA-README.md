# PWA (Progressive Web App) - Sewa Ruang

Aplikasi ini telah dikonversi menjadi PWA (Progressive Web App) yang dapat diinstal di perangkat mobile dan desktop.

## ✨ Fitur PWA

### 1. Installable
- Dapat diinstal di layar utama (Android/iOS)
- Tampilan standalone tanpa browser chrome
- Splash screen saat membuka aplikasi

### 2. Offline Support
- Service Worker untuk caching
- Halaman offline saat tidak ada koneksi
- Cache-first strategy untuk assets
- Network-first untuk API calls

### 3. Push Notifications
- Mendukung notifikasi push (jika diimplementasikan)
- Background sync untuk form submissions

### 4. Responsive
- Optimized untuk mobile, tablet, dan desktop
- Touch-friendly interface
- Smooth animations

### 5. Performance
- Fast loading dengan caching
- Pre-cached critical assets
- Lazy loading untuk non-critical resources

## 📱 Cara Install

### Android (Chrome)
1. Buka aplikasi di Chrome
2. Tap menu (⋮) di pojok kanan atas
3. Pilih "Tambahkan ke layar utama" atau "Install app"
4. Konfirmasi instalasi

### iOS (Safari)
1. Buka aplikasi di Safari
2. Tap ikon "Share" (kotak dengan panah ke atas)
3. Scroll dan pilih "Tambahkan ke Layar Utama"
4. Tap "Tambah" untuk konfirmasi

### Desktop (Chrome/Edge)
1. Buka aplikasi di browser
2. Klik ikon install di address bar (sebelah kanan)
3. Atau klik menu → "Install Sewa Ruang"

## 🔧 Konfigurasi File

### Manifest
- `public/manifest.json` - Konfigurasi PWA utama

### Service Worker
- `public/service-worker.js` - Logic caching dan offline

### Components
- `src/components/providers/PWAProvider.tsx` - Provider untuk registrasi SW
- `src/components/pwa/InstallPrompt.tsx` - UI prompt instalasi
- `src/components/pwa/OnlineStatus.tsx` - Status koneksi

### Utilities
- `src/lib/pwa.ts` - Helper functions dan hooks

## 📂 File Struktur

```
public/
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker
├── offline.html           # Halaman offline
└── icons/                 # Icon PWA
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    ├── icon-512x512.png
    └── browserconfig.xml  # Windows tile config

src/
├── components/
│   ├── providers/
│   │   └── PWAProvider.tsx
│   └── pwa/
│       ├── InstallPrompt.tsx
│       └── OnlineStatus.tsx
└── lib/
    └── pwa.ts
```

## 🎨 Customisasi

### Mengubah Theme Color
Edit `manifest.json` dan `layout.tsx`:
```json
{
  "theme_color": "#warna-baru",
  "background_color": "#warna-baru"
}
```

### Menambah Shortcuts
Edit `manifest.json`:
```json
{
  "shortcuts": [
    {
      "name": "Nama Shortcut",
      "url": "/path",
      "icons": [...]
    }
  ]
}
```

### Update Icons
Ganti file di `public/icons/` dengan ukuran yang sama:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

## 🔍 Testing

### Lighthouse Audit
1. Buka DevTools (F12)
2. Pilih tab "Lighthouse"
3. Centang "Progressive Web App"
4. Klik "Analyze page load"

### Chrome DevTools
1. Application tab → Manifest (cek manifest)
2. Application tab → Service Workers (cek SW)
3. Application tab → Cache Storage (cek cache)

### Mobile Testing
- Chrome DevTools → Toggle Device Toolbar
- Atau aktifkan USB debugging dan test di device

## 🐛 Troubleshooting

### Service Worker tidak terdaftar
- Cek console untuk error
- Pastikan `PWAProvider` di-import di layout
- Hard refresh (Ctrl+F5) untuk unregister SW lama

### Icon tidak muncul
- Cek path di manifest.json
- Pastikan icon ada di public/icons/
- Cek ukuran icon sesuai

### Update tidak berlaku
- Service Worker akan update otomatis
- User akan diminta reload jika ada update
- Atau unregister SW manual di DevTools

## 📚 Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Next.js PWA](https://nextjs.org/docs/app/building-your-progressive-web-app)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)

## 📝 Notes

- Service Worker hanya berjalan di production (HTTPS)
- Untuk development, gunakan localhost atau https
- Cache akan otomatis update saat build baru
- Browser akan menampilkan install prompt sesuai kriteria
