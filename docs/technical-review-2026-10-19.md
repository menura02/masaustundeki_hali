# Teknik inceleme — Masaüstündeki Halı

Tarih: 19 Ekim 2026

## Kapsam ve sonuç

İnceleme, b86c1be commit'i üzerindeki güncel yerel çalışma ağacını kapsar. Simge sayma özelliğinin kaldırılması da kapsama dahildir; bu kaldırma henüz commit edilmemiştir. Uygulama kaynak kodunda bu inceleme kapsamında düzeltme yapılmadı. Kanıt denemeleri artifacts/ altındaki ayrı test klasörlerinde çalıştırıldı; kullanıcının masaüstü dosyalarına dokunulmadı.

Temel mimari küçük bir masaüstü uygulaması için uygun. Ancak dosya saklayan bir ürün açısından iki veri koruma açığı giderilmeden güvenilir bir dağıtım olarak değerlendirmem. 24 mevcut test geçti; testlerin geçmesi aşağıdaki eksik senaryoların güvenli olduğu anlamına gelmiyor.

P1: İlk düzeltilmesi gereken veri koruma sorunları. P2: İşlevsel güvenilirlik veya dağıtım eksikleri. Öneri: Mevcut bir hata olarak doğrulanmayan geliştirme fırsatı.

## Bulgular

### F1 — P1: Geri getirme sırasında son anda oluşan dosyanın üzerine yazılabiliyor

Konum: desktop/vault.cjs:79–82.

Hedef ad önce lstat ile kontrol ediliyor, sonra ayrı bir işlemle rename yapılıyor. İki işlem arasına başka bir uygulama veya senkronizasyon aracının dosya oluşturması girebilir. Vault'un kendi işlem kuyruğu dış süreçleri kilitlemez.

Doğrulama: İzole klasörde hedef yokken, rename çağrısından hemen önce aynı hedefte yeni bir dosya oluşturuldu. Restore başarıyla tamamlandı; dış dosyanın içeriği kaybolup saklanan dosyanın içeriğiyle değişti. Mevcut isim çakışması testi yalnızca restore başlamadan önce var olan hedefi kapsıyor.

Öneri: Desteklenen platformlarda hedef varsa başarısız olan atomik taşıma işlemi kullanın. Çakışma hatasında yeni adla tekrar deneyin. Dosya, klasör ve bağlantı türleri ayrı ele alınmalı. Yalnızca ikinci bir varlık kontrolü eklemek yarışı çözmez. Bu senaryo kalıcı regresyon testine eklenmeli.

### F2 — P1: Kayıt dosyası kaybında kasadaki dosyalar görünmez hale geliyor

Konum: desktop/vault.cjs:17–18, 25–32.

index.json bulunamazsa uygulama bunu yeni ve boş kasa olarak kabul ediyor. Kasa içinde mevcut UUID adlı dosyalar olup olmadığı kontrol edilmeden boş kayıt yazılıyor. JSON bozulursa ise init hatası boot'a taşınıp uygulamanın kapanmasına yol açıyor.

Doğrulama: Dosya saklandı, yalnızca test kasasının index.json dosyası kaldırıldı ve kasa yeniden açıldı. Fiziksel dosya kasada dururken görünür öğe sayısı 0 oldu; index.json [] içeriğiyle yeniden oluşturuldu. Dosya silinmiyor, fakat uygulamadan geri alınamıyor ve özgün ad bilgisi kurtarılamıyor.

Öneri: Eksik/bozuk kayıt ile yeni kasayı ayırın. Boş kayıt yazmadan önce yetim öğeleri tespit edin; kurtarma ekranı ve kasayı aç seçeneği sağlayın. Sürümlü şema, son sağlam kayıt yedeği ve mümkünse öğe başına özgün ad metaverisi tutun. Disk dolması, eksik kayıt ve bozuk JSON senaryolarını test edin.

### F3 — P2: Sürükleme sırasında yeniden boyutlandırma renderer hatasına yol açıyor

Konum: ui/app.js:104–107 ve 177.

resize(), yeni bir Cloth oluşturuyor; drag değişkeni ise önceki tutuşu taşımaya devam ediyor. Yeni kumaşın grab alanı null olduğundan sonraki pointermove, cloth.grab.x yazarken TypeError üretiyor. Ekran ölçüsü/ölçek değişikliği veya demo pencere boyutu değişikliği bu yolu tetikleyebilir.

Doğrulama: Gerçek Electron demo penceresinde tutuş başlatılıp resize olayı ve ardından pointermove üretildi. Yakalanan hata: Cannot set properties of null (setting 'x').

Öneri: Kumaşı değiştirmeden önce aktif tutuşu ve pointer capture'ı güvenli biçimde bitirin veya tutuşu yeni geometriye açıkça taşıyın. DPI değişimi/sürükleme birleşimi için entegrasyon testi ekleyin.

### F4 — P2: Altı saniyelik sınır kumaş dinlenmeden animasyonu dondurabiliyor

Konum: ui/app.js:42 ve 266–267.

Dinlenme kontrolü mevcut olsa da awakeUntil süresi dolduğunda hareket devam etse bile çizim/fizik duruyor. Sonraki etkileşimde fizik kaldığı yerden devam edebilir; bu, aniden durma ve tekrar hareket etme hissi yaratır.

Doğrulama: Aynı köşe tutuşu bırakılıp 360 fizik adımı çalıştırıldı. Ağırlık 0, 0.5 ve 1 için isResting() false kaldı. En büyük nokta hareketleri sırasıyla yaklaşık 0.074, 0.106 ve 0.446 piksel/adımdı.

Öneri: Normal uyku kararını ardışık dinlenme ölçümlerine bağlayın. Mutlak süreyi yalnızca bozulmuş/kararsız simülasyon için kurtarma sınırı olarak kullanın; sınır aşımını kontrollü sönümleme veya açık bir toparlama ile ele alın.

### F5 — P2: Ayarlar atomik yazılmıyor ve çıkışta bekleyen kayıt tamamlanmıyor

Konum: desktop/main.cjs:29–30, 102 ve 133.

Ayarlar 300 ms gecikmeli, doğrudan rug.json üzerine yazılıyor. Çıkışta bekleyen zamanlayıcı veya başlamış yazma için flush yapılmıyor. Son değişiklik hemen çıkışta kaybolabilir; yazma sırasında kesinti dosyayı yarım bırakabilir. Okunan JSON için de şema/nesne doğrulaması yok; geçerli JSON olan null gibi bir değer renderer başlangıcını bozabilir.

Bu bulgu kod akışına dayanır; bu incelemede güç kesintisi veya ani süreç sonlandırma deneyi yapılmadı.

Öneri: Tek bir ayar servisi, şema doğrulama, varsayılanlara dönüş, sıralı geçici dosya + rename kaydı ve kontrollü çıkışta flush ekleyin. Kullanıcının son tercihleri kaybolmamalı.

### F6 — P2: Windows masaüstü katmanı hataları kullanıcıya görünmüyor; imzasız yardımcı bağımlılığı sürüyor

Konum: desktop/main.cjs:108, desktop/windows-desktop.cjs:16–25, desktop/windows-helper.cjs:16–23.

DesktopIcons kaldırıldı, fakat masaüstü sıralaması için DesktopLayer.exe halen derlenip başlatılıyor. Bu başka bir yardımcı programdır; simge adları veya konumları okumaz. Güvenlik politikasının bunu da engellemesi olasılığı ortadan kalkmış değildir. Okuyucunun kaldırılması tüm imzasız EXE riskini çözmüş sayılmaz.

Helper hataları available=false ve console.error seviyesinde kalıyor; kullanıcı katmanın neden çalışmadığını göremiyor. Mevcut PC'de DesktopLayer'ın güvenlik tarafından engellendiği bu incelemede doğrulanmadı.

Öneri: Platform katmanının hazır/başlatılamadı/normal pencere olarak çalışıyor durumlarını arayüze taşıyın. Dağıtımda yardımcıları da kapsayan imza stratejisini belirleyin. Güvenlik engelini uygulama hatasından ayırın; tekrar başlatma sayısını sınırlayın.

### F7 — P2: CI bağımlılıkları kilitlemiyor ve arayüz akışlarını çalıştırmıyor

Konum: .github/workflows/build.yml:28–34; pnpm-lock.yaml; package.json:12.

Repoda pnpm kilidi bulunmasına rağmen CI npm install kullanıyor; npm kilit dosyası yok. Böylece aynı kaynak commit'i farklı geçişli bağımlılıklarla derlenebilir. CI birim testini ve native yükleme kontrolünü çalıştırıyor, ancak mevcut Electron etkileşim testi çalıştırılmıyor. Paketlenmiş uygulamanın başlatılması da doğrulanmıyor.

Öneri: Tek paket yöneticisi seçin ve kilidi zorunlu kullanan kurulum yapın. Uygun grafik oturumu bulunan Windows/macOS işlerinde temel Electron senaryolarını ekleyin. Kurulumdan sonra gerçek paketli uygulama için açılış ve native kaynak yükleme kontrolü yapın; sadece paket üretimini başarı saymayın.

### F8 — Yayın öncesi eksik: macOS ana kullanım yolları cihazda doğrulanmamış

Konum: docs/platform-testing.md; native/mac.mm.

macOS öncelikli olmasına karşın gerçek cihazda şeffaflık, tıklama geçişi, Spaces/Mission Control, oturum açılışı ve dosya erişimi doğrulaması halen açık. Native yükleme testi bu işletim sistemi davranışlarını kanıtlamaz. Bu bir kanıt eksikliğidir; tek başına macOS kodunun hatalı olduğu iddiası değildir.

Öneri: Önce hedef kullanıcının Mac'inde paketli uygulamayı doğrulayın. Intel desteği ilan edilecekse Intel testi de ekleyin. Apple onayı/noterleme olmadan kişisel kullanım hedefi korunabilir; buna rağmen gerçek paketli açılış ve dosya geri alma kontrolü gerekir.

## Güçlü taraflar

- Renderer sandbox, context isolation ve kapalı Node entegrasyonuyla çalışıyor. IPC göndereni kontrol ediliyor; dış navigasyon ve yeni pencere açılması engelleniyor.
- Kasa işlemleri uygulama içinde sıralanıyor. Taşımadan önce kayıt yazılması ve byte-for-byte dosya testleri iyi bir temel.
- Kumaş fiziği, boyutlandırma ve çizim zamanlaması ayrı modüllerde. Boşta/gizliyken çizimi durduran yaklaşım yerinde.
- Simge sayımının Windows ve macOS bağımlılıkları, arayüzü ve paketleme girdileri güncel yerel sürümden çıkarılmış.

## Geliştirme önerileri

1. Önce dosya güvenliği: F1 ve F2. Ardından F3 ve F5 ile etkileşim/kalıcılık güvenilirliği.
2. Kurtarma ekranı: Kasayı aç, yetim öğeleri listele, kayıt yedeğinden dön ve hata raporunu dışa aktar. Gizli kasa kullanıcının tek kurtarma yolu olmamalı.
3. Çoklu dosya işlemlerinde ilerleme ve kısmi başarı sonucu: Bazı öğeler taşınıp sonraki öğede hata olursa kullanıcı hangi öğelerin saklandığını açıkça görmeli. Toplu geri getirme için ana süreçte tek işlem ve daha az UI güncellemesi düşünülebilir.
4. Kaynak kullanımı için tekrar edilebilir ölçümler: Boşta ve sürükleme sırasında toplam özel bellek, CPU, kare süresi ve uzun süreli bellek artışı. Fare sorgusundaki hızlanma toplam uygulama RAM/CPU kazanımı olarak sunulmamalı.
5. Tam ekran, yüksek çözünürlüklü canvas ileride bellek azaltma fırsatı; şu aşamada Electron'u değiştirmekten önce veri güvenliği ve platform doğrulamasına öncelik verilmeli.
6. UI dosyasını etkileşim, dosya paneli ve çizim sorumluluklarına ayırın. Mevcut ölçek için yeni bir UI framework'ü veya kapsamlı yeniden yazım gerekli görünmüyor.
7. Klavye odağı, menü/panel açılıp kapanınca odağın geri dönmesi ve azaltılmış hareket tercihi için erişilebilirlik kontrolleri ekleyin.

## Doğrulama kaydı

- node --test test/*.test.cjs: 24/24 geçti; geçici dosya klasörleri kullanıldı.
- Geri getirmede hedef dosyanın son anda oluşması: üzerine yazma yeniden üretildi.
- Kasa kaydı silinince yeniden açma: fiziksel öğe dururken listede 0 öğe ve boş yeni kayıt yeniden üretildi.
- Sürükleme + resize: Electron demo penceresinde null grab hatası yeniden üretildi.
- Altı saniyelik fizik kontrolü: üç ağırlıkta da dinlenme koşulu sağlanmamıştı.
- Gerçek Mac, imzalı Windows kurulum paketi, güç kesintisi ve kullanıcı masaüstü dosyaları üzerinde test yapılmadı.

## İnceleme sonrası uygulanan geliştirmeler

Bu bölüm ilk incelemedeki bulguların ardından yapılan çalışmayı kaydeder; üstteki bulgular önceki durumun kanıtıdır.

- F1: Windows/macOS yerel üzerine-yazmadan taşıma; dosya ve klasör çakışması regresyonları.
- F2: Ana kayıt yedeği, öğe başına metaveri, bozuk kayıt koruma, yetim öğe kurtarma ve kasa paneli.
- F3: Ekran değişiminden önce aktif tutuşu güvenle bitirme.
- F4: Altı saniyelik koşulsuz dondurmanın kaldırılması; uyku gerçek dinlenmeye bağlı.
- F5: Doğrulanan ayar servisi, sıralı/atomik kayıt, normal çıkışta flush ve dosya işlemlerini bekleme.
- F6: Masaüstü katmanı durumunun kullanıcıya bildirilmesi; güvenli taşıma bileşeni yokken işlem yapılmaması. Güvenilir Windows imza sertifikası eklenmedi.
- F7: Sabit pnpm sürümü/frozen lockfile, CI arayüz/kurtarma testleri ve paketli uygulama kontrolü.
- F8: Gerçek Mac cihaz doğrulaması bu Windows ortamında tamamlanamaz; cihaz kontrol listesi devam ediyor.

Son doğrulama: 35/35 birim ve regresyon testi geçti. Electron tam etkileşim, boşta/gizli çizim ve kurtarma/resize/hemen çıkış ayar kaydı kontrolleri geçti. Windows native güvenli taşıma ve güncel win-unpacked paketinin renderer/native dosya-klasör çakışma koruması kontrolü geçti. pnpm frozen lockfile çevrimdışı doğrulandı. NSIS kurulum işlemi, gerçek Mac cihazı ve Windows güvenilir sertifika imzası bu doğrulamanın kapsamında değildir. Değişiklikler henüz commit edilmedi veya GitHub’a gönderilmedi.
