# Platform doğrulaması

Kod ve otomatik testler tamamlandıktan sonra aşağıdaki cihaz kontrolleri ayrıca yapılmalıdır. Başarısız bir kontrol varsa yalnızca derleme başarısına dayanarak destek doğrulanmış sayılmaz.

## macOS

1. `npm install`, `npm test`, `npm run native` ve `npm run test:native` çalıştırın.
2. `CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac` ile Universal DMG üretin. Hem Intel hem Apple Silicon cihazda açılabildiğini kontrol edin.
3. DMG'deki Halı'yı Applications'a sürükleyip açın. macOS ilk açılışı engellerse sistem ayarlarından izin verin.
4. Halı masaüstü simgelerinin üstünde, Finder/Safari gibi normal uygulamaların altında kalmalı. Menü açılınca kullanılabilir olmalı; dışarı tıklayınca kapanmalı.
5. Finder Otomasyon iznini kabul edin. Bir masaüstü simgesinin üzerine halıyı sürükleyin; kapalı simge sayısı ve adı güncellenmeli. Simgeyi tekrar dışarı taşıyın; sayım azalmalı. Retina ve standart ölçeklerde kontrol edin.
6. Otomasyon iznini reddedin. Sıfır yerine erişim durumu gösterilmeli ve tekrar eden izin pencereleri açılmamalı. Sistem ayarlarında izni verip menüden yeniden deneyin.
7. **macOS ile birlikte başlat** seçeneğini açın. Onay gerekiyorsa arayüz bunu belirtmeli ve doğru ayar ekranını açmalı. İzin verdikten sonra oturumu kapatıp açarak gerçek başlangıcı doğrulayın. Seçeneği kapatıp bir sonraki oturumda başlamadığını kontrol edin.
8. Başka Space'e geçin, Mission Control ve masaüstünü göster hareketini deneyin. Birincil ekran dışındaki ekranlar şu an kapsam dışıdır.
9. Geçici bir masaüstü dosyasını saklayıp uygulamayı kapatın/açın ve geri getirin. Aynı ada sahip bir dosya varken üzerine yazılmadığını doğrulayın.

Finder konum okumaları Apple'ın JXA / Finder sözlüğüne dayanır. Stage Manager ve masaüstü öğelerini gizleyen araçlar farklı davranabilir; ayrıca kontrol edilmelidir. İlk macOS CI çalışması ve gerçek cihaz kontrolleri bu Windows geliştirme ortamında yapılmadı.

## Windows

1. `npm run native`, `npm run test:native` ve `npm test` çalıştırın. NSIS çıktısını `npm run dist:win` ile üretin.
2. Kurulumdan sonra `.NET` derleyicisini aramadan paketlenmiş iki yardımcının çalıştığını kontrol edin.
3. Halı masaüstü simgelerinin üstünde kalmalı; Notepad ve Dosya Gezgini normal pencereleri halının üstünde görünmeli.
4. Halının orta ve köşelerinden tutun. Yanlışlıkla boyutlandırma açılmamalı; sağ tık menüsü kullanılabilir olmalı.
5. Sağ tık menüsünü açın; menü önde, dış tıklama sonrası halı yeniden masaüstü seviyesinde olmalı.
6. `Win+D` ve masaüstünü göster düğmesini deneyin. Halı masaüstünde kalmalı. Tepsiden açıkça gizlediğinizde kendiliğinden tekrar görünmemeli.
7. Dosya Gezgini'ni Görev Yöneticisi'nden yeniden başlatın. Masaüstü yeniden geldiğinde halı sıralaması ve simge sayımı toparlanmalı.
8. `%100`, `%150` ve `%200` ölçeklerde simge sayımı ve pencere sırasını kontrol edin.
9. Başlangıç seçeneğini açıp kapatın; Görev Yöneticisi ve gerçek oturum açılışı üzerinden doğrulayın.

Windows yerel yardımcıları derlendi ve Win32 fonksiyon yükleme kontrolünden geçti. Gerçek masaüstü sıralaması / Win+D davranışı, kısıtlı geliştirme ortamındaki bir yükleme testiyle doğrulanmış sayılmaz.
