# Platform doğrulaması

Kod ve otomatik testler tamamlandıktan sonra aşağıdaki cihaz kontrolleri ayrıca yapılmalıdır. Başarısız bir kontrol varsa yalnızca derleme başarısına dayanarak destek doğrulanmış sayılmaz.

## macOS

1. `pnpm install --frozen-lockfile`, `npm run native`, `npm test` ve `npm run test:native` çalıştırın.
2. `CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac` ile Universal DMG üretin. Hem Intel hem Apple Silicon cihazda açılabildiğini kontrol edin.
3. DMG'deki Halı'yı Applications'a sürükleyip açın. macOS ilk açılışı engellerse sistem ayarlarından izin verin.
4. Halı masaüstü simgelerinin üstünde, Finder/Safari gibi normal uygulamaların altında kalmalı. Menü açılınca kullanılabilir olmalı; dışarı tıklayınca kapanmalı.
5. **macOS ile birlikte başlat** seçeneğini açın. Onay gerekiyorsa arayüz bunu belirtmeli ve doğru ayar ekranını açmalı. İzin verdikten sonra oturumu kapatıp açarak gerçek başlangıcı doğrulayın. Seçeneği kapatıp bir sonraki oturumda başlamadığını kontrol edin.
6. Başka Space'e geçin, Mission Control ve masaüstünü göster hareketini deneyin. Birincil ekran dışındaki ekranlar şu an kapsam dışıdır.
7. Geçici bir masaüstü dosyasını saklayıp uygulamayı kapatın/açın ve geri getirin. Aynı ada sahip bir dosya varken üzerine yazılmadığını doğrulayın.


## Windows

1. `npm run native`, `npm run test:native` ve `npm test` çalıştırın. Tek EXE çıktısını `npm run dist:win` ile üretin.
2. Portable EXE açıldığında `.NET` derleyicisini aramadan paketlenmiş masaüstü sıralama yardımcısının çalıştığını kontrol edin.
3. Halı masaüstü simgelerinin üstünde kalmalı; Notepad ve Dosya Gezgini normal pencereleri halının üstünde görünmeli.
4. Halının orta ve köşelerinden tutun. Yanlışlıkla boyutlandırma açılmamalı; sağ tık menüsü kullanılabilir olmalı.
5. Sağ tık menüsünü açın; menü önde, dış tıklama sonrası halı yeniden masaüstü seviyesinde olmalı.
6. `Win+D` ve masaüstünü göster düğmesini deneyin. Halı masaüstünde kalmalı. Tepsiden açıkça gizlediğinizde kendiliğinden tekrar görünmemeli.
7. Dosya Gezgini'ni Görev Yöneticisi'nden yeniden başlatın. Masaüstü yeniden geldiğinde halı sıralaması toparlanmalı.
8. `%100`, `%150` ve `%200` ölçeklerde halı görünümü ve pencere sırasını kontrol edin.
9. Başlangıç seçeneğini açıp kapatın; Görev Yöneticisi ve gerçek oturum açılışı üzerinden doğrulayın.

Windows yerel yardımcıları derlendi ve Win32 fonksiyon yükleme kontrolünden geçti. Gerçek masaüstü sıralaması / Win+D davranışı, kısıtlı geliştirme ortamındaki bir yükleme testiyle doğrulanmış sayılmaz.

## Ek güvenilirlik kontrolleri

- Paketleme sonrasında `node scripts/package-smoke.cjs` çalışmalı; paketli arayüz ve dosya/klasör çakışma koruması doğrulanmalı.
- Bir ayarı değiştirdikten hemen sonra normal çıkış yapın; tekrar açıldığında son değer korunmalı.
- Halıyı sürüklerken ekran ölçeğini/ölçüsünü değiştirin; tutuş güvenle bitmeli, yeni sürükleme çalışmalı.
- Yalnızca test için hazırlanmış ayrı bir kasada kayıt dosyasını bozun veya kaldırın; yedek/metaveri kurtarması ve panel uyarısı görünmeli. Gerçek kullanıcı kasasıyla bu deneyi yapmayın.
- Windows güvenlik politikası yardımcıyı engellerse açık durum mesajı olmalı; kaynak dosyalar yerinde, kasadaki dosyalar kasada korunmalı. Güvenlik ayarlarını kapatmak veya engeli aşmak testin parçası değildir.

19 Ekim 2026: Mac CI derlemesi, birim testleri, native yükleme/çakışmasız taşıma, arayüz, boşta çizim, kurtarma ve paketli uygulama açılış kontrolleri Apple Silicon ortamında geçti. Universal DMG/ZIP üretildi. Yukarıdaki gerçek kullanıcı masaüstü/TCC/Spaces/oturum açılışı ve Intel cihaz kontrolleri bu sonuçla tamamlanmış sayılmaz.
