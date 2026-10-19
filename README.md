# Masaüstündeki Halı

Masaüstü dağınıklığına küçük bir halı: herhangi bir noktasından tutup sürükleyin, kumaşın kıvrılıp peşinizden gelmesini izleyin ve dosyaları altına saklayın.

Electron ile geliştirilen, macOS öncelikli bir Windows / macOS masaüstü uygulamasıdır. İlham: [Terkel'in masaüstü halısı](https://x.com/terkelg/status/2107540718461886464). Bu proje bağımsız bir uygulamadır.

![Halı — örnek dosyalarla önizleme](docs/preview.png)

Görsel, örnek dosyalarla çalışan önizleme modundan alınmıştır. Normal kullanımda arka plan şeffaftır; tanıtım metinleri ve örnek dosyalar gösterilmez.

## Özellikler

- **Her noktadan fiziksel tutuş:** Orta alan ve köşeler aynı kumaş fiziğini kullanır. Tutulan nokta yükselir; kalan kumaş esneyip kıvrılarak peşinden gelir. Bırakılan halı eski konumuna çekilmez.
- **Ayarlanabilir ağırlık:** Hafif kumaş daha kolay kalkar ve daha uzun dalgalanır; ağır kumaş daha dirençli hareket eder ve daha çabuk oturur.
- **Ayrı boyutlandırma modu:** Normal sürükleme boyutlandırmayı tetiklemez. Sağ tık menüsünden açılan modda kenar ve köşe tutamaçları görünür.
- **Üç dokuma rengi:** Kök boya, gece mavisi ve yosun yeşili. Doku yerel olarak Canvas ile üretilir.
- **Dosya saklama ve geri getirme:** Masaüstünden bırakılan dosya ve klasörler geri alınabilir biçimde saklanır. Dosya saklamak veya geri getirmek halının görünümünü ve fiziğini değiştirmez.
- **Sağ tık menüsü:** Renk, ağırlık, boyutlandırma ve saklanan dosya bilgileri burada bulunur. Normal görünümde altta sayaç veya ayar çubuğu yoktur.
- **Oturum açılışında başlatma:** Windows ve kurulu macOS `.app` sürümünde kullanılabilir; macOS sistem onayı gerekiyorsa arayüz bunu gösterir.
- **Menü çubuğu / sistem tepsisi ve kısayol:** Halıyı gösterme, gizleme ve düzeltme.

## Platform durumu

**macOS Universal DMG/ZIP, GitHub'ın Apple Silicon Mac ortamında üretildi; birim, native, arayüz ve paketli açılış testleri geçti.** Kullanıcının gerçek masaüstü, izin, Spaces ve Intel cihaz kontrolleri ayrıca yapılmalıdır. Windows'un yeni masaüstü katmanı derlendi ve Win32 API yükleme kontrolünden geçti; Explorer, Win+D ve çoklu pencere davranışı için cihaz testi gerekir. Bu proje geliştirme aşamasındadır. Derlemenin başarılı olması, masaüstü etkileşimlerinin doğrulandığı anlamına gelmez.

| Özellik | macOS | Windows |
| --- | --- | --- |
| Kumaş fiziği, ağırlık, renk ve boyutlandırma | Mac CI testleri geçti | Uygulandı |
| Dosya saklama / geri getirme | Ortak kod; Mac testi gerekli | Uygulandı |
| Şeffaf pencere, boş alanlarda tıklama geçişi | Mac testi gerekli | Uygulandı |
| Gerçek masaüstü seviyesine sabitleme | Cocoa / Node-API CI kontrolü geçti; Spaces cihaz testi gerekli | Win32 sıralama katmanı; cihaz testi gerekli |
| Oturum açılışında başlatma seçeneği | Kurulu `.app`, gerektiğinde sistem onayı; Mac testi gerekli | Uygulandı |
| Dağıtım akışı | GitHub Actions: Universal DMG / ZIP | GitHub Actions: tek dosyalık portable EXE |

Birincil ekran desteklenir. macOS yerel katmanı pencereyi masaüstü simgelerinin hemen üstüne, normal uygulama pencerelerinin altına yerleştirir. Katman derlenmemişse uygulama uyarı vererek normal pencere olarak açılır. Windows yardımcısı halıyı Explorer masaüstünün hemen üstünde tutar; normal pencereler üstte kalır. Sağ tık menüsü açıldığında sıralama geçici olarak serbest bırakılır. Yardımcı Win+D sonrası halıyı geri gösterir, gizle komutuna müdahale etmez ve Explorer yeniden başladığında masaüstünü tekrar bulur. Başka uygulamaların pencere ebeveynlerini veya masaüstü ayarlarını değiştirmez.

## Kaynak koddan çalıştırma

Node.js 24 ve pnpm 11.25.0 gerekir. Kaynaktan çalıştırma içindir; paketlenmiş uygulamayı kullanan kişinin Node.js kurmasına gerek yoktur.

```sh
git clone https://github.com/menura02/masaustundeki_hali.git
cd masaustundeki_hali
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
```

### Windows

```sh
npm start
```

Kaynaktan çalıştırırken Windows masaüstü ve güvenli taşıma yardımcısı sistemdeki .NET Framework derleyicisiyle kullanıcı veri klasöründe derlenir. Kurulum paketinde yardımcı önceden derlenmiş olarak bulunur; son kullanıcıda derleyici aranmaz. Masaüstü simgelerinin adları veya konumları okunmaz.

### macOS

Xcode Command Line Tools gerekir. Kurulu değilse önce:

```sh
xcode-select --install
```

Ardından:

```sh
npm run native
npm start
```

`npm run native`, macOS masaüstü katmanını Intel ve Apple Silicon için derler. macOS dosya işlemleri için standart Masaüstü erişim izni isteyebilir.

macOS otomatik başlangıcı geliştirme sırasında Electron'u yanlışlıkla kaydetmemek için yalnızca paketlenmiş `.app` sürümünde açılabilir. Uygulamayı Applications klasörüne taşıyın. macOS onay isterse menüdeki **Oturum açma ayarlarını aç** düğmesiyle ilgili ayarlara gidin.

### Gerçek dosyalara dokunmadan deneme

```sh
npm run demo
```

Bu mod kendi penceresinde örnek dosyalar kullanır. Gerçek masaüstü dosyalarını taşımaz ve Windows başlangıç kaydını değiştirmez.

Yalnızca görsel etkileşimleri tarayıcıda denemek için:

```sh
npm run preview
```

Adres: [http://127.0.0.1:4173](http://127.0.0.1:4173). Tarayıcı önizlemesi gerçek masaüstü entegrasyonunu içermez.

## Kullanım

| İşlem | Nasıl yapılır? |
| --- | --- |
| Halıyı hareket ettirme / katlama | Herhangi bir noktasından tutup sürükleyin. |
| Kontrolleri açma | Halıya sağ tıklayın; klavyeden `Shift+F10` da kullanılabilir. |
| Menüyü kapatma | Menü dışına tıklayın, Escape'e basın veya başka uygulamaya geçin. Menü kullanılmıyorsa otomatik kapanır. |
| Boyutlandırma | Sağ tık → **Boyutlandır**, ardından kenarları sürükleyin. **Bitti**, Enter, Escape veya dışarı tıklama moddan çıkarır. |
| Ağırlık | Sağ tık → **Halı ağırlığı**; 0 hafif, 100 ağır, varsayılan 50. Kilogram ölçüsü değildir. |
| Düzeltme | Sağ tık → **↺**; halı bulunduğu konumda animasyonla açılır. |
| Dosya saklama | Doğrudan masaüstündeki dosya veya klasörleri halıya bırakın. |
| Dosyaları geri getirme | Sağ tık → **saklanan** / **Altındakiler**; tek tek ↗ veya **Hepsini masaüstüne geri koy**. |
| Gösterme / gizleme | macOS: `⌘⇧H`, Windows: `Ctrl+Shift+H`; tepsi menüsü de kullanılabilir. |
| Otomatik başlatma | Sağ tık → **Windows / macOS ile birlikte başlat**; işareti kaldırmak kapatır. Demo modunda pasiftir. macOS'ta kurulu `.app` gerekir. |

Renk, ağırlık, boyut ve konum yeniden açılışta hatırlanır. Başlangıç durumu işletim sisteminden okunur; uygulama ilk açılışta kendiliğinden başlangıca eklenmez. Windows geliştirme klasörünü taşırsanız başlangıç seçeneğini kapatıp yeniden açın.

## Saklanan dosyalar ve kurtarma

Dosyalar masaüstündeki **`.hali-vault`** klasöründe benzersiz kimliklerle saklanır. `index.json`, özgün adlarını ve halı üzerindeki bırakılma konumlarını tutar. `index.backup.json` yedeği ve `.metadata/` altında dosya başına ad kaydı ayrıca saklanır.

- **`.hali-vault` klasörünü silmeyin.** Uygulamayı kaldırmadan önce dosyaları panelden geri getirin.
- Uygulamadan çıkmak dosyaları otomatik geri taşımaz. Yeniden açıp panelden geri getirebilirsiniz.
- Geri getirme sırasında aynı adlı bir dosya varsa mevcut dosya korunur; geri getirilen öğeye `(Halı 1)` gibi bir ek eklenir. Hedef dosya işlem sırasında son anda oluşsa da üzerine yazılmaz.
- Taşıma öncesi günlük kaydı yazılır. Yarım kalan işlemler yeniden açılışta disk üzerindeki durumdan toparlanır.
- Aynı disk üzerinde atomik taşıma kullanılır; farklı diskler arasında kopyala / sil işlemi yapılmaz. Güvenli taşıma Windows üzerinde `MoveFileExW` (üzerine yazma olmadan), macOS üzerinde `renamex_np(RENAME_EXCL)` kullanır. Yerel bileşen çalışmıyorsa güvensiz bir taşıma yöntemine geçilmez; hata gösterilir. Bir grubun bir kısmı taşındıysa taşınanlar panelde görünmeye devam eder.

Ana kayıt eksik veya bozuksa yedek ve dosya başına metaveriyle kurtarma denenir. Eski kasalarda ad bilgisi bulunamayan dosyalar içerikleri korunarak **Kurtarılan-…** adıyla panelde listelenir. Panelde kurtarma açıklaması ve **Kasa klasörünü aç** düğmesi bulunur. Bozuk ana kayıt ayrıca saklanır.

Uygulama açılmıyorsa `.hali-vault` içindeki dosyalar `index.json` kaydına göre elle özgün adlarına döndürülebilir. macOS Finder'da `⌘⇧.` gizli öğeleri gösterir; Windows'ta Dosya Gezgini'nin gizli öğeler görünümü kullanılabilir.

Dosya içerikleri uygulama tarafından okunmaz veya internete gönderilmez. Hesap, sunucu veya bulut hizmeti gerekmez.

## Tek dosya olarak paketleme

Paketleme komutları yapılandırılmıştır; bu repo önceden üretilmiş bir kurulum dosyası içermez. Çıktılar `dist/` klasörüne yazılır.

### GitHub üzerinden derleme

`.github/workflows/build.yml`, `main` dalına gönderimde ve elle **Actions → Desktop installers → Run workflow** komutuyla çalışır. macOS ve Windows makinelerinde kilitli pnpm kurulumu, yerel derleme, birim testleri, Electron etkileşim/kurtarma/boşta çalışma testleri, paketleme ve paketli uygulamanın açılış/güvenli taşıma kontrolü yapılır. Başarılı çalışmanın **Artifacts** bölümünden `hali-macOS` veya `hali-Windows` indirilir. macOS arşivinde tek bir Universal `.dmg`, Windows arşivinde çift tıklanınca açılan tek bir portable `.exe` bulunur. Akış ilk kez gerçekten çalıştırılıp başarılı olmadan paket varmış gibi kabul edilmemelidir. Apple imza hesabı veya noter onayı kullanılmaz.

### macOS: imzasız DMG

**Bir Mac üzerinde** çalıştırın:

```sh
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac
```

Komut yerel katmanı derler ve Universal DMG / ZIP çıktıları hedefler. Tek kullanıcıya `dist/` içindeki `.dmg` dosyası verilebilir. Kullanıcı açıp Halı'yı Applications klasörüne sürükler. Apple Developer hesabı, imza veya noter onayı bu kişisel dağıtım için yapılandırılmaz. macOS ilk açılışı engellerse kullanıcı Sistem Ayarları → Gizlilik ve Güvenlik üzerinden elle izin vermek zorunda kalabilir.

Universal paket [başarılı Mac derleme işiyle](https://github.com/menura02/masaustundeki_hali/actions/runs/39256906052) üretildi ve Apple Silicon üzerinde paketli açılışı test edildi. Intel cihaz testi henüz yapılmadı. Windows üzerinde macOS yerel katmanı ve DMG üretimi yapılmaz.

### Windows: çift tıklayınca açılan tek EXE

Windows üzerinde:

```sh
npm run dist:win
```

Çıktı `dist/Hali-0.1.0-Portable.exe` dosyasıdır. Bu tek dosyayı istediğiniz klasöre kopyalayıp çift tıklayın; Node.js kurmak veya yanında `win-unpacked` klasörünü taşımak gerekmez. Uygulama gerekli bileşenleri açılışta geçici klasöre çıkarır. İlk açılış bu nedenle birkaç saniye sürebilir.

Ayarlar kullanıcı profilinde, saklanan dosyalar masaüstündeki `.hali-vault` klasöründe kalır; EXE içine gömülmez. Başlangıç seçeneği geçici çıkarma klasörünü değil asıl portable EXE’yi kaydeder. EXE’yi sonradan taşırsanız başlangıç seçeneğini kapatıp yeniden açın.

Bu repo imza sertifikası içermez; Windows güvenlik uyarısı gösterebilir. İsteğe bağlı klasik kurulum dosyası için `npm run dist:win:installer` kullanılabilir.

## Doğrulama

```sh
npm run native
npm test
npm run test:app
npm run test:native
```

Birim testleri dosya bütünlüğünü, isim çakışmalarını, kesinti kurtarmasını, kumaş fiziğini, boyutlandırmayı, çizim döngüsünün boşta durmasını, Windows pencere kimliklerini ve iki platformun başlangıç ayarlarını kapsar. Electron testi ayrı bir kullanıcı profili ve örnek dosyalar kullanır; ekran görüntülerini `artifacts/` klasörüne yazar. `test:native` macOS modülünü gerçek Electron pencere kimliğiyle yükler veya Windows yardımcısının Win32 bağlamasını kontrol eder; dosya/klasör üzerine yazmama kontrolünü de çalıştırır; etkileşimli masaüstü doğrulamasının yerine geçmez.

Odaklı arayüz kontrolleri:

```sh
npx electron scripts/smoke.cjs --counters-only
npx electron scripts/smoke.cjs --menu-dismiss-only
npx electron scripts/smoke.cjs --startup-only
pnpm exec electron scripts/smoke.cjs --performance-only
pnpm exec electron scripts/smoke.cjs --reliability-only
```

Başlangıç testi Windows kayıt defterine yazmak yerine bellek içi bir işletim sistemi adaptörü kullanır. Gerçek oturum açılışı ve macOS masaüstü davranışı ayrıca cihaz üzerinde doğrulanmalıdır.

Kaynak kullanımı için halı durulduğunda veya pencere gizlendiğinde çizim döngüsü durur; etkileşimle yeniden başlar. Animasyon sırasında üçgen ağı yeniden kullanılır ve ekranın yalnızca halının kapladığı bölgesi temizlenir. Performans arayüz testi boşta/gizliyken çizimin durmasını ve renk değişimi/pencere gösterimiyle yeniden başlamasını kontrol eder.

İlk cihaz doğrulaması için [platform test listesi](docs/platform-testing.md) kullanılabilir.

## Proje yapısı

```text
desktop/     Electron başlangıcı, IPC, dosya kasası ve başlangıç ayarı
ui/          Kumaş fiziği, dokuma dokusu ve sağ tık arayüzü
native/      macOS masaüstü katmanı
scripts/     Yerel derleme, önizleme sunucusu ve Electron kontrolleri
test/        Otomatik testler
docs/        README görseli
```

Uygulama giriş noktası `desktop/main.cjs` dosyasıdır. Render süreci sandbox ve context isolation ile çalışır; dosya işlemleri doğrulanan IPC çağrılarıyla ana süreçte yapılır.

Güvenilirlik geliştirmeleri: ayarlar doğrulanır ve atomik olarak kaydedilir; normal çıkış bekleyen kaydı tamamlar. Ekran boyutu değişirken aktif tutuş güvenle bitirilir. Kumaş süre dolduğu için dondurulmaz; dinlendiğinde uyur. Platform yardımcısı çalışmazsa sağ tık menüsünde durum gösterilir.

Paketleme sonrasında `node scripts/package-smoke.cjs`, paketli uygulamayı geçici profil ile açıp arayüzü ve native güvenli taşımayı kontrol eder. Gerçek masaüstüne veya başlangıç kaydına dokunmaz. Bu kontrol, kurulum programını kullanıcı sistemine kurma testinin yerine geçmez.

Tek dosyalık Windows sürümü `node scripts/package-smoke.cjs --portable` ile gerçek portable başlatıcı üzerinden test edilir.

19 Ekim 2026 Mac çıktısı: `Hali-0.1.0-macOS-universal.dmg`. DMG tek bir dağıtım dosyasıdır; açıp Halı uygulamasını Applications klasörüne taşıyın, ardından uygulama simgesine çift tıklayın. Windows EXE ve macOS uygulaması ayrı dosyalardır.
