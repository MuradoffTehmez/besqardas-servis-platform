# Frontend demo

## Hazırlanan təqdimat

- Public sayt: ana səhifə, xidmət kataloqu və detalları, məhsul kataloqu və detalları, ustalar, şirkət və əlaqə ekranları.
- AZ / RU / EN dil seçimi, kataloq axtarışı və kateqoriya filtri.
- E-poçt/şifrə ilə demo giriş, daxili hesab üçün 2FA.
- Servis sifarişi: icra forması, problem təsviri, saxlanmış ünvan, tarix və yekun təsdiq.
- Səbətə əlavə, miqdar dəyişmə, silmə, nağd ödənişlə demo checkout.
- Müştəri kabineti: sifarişlər, mərhələ detalları, cihazlar və profilə baxış.
- Admin: demo giriş, sifariş sayı, aktiv və tamamlanmış sifarişlər, axtarış və detal.

## Təqdimat ssenarisi

1. `http://localhost:3000/az` açın.
2. Xidmətlərdən birini seçin və “Servis sifariş et” düyməsini basın.
3. `aysel@demo.az` / `Demo1234!` ilə daxil olun.
4. Problem təsvirini, mövcud ünvanı və gələcək tarixi seçin, təsdiq edin.
5. Şəxsi kabinetdə yeni sifarişi və mərhələlərini göstərin.
6. Kataloqdan məhsul əlavə edin, səbəti və nağd checkout axınını göstərin.
7. `http://localhost:3001/az` ünvanında `admin@demo.az` / `Demo1234!`, 2FA `123456` ilə CRM icmalını açın.
8. Mobil ölçüdə menyunu, kartları və sifariş formasını göstərin.

## Açıq qalan PRD işi

Bu demo bütün Phase 1-in təhvil verilməsi deyil. OTP giriş UI-ı, qeydiyyat və bərpa, tam usta/kuryer panelləri, smeta qərarları, planlar, sənədlər, qabaqcıl CRM əməliyyatları, tam RBAC route guard-ları, SSR/SEO, Storybook və E2E əhatəsi ayrıca işdir. B2B PRD §74.2 üzrə Phase 2-dir.

Mock serveri lokal istifadə edin. Həqiqi ödəniş və mesaj göndərilmir. Server restartında dəyişikliklər itir. Cihaz görüntüləri CSS illüstrasiyalarıdır. Demo qiymət və əlaqə məlumatları kommersiya təklifi deyil.
