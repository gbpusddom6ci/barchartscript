# Barchart Historical Data Auto Downloader

Barchart'tan otomatik olarak 2 haftalık periyotlarla historical data indiren Tampermonkey scripti. Tek bir unified script ile 12, 20, 30 ve 60 dakikalık interval'ları destekler.

## Kurulum

### 1. Tampermonkey'i Yükle
- Chrome/Edge: [Tampermonkey - Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- Safari: [Tampermonkey - Safari Extensions](https://apps.apple.com/us/app/tampermonkey/id1482490089)
- Firefox: [Tampermonkey - Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)

### 2. Script'i Yükle
1. Tampermonkey ikonuna tıkla → "Create a new script..."
2. Açılan editörde tüm içeriği sil
3. `unified.user.js` dosyasının içeriğini kopyala yapıştır
4. `File` → `Save` (veya Cmd+S)

## Kullanım

1. Barchart'a login ol (Barchart Pro hesabınla)
2. Şu sayfaya git: https://www.barchart.com/futures/quotes/DXY00/historical-download
3. Sağ altta **"📊 Auto Downloader"** panelini gör
4. Dropdown menüden interval seç (12, 20, 30 veya 60 dakika)
5. **"🚀 İndirmeyi Başlat"** butonuna tıkla
6. Script otomatik olarak:
   - 2025-01-05'ten bugüne kadar olan tüm Pazar günlerini hesaplar
   - Her Pazar'dan 2 hafta sonraki Cuma'ya kadar olan tarihleri kullanır
   - Seçtiğin interval'i ayarlar
   - Her periyot için formu doldurur ve indirir
   - Her indirme arasında 3 saniye bekler

## Özellikler

- **Çoklu Interval Desteği**: 12, 20, 30, 60 dakika seçenekleri
- **Otomatik Tarih Hesaplama**: 2025-01-05'ten bugüne tüm Pazar günleri
- **2 Haftalık Periyotlar**: Her Pazar'dan 2 hafta sonraki Cuma'ya kadar
- **Kullanıcı Dostu UI**: Dropdown menü ile kolay seçim
- **İlerleme Takibi**: Süreci gösteren bilgi kutusu

## Notlar

- Script sadece `https://www.barchart.com/futures/quotes/*/historical-download` URL'lerinde çalışır
- İndirilen dosyalar tarayıcının varsayılan Downloads klasörüne gider
- Sağ üstte yeşil bir bilgi kutusu ilerlemeyi gösterir
- Console'da (F12 → Console) detaylı log görebilirsin
- Her tarih aralığı için ayrı CSV dosyası indirilir

## Sorun Giderme

**Script çalışmıyor:**
- Tampermonkey'in enabled olduğundan emin ol
- Sayfayı yenile (Cmd+R)
- Console'da (F12) hata var mı kontrol et

**Form alanları dolmuyor:**
- Barchart'ın HTML yapısı değişmiş olabilir
- Console'da hangi alanların bulunamadığını görebilirsin
- Script'teki selector'ları güncellememiz gerekebilir

**İndirmeler çok yavaş:**
- `delayBetweenDownloads` değerini azalt (ama rate limit'e dikkat)
- Minimum 1000ms (1 saniye) önerilir

## Örnek Çıktı

```
[30 MIN] İndiriliyor: 1/42 - 01/05/2025 → 01/17/2025
[30 MIN] İndiriliyor: 2/42 - 01/12/2025 → 01/24/2025
[30 MIN] İndiriliyor: 3/42 - 01/19/2025 → 01/31/2025
...
✓ Tamamlandı! 42 dosya indirildi (30 min).
```
