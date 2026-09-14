# Frontend demo

## Hazırlanan təqdimat

- Public sayt (§60.1): ana səhifə, xidmət və məhsul kataloqu, filtr və müqayisə, ustalar, planlar, filiallar, FAQ, zəmanət yoxlaması, usta və B2B müraciəti.
- Auth (§60.2): telefon + OTP və e-poçt + şifrə girişi, qeydiyyat, şifrə bərpası, təsdiq, 2FA, rejim seçimi.
- Müştəri kabineti (§60.3): icmal, cihazlar, ünvanlar, servis sifarişləri (smeta qərarı, vaxt dəyişmə, onlayn ödəniş), məhsul sifarişləri və qaytarma, abunəlik, ödənişlər, zəmanət iddiaları, sənədlər, bildiriş ayarları, rəylər, ailə üzvləri, təhlükəsizlik.
- Usta paneli (§60.4): təkliflər, iş detalı, smeta qurucusu, mərhələ tamamlama (foto, imza, checklist, ödəniş), cədvəl, ixtisaslar, mobil anbar və rezervlər, qazanc və nağd təhvil, statistika, ayarlar.
- Kuryer (§60.6) və B2B kabinetləri (§60.5): korporativ, partner, topdan (sürətli sifariş, kommersiya təklifləri, balans, komissiyalar).
- CRM/ERP admin (§61): dashboard, servis sifarişləri və yaratma, dispetçer lövhəsi, həftəlik cədvəl, logistika, zəmanət iddiaları, workflow şablon redaktoru, ustalar (yoxlama, lisenziya, əməkdaşlıq), istifadəçilər və rol matrisi, kataloq/PIM, satış, anbar (qalıq, hərəkət, transfer, inventarizasiya, alış), abunə planları, maliyyə, kassalar, usta hesablaşmaları, məzmun, təşkilat ayarları, brend, inteqrasiyalar, audit log, hesabatlar və KPI.
- Bütün mətnlər AZ / RU / EN; `node scripts/check-i18n.mjs` koddakı tərcümə açarlarını yoxlayır.

## Təqdimat ssenarisi

1. `http://localhost:3000/az` açın, xidmət seçib “Servis sifariş et” ilə `aysel@demo.az` / `Demo1234!` hesabına daxil olun.
2. Kabinetdə `SV-1052` sifarişinin smetasını qismən təsdiqləyin və mərhələlərə baxın.
3. Başqa brauzer pəncərəsində `elvin@demo.az` ilə usta panelində təklifi qəbul edin, mərhələni tamamlayın.
4. `http://localhost:3001/az` ünvanında `superadmin@demo.az` / `Demo1234!`, 2FA `123456` ilə CRM-i açın.
5. Dispetçer lövhəsindən təyin olunmamış sifarişi ustaya təyin edin, sifariş detalında icraçı adına simulyasiya edin.
6. Workflow şablonunda mərhələ əlavə edib yoxlayın və yeni versiya kimi saxlayın.
7. `+994553334455` (OTP `123456`) ilə kuryer interfeysini, `corporate@demo.az`, `partner@demo.az`, `wholesale@demo.az` ilə B2B kabinetlərini göstərin.
8. Sol-aşağıdakı “Mock” paneli ilə gecikmə, xəta və boş siyahı hallarını nümayiş etdirin.

## Qeydlər

Mock serveri lokal istifadə edin. Həqiqi ödəniş və mesaj göndərilmir, server restartında dəyişikliklər itir. Cihaz görüntüləri SVG illüstrasiyalarıdır. SSR/SEO optimizasiyası, Storybook və E2E əhatəsi ayrıca işdir.
