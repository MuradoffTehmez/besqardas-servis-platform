# Layihə və səhifə auditi

**Audit tarixi:** 15 sentyabr 2026  
**Versiya:** `0.3.1`  
**Əhatə:** repository strukturu, 205 route tərifi, public SEO/SSR, rol əsaslı portallar, CRM/ERP, mock API, i18n, testlər və GitHub repository standartları.

## İcra xülasəsi

Layihə yaxşı ayrılmış pnpm/Turborepo monoreposudur. Public məzmun server-side hazırlanır, domen müqavilələri Zod ilə mərkəzləşdirilir, UI data-nı HTTP qatından alır, AZ/RU/EN lokalizasiya və kritik axınlar üçün avtomatlaşdırılmış testlər mövcuddur.

Audit zamanı kritik source-code təhlükəsizlik boşluğu tapılmayıb. Əsas risk platformanın demo backend üzərində işləməsi və production sərhədlərinin hələ bu repository-də olmamasıdır. 205 route-un hamısı mənbə kodu səviyyəsində xəritələnib; kritik istifadəçi axınları, 17 public locale səhifəsi, 6 kabinet səhifəsi və mobil ekranlar Playwright/axe ilə icra olunub.

Audit nəticəsində:

- README, contribution, security, support və davranış sənədləri peşəkarlaşdırıldı;
- CODEOWNERS, geniş issue/PR formaları və npm Dependabot əlavə edildi;
- GitHub Actions minimum permission və immutable action SHA-ları ilə sərtləşdirildi;
- CI-a Playwright E2E/SEO/a11y mərhələsi əlavə edildi;
- checkout E2E-də tərcümə copy-sinə həddən artıq bağlı radio locator-u və cookie vəziyyəti sabitləşdirildi;
- geniş endpoint matris testinin CI yükündə timeout riski aradan qaldırıldı;
- ayrıca GitHub Wiki üçün arxitektura, route kataloqu, developer, test, təhlükəsizlik və release sənədləri hazırlandı.

## Audit metodu

1. Git, remote, branch və repository faylları inventarlaşdırıldı.
2. `apps`, `packages`, `e2e`, `scripts`, `.github` və mövcud sənədlər oxundu.
3. Route tərifləri `web.tsx`, `admin.tsx`, technician, courier və B2B modullarından çıxarıldı.
4. Public SSR/metadata, role guard, API client, schema, mock handler və state machine sərhədləri nəzərdən keçirildi.
5. Lint, TypeScript, i18n, unit/integration, production build və Playwright suite işləndi.
6. GitHub repository health, Wiki və Actions təhlükəsizlik tələbləri rəsmi GitHub sənədləri ilə müqayisə edildi.

## Repository arxitekturası

| Qat          | Yol                                 | Məsuliyyət                                      | Audit qeydi                                                      |
| ------------ | ----------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Web app      | `apps/web`                          | Public SSR və bütün xarici rol portalları       | Catch-all Next route; faktiki route registry `packages/ui`-dadır |
| Admin app    | `apps/admin`                        | CRM/ERP                                         | `noindex`; daxili role guard və permission əsaslı menyu          |
| UI           | `packages/ui`                       | Səhifələr, shell-lər, design system             | Böyük funksional qat; domenlər üzrə fayl bölünməsi qorunmalıdır  |
| API client   | `packages/api-client`               | Browser/server HTTP və query                    | UI ilə backend arasında vahid sərhəd                             |
| Schemas      | `packages/schemas`                  | Zod request/response müqavilələri               | Contract-first yanaşmanın əsas nöqtəsi                           |
| Types        | `packages/types`                    | Ortaq tiplər                                    | Schema ilə sinxron saxlanmalıdır                                 |
| Mock backend | `packages/mocks`                    | Handler, seed, RBAC, workflow, anbar və pricing | Demo üçün güclü, production sərhədi deyil                        |
| i18n         | `packages/i18n`                     | AZ/RU/EN mətn və format                         | Statik bütövlük yoxlaması mövcuddur                              |
| Utils/config | `packages/utils`, `packages/config` | Ortaq utilit və TS preset                       | Məqsədi aydın, aşağı coupling                                    |

## Route inventarı

| Tətbiq/sahə                    | Route sayı | Giriş modeli                                          |
| ------------------------------ | ---------: | ----------------------------------------------------- |
| Public, auth və müştəri bazası |         56 | Public və `CUSTOMER`                                  |
| Usta paneli                    |         16 | `TECHNICIAN`                                          |
| Kuryer paneli                  |          4 | `COURIER`, bəzi hallarda `TECHNICIAN`                 |
| B2B portalları                 |         37 | `CORPORATE_CUSTOMER`, `PARTNER`, `WHOLESALE_CUSTOMER` |
| Admin CRM/ERP                  |         92 | Daxili rollar + permission matrisi                    |
| **Cəmi**                       |    **205** | —                                                     |

Dinamik `:id`, `:slug` və `*` pattern-ləri bir route tərifi kimi sayılıb. Bütün web route-ları `/az`, `/ru` və `/en` locale prefiksi ilə işləyir.

### Public, auth və müştəri səhifələri

| Qrup                | Route-lar                                                                                                                                                                                             | Analiz                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Public əsas         | `/`, `/services`, `/services/:slug`, `/services/:slug/book`, `/shop`, `/shop/*`, `/product/:slug`, `/search`, `/compare`                                                                              | Kataloq, axtarış və detail SSR; booking auth tələb edir; dinamik canonical/JSON-LD hazırlanır  |
| Kommersiya          | `/cart`, `/checkout`, `/checkout/pay`, `/checkout/result`                                                                                                                                             | Qonaq səbəti, login sonrası axın, idempotent checkout və mock provider callback; E2E mövcuddur |
| Kəşf                | `/technicians`, `/technicians/:id`, `/pricing`, `/warranty/verify`, `/warranty/verify/:code`                                                                                                          | Usta profil, plan və zəmanət yoxlama; public indekslənə bilən məzmun                           |
| Kontent             | `/branches`, `/about`, `/terms`, `/privacy`, `/faq`, `/contact`                                                                                                                                       | CMS tipli public məzmun; hüquqi mətnlər production-dan əvvəl sahib tərəfindən təsdiqlənməlidir |
| Onboarding          | `/become-technician`, `/business`, `/demo`                                                                                                                                                            | Usta/B2B müraciəti və bütün modullar üçün demo xəritəsi                                        |
| Auth                | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify`, `/2fa`, `/select-mode`                                                                                                       | E-poçt/şifrə, telefon/OTP, 2FA və multi-role seçim axınları                                    |
| Müştəri baza        | `/account`, `/account/profile`, `/account/addresses`, `/account/devices`, `/account/devices/:id`                                                                                                      | Dashboard və profil/device/address idarəetməsi, plan limitləri API-dən gəlir                   |
| Müştəri sifarişləri | `/account/services`, `/account/services/:id`, `/account/orders`, `/account/orders/:id`, `/account/returns`                                                                                            | Servis və satış həyat dövrü, smeta action-ları və return izləmə                                |
| Müştəri hesabı      | `/account/subscription`, `/account/payments`, `/account/warranties`, `/account/documents`, `/account/favorites`, `/account/notifications`, `/account/reviews`, `/account/family`, `/account/security` | Abunə, maliyyə, sənəd, bildiriş, ailə və təhlükəsizlik preference-ləri                         |
| Sistem              | `/403`, `/500`, `/maintenance`                                                                                                                                                                        | İcazə, server və planlı texniki xidmət vəziyyətləri                                            |

### Usta paneli

| Route                                                                     | Funksiya              | Analiz                                                                        |
| ------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `/technician`, `/technician/dashboard`                                    | Dashboard             | Aktiv iş, təklif, reytinq, qazanc/nağd və plan statusu                        |
| `/technician/jobs`, `/technician/jobs/:id`                                | İşlər                 | Təklif və aktiv işlər, state-dependent action bar, marşrut və müştəri əlaqəsi |
| `/technician/schedule`                                                    | Cədvəl                | Slot və blok vaxt idarəetməsi                                                 |
| `/technician/specializations`                                             | İxtisaslar            | Kateqoriya və xidmət imkanları                                                |
| `/technician/inventory`, `/technician/reservations`                       | Mobil anbar           | Qalıq və iş üçün ehtiyat rezervasiyası                                        |
| `/technician/customers`                                                   | Müştərilər            | Usta səviyyəli məhdud CRM görünüşü                                            |
| `/technician/earnings`                                                    | Hesablaşma            | Müstəqil usta qazancı və STAFF nağd təhvil məntiqi                            |
| `/technician/reviews`, `/technician/documents`, `/technician/statistics`  | Keyfiyyət və sənədlər | Reytinq, sənəd/lisenziya və performans analitikası                            |
| `/technician/settings`, `/technician/profile`, `/technician/subscription` | Hesab                 | Zona, public profil, şəxsi məlumat və plan idarəetməsi                        |

### Kuryer paneli

| Route                        | Funksiya          | Analiz                                                                 |
| ---------------------------- | ----------------- | ---------------------------------------------------------------------- |
| `/courier`, `/courier/tasks` | Tapşırıq siyahısı | Mobil-first, bu gün/gələcək/tamamlanmış tab-ları və nağd xülasə        |
| `/courier/tasks/:id`         | Tapşırıq detalı   | Ünvan, marşrut, cargo, əlaqə görünürlüğü, foto/imza/status action-ları |
| `/courier/profile`           | Profil            | Ortaq profil redaktoru                                                 |

### B2B portalları

| Persona    | Route-lar                                                                                                                                                                                                                                                                | Analiz                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Korporativ | `/corporate`, `/corporate/sites`, `/corporate/devices`, `/corporate/services`, `/corporate/services/:id`, `/corporate/schedule`, `/corporate/contracts`, `/corporate/documents`, `/corporate/reports`, `/corporate/users`, `/corporate/company`, `/corporate/profile`    | Obyekt və cihaz parkı, SLA, planlı servis, müqavilə və şirkət istifadəçiləri |
| Partner    | `/partner`, `/partner/catalog`, `/partner/catalog/*`, `/partner/orders`, `/partner/orders/:id`, `/partner/services`, `/partner/services/:id`, `/partner/commissions`, `/partner/documents`, `/partner/balance`, `/partner/users`, `/partner/company`, `/partner/profile` | Müştəri adından sifariş, komissiya, balans və şirkət idarəetməsi             |
| Topdan     | `/wholesale`, `/wholesale/catalog`, `/wholesale/catalog/*`, `/wholesale/quick-order`, `/wholesale/quotes`, `/wholesale/orders`, `/wholesale/orders/:id`, `/wholesale/documents`, `/wholesale/balance`, `/wholesale/users`, `/wholesale/company`, `/wholesale/profile`    | Seqment qiyməti, SKU sürətli sifariş, təklif, kredit/balans və sənədlər      |

### Admin CRM/ERP

| Qrup                  | Route-lar                                                                                                                                                                                                                                     | Analiz                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Auth/sistem           | `/login`, `/forgot-password`, `/reset-password`, `/2fa`, `/select-mode`, `/403`, `/500`, `/maintenance`                                                                                                                                       | Admin origin, noindex, 2FA və daxili rol yönləndirməsi          |
| Dashboard/şəxsi       | `/`, `/notifications`, `/profile`                                                                                                                                                                                                             | Rol və permission-a görə KPI, bildiriş və profil                |
| Servis əməliyyatları  | `/service-orders`, `/service-orders/new`, `/service-orders/:id`, `/dispatch`, `/schedule`, `/estimates`, `/logistics`, `/warranty-claims`                                                                                                     | Sifariş, təyinat, dispetçer, smeta, logistika və zəmanət        |
| Workflow/config       | `/services`, `/workflow-templates`, `/workflow-templates/:id`, `/fee-rules`, `/reason-codes`                                                                                                                                                  | Xidmət kataloqu və state-machine versiyaları                    |
| İnsanlar              | `/customers`, `/customers/:id`, `/technicians`, `/technicians/:id`, `/technicians/verification`, `/technicians/licenses`, `/technicians/partnerships`, `/couriers`, `/employees`, `/b2b-accounts`, `/partner-types`, `/users`, `/roles`       | CRM, onboarding, yoxlama, lisenziya, əməkdaşlıq və RBAC matrisi |
| Kataloq/PIM           | `/products`, `/products/new`, `/products/:id`, `/categories`, `/brands`, `/series`, `/models`, `/attributes`, `/compatibility`, `/units`, `/unit-conversions`                                                                                 | Məhsul, media, variant, atribut, uyğunluq və vahid çevirmələri  |
| Satış                 | `/sales-orders`, `/sales-orders/:id`, `/returns`, `/quotes`, `/price-lists`, `/promotions`                                                                                                                                                    | Satış sifarişi, qaytarma, təklif və qiymət qaydaları            |
| Anbar/satınalma       | `/goods-receipts`, `/goods-receipts/new`, `/goods-receipts/:id`, `/goods-receipts/:id/edit`, `/inventory`, `/warehouses`, `/stock-movements`, `/reservations`, `/transfers`, `/stock-counts`, `/stock-counts/:id`, `/purchases`, `/suppliers` | Mal qəbulu, qalıq, transfer, sayım, rezervasiya və satınalma    |
| Abunə                 | `/subscription-plans`, `/subscriptions`                                                                                                                                                                                                       | Dinamik plan və abunə idarəetməsi                               |
| Maliyyə               | `/finance`, `/payments`, `/invoices`, `/fiscal-receipts`, `/cash-desks`, `/technician-settlements`, `/partner-commissions`, `/costing-methods`, `/tax-settings`                                                                               | Ödəniş, sənəd, kassa, hesablaşma, maya və vergi konfiqurasiyası |
| Kommunikasiya/kontent | `/notification-templates`, `/reviews`, `/content/pages`, `/content/faq`, `/content/banners`                                                                                                                                                   | Bildiriş şablonu, rəy moderasiyası və CMS                       |
| Təşkilat              | `/branches`, `/warehouse-groups`, `/service-zones`, `/settings`, `/settings/branding`, `/integrations`, `/audit-logs`                                                                                                                         | Filial, zona, brend, provider və audit konfiqurasiyası          |
| Hesabat               | `/reports`, `/kpi-targets`                                                                                                                                                                                                                    | KPI və maliyyə/əməliyyat hesabatları                            |

## Səhifə keyfiyyəti üzrə nəticələr

### Public və SEO

- Public detail səhifələri ilk HTML-də məzmun verir; JavaScript olmadan əsas `h1` mövcuddur.
- Locale `html[lang]`, canonical, AZ/RU/EN/`x-default` alternates, Open Graph və JSON-LD hazırlanır.
- `sitemap.xml`, `robots.txt`, public index və qorunan `noindex` ayrımı testlə qorunur.
- Tanınmayan route Next `notFound()` vasitəsilə real 404 qaytarır.

### Auth və rol sərhədləri

- Qonaq qorunan route-dan login-ə `next` parametrilə yönləndirilir və girişdən sonra geri qaytarılır.
- Müştəri, usta, kuryer, B2B və daxili əməkdaş rolları ayrıca başlanğıc route-a yönləndirilir.
- Admin login 2FA ssenarisi E2E ilə təsdiqlənir.
- UI guard yalnız UX üçündür; production backend hər sorğuda permission və tenant sərhədini yenidən yoxlamalıdır.

### Kommersiya və servis axınları

- Qonaq səbəti, giriş, səbət birləşməsi, kampaniya/plan endirimi, checkout və provider callback mock qatında modelləşdirilib.
- Checkout idempotency key istifadə edir və təkrar sorğuda mövcud sifarişi qaytarır.
- Servis workflow A/B/D ssenariləri, smeta təsdiqi/rəddi, plan limitləri və assignment action-ları inteqrasiya testlərindədir.
- Card payment radio locator-u UI-da “Kartla onlayn”, enum faylında isə “Kart — onlayn” variantına həddən artıq bağlı idi və `.catch()` səbəbilə 90 saniyəlik timeout faktiki səbəbi gizlədirdi. Locator `^Kart` accessible-name prefiksinə keçirildi və xəta udma ləğv edildi.
- Cookie seçimi testin predmeti olmadığı ssenarilərdə test helper hər təmiz context-də “yalnız zəruri” seçimini deterministik edir.

### Responsive və əlçatanlıq

- Mobil ana səhifə, menyu, kuryer və usta iş siyahısı üçün horizontal overflow və əsas davranış testləri var.
- axe WCAG 2.2 A/AA tag-ları ilə kritik pozuntuları bloklayır.
- Cari axe əhatəsi əsas public və seçilmiş kabinet səhifələridir; bütün 205 route üçün tam visual/a11y regression ayrıca növbəti mərhələdir.

### Maintainability

- Paylaşılan shell, query state, form/error komponentləri təkrarı azaldır.
- `packages/ui/src/app/pages` və admin faylları funksional baxımdan böyükdür; gələcək dəyişikliklər domen alt-modullarına bölünməlidir.
- Generic admin resource ekranları vahid davranış verir, lakin hər resurs üçün permission, empty/error və destructive action testləri ayrıca genişləndirilməlidir.

## Tapıntılar və prioritetlər

| Prioritet | Tapıntı                                                                           | Status / tövsiyə                                                                                         |
| --------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P0        | Kritik source-code boşluğu                                                        | Tapılmadı; bu, ayrıca penetration test deyil                                                             |
| P1        | Demo mock backend production təhlükəsizlik sərhədi deyil                          | README/SECURITY/Wiki-də açıq qeyd edildi; real backend tələb olunur                                      |
| P1        | 205 route-un hamısı üçün browser smoke/a11y coverage yoxdur                       | Static audit tamamlandı; risk əsas persona axınları ilə azaldılıb; route-matrix E2E genişləndirilməlidir |
| P1        | Hüquqi mətn, brend/domen və açıq mənbə lisenziyası təsdiqlənməyib                 | Məhsul sahibi qərarı tələb olunur; lisenziya uydurulmadı                                                 |
| P2        | Unit endpoint matrisi paralel yükdə 5s timeout-a ilişə bilirdi                    | Konkret test üçün 15s limit tətbiq edildi                                                                |
| P2        | Checkout testi locale copy-sinə tam uyğun radio adı axtarır və uğursuzluğu udurdu | Semantik `^Kart` locator-u tətbiq edildi, `.catch()` silindi; cookie state deterministik edildi          |
| P2        | Lokal E2E bundled Chromium olmadan başlaya bilmir                                 | README/CONTRIBUTING-də install və Chrome kanalı sənədləşdirildi                                          |
| P2        | Actions tag-ları mutable ref-lərlə çağırılırdı                                    | Tam commit SHA-larına pin edildi                                                                         |
| P2        | CI E2E-ni işlətmirdi                                                              | Build sonrası Chromium install + Playwright mərhələsi əlavə edildi                                       |
| P2        | Repository health faylları natamam idi                                            | Support, conduct, CODEOWNERS və geniş şablonlar əlavə edildi                                             |
| P3        | CODEOWNERS bir nəfərə bağlıdır                                                    | Komanda yarandıqda domen sahibliyi və ən azı iki maintainer təyin edin                                   |

## Yoxlama matrisi

| Yoxlama                           | Audit nəticəsi                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm lint`                       | Keçdi                                                                                   |
| `pnpm typecheck`                  | 9 task keçdi                                                                            |
| `node scripts/check-i18n.mjs`     | İtkin açar aşkarlanmadı                                                                 |
| `pnpm test`                       | İlk paralel auditdə 1 timeout; tək təkrar keçdi; timeout sabitləşdirildi                |
| `pnpm build`                      | Web və admin production build keçdi                                                     |
| `PW_CHANNEL=chrome pnpm test:e2e` | İlkin auditdə 30/31; cookie actionability problemi düzəldildi və suite yenidən yoxlanır |

## Növbəti addımlar

1. Real backend, database və auth threat modelini ayrıca təsdiqləyin.
2. Hər persona üçün route-matrix browser smoke test və visual regression əlavə edin.
3. Admin CRUD resurslarında destructive action, permission və empty/error testlərini genişləndirin.
4. Production observability, CSP/security header, secret scanning və dependency review qapıları əlavə edin.
5. Hüquqi mətnləri, brendi, domeni və lisenziya modelini rəsmi qərarla bağlayın.
6. CODEOWNERS-i komanda strukturu yarandıqda domenlər üzrə bölün.

Bu sənəd kod və route dəyişdikcə yenilənməlidir; faktiki məhsul əhatəsi üçün əsas mənbə həmişə `docs/PRD.md` və `docs/DEMO.md` olaraq qalır.
