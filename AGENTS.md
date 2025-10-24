# AGENTS.md - AI Agent Dokümantasyonu

Bu proje Barchart'tan otomatik historical data indiren Tampermonkey scriptleridir.

## Proje Yapısı

```
/Users/malware/downloader/
├── unified2w.user.js      # 2 haftalık periyot script (çalışıyor ✅)
├── weekly.user.js         # 1 haftalık periyot script (çalışıyor ✅)
├── output/                # İndirilen CSV dosyaları (gitignore'da)
└── README.md             # Kullanıcı dokümantasyonu
```

## Script'ler

### 1. unified2w.user.js - 2 Haftalık Downloader ✅

**Durum:** Test edildi, çalışıyor

**Özellikler:**
- **Periyot:** 2 haftalık (Pazar → 2. Cuma, 12 gün)
- **Interval seçenekleri:** 12, 20, 30, 60 dakika
- **Başlangıç tarihi:** Sabit (01/05/2025)
- **UI konumu:** Sağ alt köşe
- **Renk:** Kırmızı/Turuncu

**Tarih Hesaplama:**
```javascript
// Pazar + 12 gün = ikinci Cuma
endDate.setDate(endDate.getDate() + 12);
currentSunday.setDate(currentSunday.getDate() + 7); // Her hafta
```

**Barchart Form Field'ları:**
- `input[name="dateFrom"]` = başlangıç tarihi (Pazar)
- `input[name="dateTo"]` = bitiş tarihi (Cuma)
- `input[name="aggregation"]` = interval (12, 20, 30, 60)

**Doğru Çıktı Örneği:**
```
01/05/2025 (Paz) → 01/17/2025 (Cum) - 12 gün ✅
01/12/2025 (Paz) → 01/24/2025 (Cum) - 12 gün ✅
```

---

### 2. weekly.user.js - 1 Haftalık Downloader ✅

**Durum:** Test edildi, çalışıyor (v2.1) — reaktif form auto-adjust fix uygulandı

**Özellikler:**
- **Periyot:** 1 haftalık (Pazar → Cuma, 5 gün)
- **Interval:** Sadece 12 dakika
- **Başlangıç tarihi:** Kullanıcı seçiyor (input field)
- **UI konumu:** Sol alt köşe
- **Renk:** Mor

**Tarih Hesaplama:**
```javascript
// DOĞRU KOD (console'da test edildi):
const weekStart = new Date(currentSunday.valueOf());
const weekEnd = new Date(currentSunday.valueOf());
weekEnd.setDate(weekEnd.getDate() + 5); // Pazar + 5 gün = Cuma
currentSunday.setDate(currentSunday.getDate() + 7); // Bir sonraki Pazar
```

**Beklenen Çıktı:**
```
08/17/2025 (Paz) → 08/22/2025 (Cum) - 5 gün ✅
08/24/2025 (Paz) → 08/29/2025 (Cum) - 5 gün ✅
08/31/2025 (Paz) → 09/05/2025 (Cum) - 5 gün ✅
```

**Düzeltme (v2.1):**
- Kök sebep: Reaktif form, alanlar tek tek güncellenince tarih aralığını otomatik yeniden hesaplıyordu (auto-adjust)
- Çözüm:
  - `dateFrom` ve `dateTo` değerlerini ÖNCE birlikte set et
  - Eventleri kontrollü sırayla tetikle: önce `dateTo`, sonra `dateFrom`
  - Sapma olursa değerleri tekrar yazıp tekrar dispatch et (re-assert)
  - Güvenlik: `from > to` ise swap-back uygula
  - Download öncesi DOM’daki gerçek değerleri logla; Tampermonkey cache için version bump (v2.1)

---

## Kritik Bilgiler

### Tarih Formatı
- **Input/Output:** `MM/DD/YYYY` (örn: `01/05/2025`)
- **Pazar kontrolü:** `date.getDay() === 0`

### Barchart Form Selector'ları
```javascript
'input.js-chart-form-minutes'  // veya input[name="aggregation"]
'input[name="dateFrom"]'       // Başlangıç tarihi
'input[name="dateTo"]'         // Bitiş tarihi
'.download-btn'                // Download butonu
```

### Event Dispatching
```javascript
field.dispatchEvent(new Event('input', { bubbles: true }));
field.dispatchEvent(new Event('change', { bubbles: true }));
field.dispatchEvent(new Event('blur', { bubbles: true }));
```
**ÖNEMLİ:** Her 3 event de gerekli (Angular/React form validation)

> Weekly notu: `dateFrom` ve `dateTo` değerlerini önce value ile set et; event sırası: önce `dateTo`, sonra `dateFrom`. Gerekirse tekrar yaz.

### Timing
- Form doldurma → download arası: **500ms**
- İndirmeler arası: **3000ms** (rate limiting)

---

## Debug Stratejisi

### Console Test (Tarih Hesaplama)
```javascript
let currentSunday = new Date('08/17/2025');
for (let i = 0; i < 3; i++) {
    const weekStart = new Date(currentSunday.valueOf());
    const weekEnd = new Date(currentSunday.valueOf());
    weekEnd.setDate(weekEnd.getDate() + 5);
    console.log(`Hafta ${i+1}: ${weekStart.toLocaleDateString()} → ${weekEnd.toLocaleDateString()}`);
    currentSunday.setDate(currentSunday.getDate() + 7);
}
```

### CSV Doğrulama
```bash
# İlk ve son tarih
head -2 file.csv | tail -1 | cut -d',' -f1
tail -2 file.csv | head -1 | cut -d',' -f1

# Toplu kontrol
for file in output/*.csv; do
  first=$(head -2 "$file" | tail -1 | cut -d',' -f1 | tr -d '"' | cut -d' ' -f1)
  last=$(tail -2 "$file" | head -1 | cut -d',' -f1 | tr -d '"' | cut -d' ' -f1)
  echo "$first → $last - $(basename "$file")"
done | sort
```

### Node.js Doğrulama
```javascript
const ranges = [
  ['2025-08-17', '2025-08-22'],
  // ...
];

ranges.forEach((r, i) => {
  const start = new Date(r[0]);
  const end = new Date(r[1]);
  const dayStart = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][start.getDay()];
  const dayEnd = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][end.getDay()];
  const diff = Math.round((end - start) / (1000*60*60*24));
  const status = (dayStart === 'Paz' && dayEnd === 'Cum' && diff === 5) ? '✅' : '❌';
  console.log(`${status} #${i+1}: ${r[0]} (${dayStart}) → ${r[1]} (${dayEnd}) - ${diff} gün`);
});
```

---

## Bilinen Sorunlar

### 1. weekly.user.js - Tarih Aralığı Hatası
**Belirti:** Reaktif form alanları tek tek güncellenince aralığı otomatik ters/yanlış hesaplıyordu  
**Durum:** Çözüldü (v2.1 - 2025-10-24)  
**Çözüm:** `dateFrom`/`dateTo` birlikte set + event sırası (to→from) + yeniden doğrulama ve swap-back  
**Not:** DOM değerleri download öncesi loglanıyor; Tampermonkey cache için version bump yapıldı

### 2. Dosya İsimlendirme
**Durum:** Barchart kendi default isim formatını kullanıyor  
**Denendi:** `data-bc-download-button` attribute değiştirme → çalışmadı  
**Çözüm:** Manuel rename veya post-processing script

---

## Geliştirme Notları

### Tampermonkey Cache Sorunları
- Script değişikliği yüklenmiyor: **Namespace/version değiştir**
- Farklı browser'da test et
- Hard refresh: `Cmd+Shift+R`

### Date Objesi JavaScript
```javascript
// ❌ YANLIŞ (referans)
const end = new Date(start);

// ✅ DOĞRU (kopya)
const end = new Date(start.valueOf());
```

### Test Ortamı
- **URL:** `https://www.barchart.com/futures/quotes/DXY00/historical-download`
- **Gerekli:** Barchart Pro login
- **Delay:** 3 saniye (rate limiting)

---

## Sonraki LLM için Talimatlar

1. weekly.user.js v2.1 çalışıyor; regresyon olursa yukarıdaki event-sırası stratejisini uygula
2. Unified script'i BOZMADAN koru (test edilmiş, çalışıyor)
3. İsimlendirme şimdilik manuel/post-processing
4. Debug sırasında DOM loglarını kontrol et; farklı browser ile cache bypass test et

## Kullanıcı Gereksinimleri
- 2 haftalık: ✅ Çalışıyor (unified2w.user.js)
- 1 haftalık: ✅ Çalışıyor (weekly.user.js v2.1)
- İsimlendirme: 📋 Manual olarak yapılacak (şimdilik)
