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
- **Sağ tık menüsü:** Renk, ağırlık, boyutlandırma, kapalı simge ve saklanan dosya bilgileri burada bulunur. Normal görünümde altta sayaç veya ayar çubuğu yoktur.
- **Oturum açılışında başlatma:** Windows ve kurulu macOS `.app` sürümünde kullanılabilir; macOS sistem onayı gerekiyorsa arayüz bunu gösterir.
- **Menü çubuğu / sistem tepsisi ve kısayol:** Halıyı gösterme, gizleme ve düzeltme.

## Platform durumu

**macOS sürümünün entegrasyonları ve paketleme akışı mevcut; henüz gerçek bir Mac üzerinde doğrulanmadı.** Windows'un yeni masaüstü katmanı derlendi ve Win32 API yükleme kontrolünden geçti; Explorer, Win+D ve çoklu pencere davranışı için cihaz testi gerekir. Bu proje geliştirme aşamasındadır. Derlemenin başarılı olması, masaüstü etkileşimlerinin doğrulandığı anlamına gelmez.

| Özellik | macOS | Windows |
| --- | --- | --- |
| Kumaş fiziği, ağırlık, renk ve boyutlandırma | Ortak kod; Mac testi gerekli | Uygulandı |
| Dosya saklama / geri getirme | Ortak kod; Mac testi gerekli | Uygulandı |
| Şeffaf pencere, boş alanlarda tıklama geçişi | Mac testi gerekli | Uygulandı |
| Gerçek masaüstü seviyesine sabitleme | Cocoa / Node-API; Mac testi gerekli | Win32 sıralama katmanı; cihaz testi gerekli |
| Kapalı masaüstü simgelerini sayma | Finder, Otomasyon izniyle; Mac testi gerekli | Explorer üzerinden salt okunur |
| Oturum açılışında başlatma seçeneği | Kurulu `.app`, gerektiğinde sistem onayı; Mac testi gerekli | Uygulandı |
| Dağıtım akışı | GitHub Actions: Universal DMG / ZIP | GitHub Actions: NSIS kurulum EXE |

Birincil ekran desteklenir. macOS yerel katmanı pencereyi masaüstü simgelerinin hemen üstüne, normal uygulama pencerelerinin altına yerleştirir. Katman derlenmemişse uygulama uyarı vererek normal pencere olarak açılır. Windows yardımcısı halıyı Explorer masaüstünün hemen üstünde tutar; normal pencereler üstte kalır. Sağ tık menüsü açıldığında sıralama geçici olarak serbest bırakılır. Yardımcı Win+D sonrası halıyı geri gösterir, gizle komutuna müdahale etmez ve Explorer yeniden başladığında masaüstünü tekrar bulur. Başka uygulamaların pencere ebeveynlerini veya masaüstü ayarlarını değiştirmez.

## Kaynak koddan çalıştırma

Node.js 22 veya üzeri ve npm gerekir. Kaynaktan çalıştırma içindir; paketlenmiş uygulamayı kullanan kişinin Node.js kurmasına gerek yoktur.

```sh
git clone https://github.com/menura02/masaustundeki_hali.git
cd masaustundeki_hali
npm install
```

### Windows

```sh
npm start
```

Kaynaktan çalıştırırken Windows simge okuyucusu ve masaüstü yardımcısı sistemdeki .NET Framework derleyicisiyle kullanıcı veri klasöründe derlenir. Kurulum paketinde yardımcılar önceden derlenmiş olarak bulunur; son kullanıcıda derleyici aranmaz. Simgeler Explorer'ın MSAA arayüzünden salt okunur alınır. Okuyucu kullanılamıyorsa simge sayacı hata durumunu gösterir; sıfır simge varmış gibi davranmaz.

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

Simge sayımı için Finder'a **Otomasyon** izni gerekir. İlk okumada macOS izin isteyebilir. Reddederseniz tekrar tekrar izin istenmez; sağ tık menüsünden **Simge erişimini yeniden dene** kullanılabilir. Sistem Ayarları → Gizlilik ve Güvenlik → Otomasyon bölümündeki Finder izni kontrol edilebilir. Ekran kaydı veya erişilebilirlik izni kullanılmaz; Finder'dan yalnızca simge adları ve mantıksal ekran konumları okunur.

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

**Kapalı simge** sayısı ile **saklanan dosya** sayısı farklıdır. Merkezi halının görünür şekli altında kalan masaüstü simgeleri ayrıca sayılır; bu işlem dosyaları taşımaz. macOS'ta Finder izni reddedilmişse sıfır yerine kullanılamıyor durumu gösterilir.

## Saklanan dosyalar ve kurtarma

Dosyalar masaüstündeki **`.hali-vault`** klasöründe benzersiz kimliklerle saklanır. `index.json`, özgün adlarını ve halı üzerindeki bırakılma konumlarını tutar.

- **`.hali-vault` klasörünü silmeyin.** Uygulamayı kaldırmadan önce dosyaları panelden geri getirin.
- Uygulamadan çıkmak dosyaları otomatik geri taşımaz. Yeniden açıp panelden geri getirebilirsiniz.
- Geri getirme sırasında aynı adlı bir dosya varsa mevcut dosya korunur; geri getirilen öğeye `(Halı 1)` gibi bir ek eklenir.
- Taşıma öncesi günlük kaydı yazılır. Yarım kalan işlemler yeniden açılışta disk üzerindeki durumdan toparlanır.
- Aynı disk üzerinde atomik taşıma kullanılır; farklı diskler arasında kopyala / sil işlemi yapılmaz. Taşıma başarısızsa hata gösterilir. Bir grubun bir kısmı taşındıysa taşınanlar panelde görünmeye devam eder.

Uygulama açılmıyorsa `.hali-vault` içindeki dosyalar `index.json` kaydına göre elle özgün adlarına döndürülebilir. macOS Finder'da `⌘⇧.` gizli öğeleri gösterir; Windows'ta Dosya Gezgini'nin gizli öğeler görünümü kullanılabilir.

Dosya içerikleri uygulama tarafından okunmaz veya internete gönderilmez. Hesap, sunucu veya bulut hizmeti gerekmez.

## Tek dosya olarak paketleme

Paketleme komutları yapılandırılmıştır; bu repo önceden üretilmiş bir kurulum dosyası içermez. Çıktılar `dist/` klasörüne yazılır.

### GitHub üzerinden derleme

`.github/workflows/build.yml`, `main` dalına gönderimde ve elle **Actions → Desktop installers → Run workflow** komutuyla çalışır. macOS ve Windows makinelerinde birim testleri, yerel derleme, yerel yükleme kontrolü ve paketleme yapılır. Başarılı çalışmanın **Artifacts** bölümünden `hali-macOS` veya `hali-Windows` indirilir. macOS arşivinde tek bir Universal `.dmg`, Windows arşivinde tek bir kurulum `.exe` bulunması hedeflenir. Akış ilk kez gerçekten çalıştırılıp başarılı olmadan paket varmış gibi kabul edilmemelidir. Apple imza hesabı veya noter onayı kullanılmaz.

### macOS: imzasız DMG

**Bir Mac üzerinde** çalıştırın:

```sh
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac
```

Komut yerel katmanı derler ve Universal DMG / ZIP çıktıları hedefler. Tek kullanıcıya `dist/` içindeki `.dmg` dosyası verilebilir. Kullanıcı açıp Halı'yı Applications klasörüne sürükler. Apple Developer hesabı, imza veya noter onayı bu kişisel dağıtım için yapılandırılmaz. macOS ilk açılışı engellerse kullanıcı Sistem Ayarları → Gizlilik ve Güvenlik üzerinden elle izin vermek zorunda kalabilir.

Bu yapılandırma henüz bir Mac üzerinde derlenip doğrulanmadı. Windows üzerinde macOS yerel katmanı ve DMG üretimi yapılmaz.

### Windows: kurulum EXE

Windows üzerinde:

```sh
npm run dist:win
```

NSIS kurulum dosyası hedeflenir. Bu repo imza sertifikası içermez; imzasız paket işletim sistemi uyarısı gösterebilir.

## Doğrulama

```sh
npm test
npm run test:app
npm run native
npm run test:native
```

Birim testleri dosya bütünlüğünü, isim çakışmalarını, kesinti kurtarmasını, kumaş fiziğini, boyutlandırmayı, Finder yanıtları ve izin hatalarını, simge kapsamını, Windows pencere kimliklerini ve iki platformun başlangıç ayarlarını kapsar. Electron testi ayrı bir kullanıcı profili ve örnek dosyalar kullanır; ekran görüntülerini `artifacts/` klasörüne yazar. `test:native` macOS modülünü gerçek Electron pencere kimliğiyle yükler veya Windows yardımcısının Win32 bağlamasını kontrol eder; etkileşimli masaüstü doğrulamasının yerine geçmez.

Odaklı arayüz kontrolleri:

```sh
npx electron scripts/smoke.cjs --counters-only
npx electron scripts/smoke.cjs --menu-dismiss-only
npx electron scripts/smoke.cjs --startup-only
npx electron scripts/smoke.cjs --performance-only
```

Başlangıç testi Windows kayıt defterine yazmak yerine bellek içi bir işletim sistemi adaptörü kullanır. Gerçek oturum açılışı ve macOS masaüstü davranışı ayrıca cihaz üzerinde doğrulanmalıdır.

Kaynak kullanımı için halı durulduğunda veya pencere gizlendiğinde çizim döngüsü durur; etkileşimle yeniden başlar. Masaüstü simgeleri yalnızca sağ tık menüsü veya dosya listesi açıkken taranır. Animasyon sırasında üçgen ağı yeniden kullanılır ve ekranın yalnızca halının kapladığı bölgesi temizlenir. Performans arayüz testi boşta/gizliyken çizimin durmasını ve renk değişimi/pencere gösterimiyle yeniden başlamasını kontrol eder.

İlk cihaz doğrulaması için [platform test listesi](docs/platform-testing.md) kullanılabilir.

## Proje yapısı

```text
desktop/     Electron başlangıcı, IPC, dosya kasası, simge okuyucu ve başlangıç ayarı
ui/          Kumaş fiziği, dokuma dokusu ve sağ tık arayüzü
native/      macOS masaüstü katmanı
scripts/     Yerel derleme, önizleme sunucusu ve Electron kontrolleri
test/        Otomatik testler
docs/        README görseli
```

Uygulama giriş noktası `desktop/main.cjs` dosyasıdır. Render süreci sandbox ve context isolation ile çalışır; dosya işlemleri doğrulanan IPC çağrılarıyla ana süreçte yapılır.
