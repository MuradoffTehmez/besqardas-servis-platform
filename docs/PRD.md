# PRD — Servis İdarəetmə Platforması

| Sahə | Dəyər |
|---|---|
| Sənəd tipi | Product Requirements Document (PRD) |
| Versiya | 2.1 |
| Status | Qaralama — təsdiq gözlənilir |
| Son yenilənmə | 13.09.2026 |
| İşçi adı (demo) | `besqardasServis.az` — müvəqqəti ad; domen alınmayıb, yekun brend deyil (§56.3) |
| Cari mərhələ | Phase 1 — Frontend |
| Phase 1 platformaları | Responsive Web (`apps/web`), Admin / CRM Web (`apps/admin`) |
| Sonrakı mərhələlər | Backend API, Mobile (iOS / Android), ödəniş, fiskal və e-qaimə inteqrasiyaları, ERP, Windows Desktop (yalnız ehtiyac yaranarsa) |
| Dillər | Azərbaycan (əsas), Rus, İngilis |
| Arxitektura | Monorepo, TypeScript |

## Dəyişiklik tarixçəsi

| Versiya | Tarix | Dəyişiklik |
|---|---|---|
| 1.0 | — | İlkin versiya |
| 2.0 | 13.09.2026 | Sənəd yenidən strukturlaşdırıldı. Biznes qərarları daxil edildi (Əlavə D). Rollar, B2B, workflow mühərriki, logistika, ödəniş və vergi, lokalizasiya, multi-tenant hazırlığı, RBAC, risklər və açıq suallar əlavə olundu. Backend tövsiyələri Əlavə A-ya köçürüldü. |
| 2.1 | 13.09.2026 | 19 açıq sual cavablandırıldı (Əlavə D.2). Əlavə olundu: STAFF usta lisenziya modeli, müstəqil usta hesablaşması, Kuryer rolu, partner komissiyası, endirim birləşmə qaydaları, dinamik plan sistemi və başlanğıc limitlər, maya dəyəri metodları, KPI hədəfləri, MVP sərhədi, komanda və müddət, vendor-neutral inteqrasiya arxitekturası (Əlavə E), brend konfiqurasiyası. |

## Sənəd rolları və təsdiq

| Rol | Kim | Məsuliyyət | Təsdiq statusu |
|---|---|---|---|
| Product Owner (məhsul sahibi) | Layihənin sahibi | Məhsul qərarları, prioritetlər, PRD üzrə yekun təsdiq | Gözlənilir |
| Primary Approver | Default olaraq Product Owner | Sənədin rəsmi təsdiqi | Gözlənilir |
| Əlavə Approver-lər | Şirkət rəhbərliyi tərəfindən təyin olunur | Öz sahəsi üzrə təsdiq (maliyyə, hüquq, əməliyyat) | Təyin olunmayıb |
| Əsas Stakeholder-lər | Rəhbərlik, əməliyyat, maliyyə, satış, texniki komanda | Tələblərin verilməsi və nəzərdən keçirilməsi | — |

Yeni Approver əlavə olunanda cədvəl yenilənir və dəyişiklik tarixçəsinə yazılır.

## Mündəricat

- **Hissə I — Məhsul konteksti:** §1–5
- **Hissə II — İstifadəçilər və giriş:** §6–9
- **Hissə III — Servis əməliyyatları:** §10–23
- **Hissə IV — Kataloq və e-commerce:** §24–33
- **Hissə V — Anbar:** §34–40
- **Hissə VI — Abunəliklər:** §41–43
- **Hissə VII — B2B: Partner, Topdan, Korporativ:** §44–45
- **Hissə VIII — Ödəniş, vergi və maliyyə:** §46–51
- **Hissə IX — Müştəri modulları:** §52–55
- **Hissə X — Platforma:** §56–59
- **Hissə XI — Frontend tələbləri (Phase 1):** §60–73
- **Hissə XII — İcra:** §74–77
- **Əlavələr:** A — Texniki istiqamət, B — Hədəf arxitektura, C — Qlossari, D — Qəbul edilmiş qərarlar, E — İnteqrasiyalar və provayderlər

---

# Hissə I — Məhsul konteksti

## 1. Məhsulun məqsədi

Platforma texniki servis xidmətlərini, məhsul və ehtiyat hissəsi satışını, anbarı, ustaları, müştəri cihazlarını və maliyyəni vahid sistemdə birləşdirir.

Servis sifarişi, usta təyinatı, material sərfiyyatı, satış, ödəniş və zəmanət ayrı-ayrı alətlərdə aparılanda məlumat itir, material uçotu pozulur, müştəri isə sifarişinin hansı mərhələdə olduğunu görmür. Platformanın vəzifəsi bu prosesləri bir yerdə, izlənilə bilən şəkildə idarə etməkdir.

### 1.1. Avadanlıq kateqoriyaları

- Kondisioner sistemləri
- Kombi sistemləri
- İstilik sistemləri
- Hovuz sistemləri
- Nasos və su sistemləri
- Elektrik avadanlıqları
- Digər texniki avadanlıqlar

Kateqoriyalar admin paneldən genişləndirilə bilər.

### 1.2. Xidmət növləri

- Quraşdırma
- Sökülmə
- Ölçü götürmə
- Diaqnostika
- Təmir
- Periodik servis

### 1.3. Kommersiya və əməliyyat istiqamətləri

- Məhsul və ehtiyat hissələrinin satışı (B2C və B2B)
- Ustaların idarə olunması (əməkdaş və müstəqil)
- Anbar və materialların idarə olunması
- Müştəri cihazları, zəmanət və servis tarixçəsi
- Abunəliklər
- Ödənişlər, vergi sənədləri, maliyyə və hesabatlar
- Logistika (cihazın götürülməsi, daşınması, geri çatdırılması)

Platforma bir neçə şəhər, filial, anbar və servis mərkəzi ilə işləməlidir.

## 2. Hədəflər və uğur göstəriciləri

### 2.1. Servis KPI-ları

Aşağıdakı dəyərlər tövsiyə olunan başlanğıc hədəflərdir. Kodda sabit yazılmır — admin paneldən dəyişdirilir (`/kpi-targets`, §61) və xidmət növü, filial, müştəri seqmenti üzrə fərqləndirilə bilər.

| KPI | Necə ölçülür | Başlanğıc hədəf |
|---|---|---|
| Sifarişə ilk cavab müddəti | Sifarişin yaradılmasından operatorun ilk reaksiyasına qədər (iş saatlarında) | ≤ 15 dəqiqə |
| Sifarişin qəbul müddəti | Yaradılmadan `CONFIRMED` statusuna qədər | ≤ 30 dəqiqə |
| Usta təyin etmə müddəti | `CONFIRMED`-dən ustanın işi qəbul etməsinə (`ACCEPTED`) qədər | ≤ 60 dəqiqə; təcili sifarişdə ≤ 15 dəqiqə |
| Servisə başlama müddəti | Təsdiqdən ilk sahə mərhələsinin başlamasına qədər | Standart ≤ 48 saat; Premium təcili ≤ 4 saat |
| Orta təmir müddəti | Təsdiqdən təhvilə qədər | Ünvanda ≤ 2 iş günü; servis mərkəzində ≤ 5 iş günü |
| SLA daxilində tamamlanma faizi | SLA müddətində bağlanan sifarişlərin payı | ≥ 90% |
| SLA pozuntusu faizi | Ən azı bir SLA-sı pozulan sifarişlərin payı | ≤ 5% |
| İlk səfərdə həll faizi | Təkrar gəliş tələb etməyən ünvanda servislərin payı | ≥ 75% |
| Təkrar müraciət faizi | 30 gün ərzində eyni cihaz və problem üzrə yeni sifarişlərin payı | ≤ 5% |
| Sifariş ləğv faizi | Ləğv olunan sifarişlərin payı | ≤ 10% |
| Müştəri məmnuniyyəti | Tamamlanmış işlər üzrə orta reytinq | ≥ 4.5 / 5 |

### 2.2. Biznes göstəriciləri

| Göstərici | Təsvir | Başlanğıc hədəf |
|---|---|---|
| Smeta təsdiq faizi | Müştərinin təsdiqlədiyi smetaların payı | ≥ 70% |
| Zəmanət iddiası faizi | Tamamlanmış işlərdən sonra zəmanət müraciətlərinin payı | ≤ 3% |
| Stok dəqiqliyi | Sayımda sistem və fiziki qalığın uyğunluğu | ≥ 98% |
| Onlayn sifariş konversiyası | Servis və məhsul səhifəsinə daxil olanların neçə faizi sifariş yaradır | İlk 3 ay baza ölçülür, sonra hədəf təyin olunur |
| Abunə konversiyası və churn | Basic → ödənişli plana keçid və abunədən imtina | İlk 3 ay baza ölçülür |
| Onlayn satış | Satış həcmi və orta səbət dəyəri | Kommersiya planı ilə təyin olunur |

## 3. Phase 1 əhatə dairəsi

### 3.1. Daxildir

Phase 1 funksiyaları üç prioritetə bölünür: **MVP**, **Phase 2** və **Future** (§74.1). Aşağıdakı siyahı Phase 1-in tam əhatəsidir; ilk buraxılış yalnız MVP kimi işarələnmiş funksiyaları əhatə edir.

- `apps/web`: public sayt, müştəri kabineti, usta paneli, kuryer interfeysi, Partner, Topdan və Korporativ panelləri
- `apps/admin`: daxili əməkdaşlar üçün CRM / ERP paneli
- Design system və paylaşılan UI komponentləri
- API müqaviləsi (contract) və MSW əsaslı mock API
- AZ / RU / EN lokalizasiyası
- Rol və icazə əsaslı UI
- Servis workflow-nun simulyasiyası (şablonlar, statuslar, smeta)
- Kataloq, filtr, axtarış, səbət və checkout UI
- Anbar, rezervasiya, transfer UI
- Abunəlik UI
- Ödəniş statusları və sənədlərin (faktura, akt, zəmanət) önizləmə UI-ı

### 3.2. Daxil deyil

- Real backend, verilənlər bazası, fayl storage
- Real ödəniş, taksit, fiskal çek və e-qaimə inteqrasiyası
- Real SMS, e-poçt, push və WhatsApp göndərişi
- Mühasibat proqramı ilə inteqrasiya (arxitektura hazır qurulur, Əlavə E)
- Sosial şəbəkə ilə giriş
- Mobil və Windows tətbiqləri
- Real vaxtda usta izlənməsi
- Yeni tenantların (servis şirkətlərinin) qoşulma prosesi
- Mühasibat uçotu (ERP)

## 4. Biznes modeli

### 4.1. Platforma modeli

İlkin mərhələdə platforma bir şirkət üçün işləyir (single-tenant). Gələcəkdə başqa servis şirkətləri də qoşula biləcək (multi-tenant). Buna görə data modeli və UI ilk gündən tenant anlayışına hazır qurulur (§56).

### 4.2. İcraçı modeli

Hibrid model: həm şirkət əməkdaşı olan ustalar, həm də müstəqil ustalar (§12).

- Şirkət əməkdaşı olan ustalar daxili lisenziya modeli ilə işləyir və fərdi abunə ödəmir.
- Müstəqil ustalar fərdi ödənişli abunə planı seçir. Platforma onların işlərindən komissiya tutmur.
- Müştəri bütün ödənişləri şirkətə edir, rəsmi sənədlər şirkətin adından verilir. Müstəqil ustaya çatacaq məbləğ daxili hesablaşma ilə ödənilir (§51.3).

### 4.3. Usta təyinatı

Qarışıq model: müştəri ustanı özü seçə bilər, Dispetçer təyin edə bilər, sistem avtomatik uyğun usta seçə bilər (§15).

### 4.4. Müştəri seqmentləri

| Seqment | Açıqlama |
|---|---|
| Fərdi müştəri | Basic (pulsuz), Pro, Premium planları |
| Partner | Müqavilə əsasında xüsusi qiymətlə işləyən tərəfdaş |
| Topdan alıcı | Toplu məhsul alışı |
| Korporativ müştəri | Çoxlu ünvanı və cihazı olan təşkilat, servis müqaviləsi |

### 4.5. Gəlir mənbələri

- Servis haqları (diaqnostika, təmir, quraşdırma, periodik servis)
- Məhsul və ehtiyat hissəsi satışı
- Müştəri abunəlikləri (Pro, Premium)
- Müstəqil usta abunəlikləri (iş üzrə komissiya tutulmur)
- Ustalar üçün promote / reklam
- B2B müqavilələri və korporativ planlar
- Logistika haqları (götürmə, çatdırılma)
- Şirkət lisenziyaları (multi-tenant mərhələsində)

## 5. Fərziyyələr və məhdudiyyətlər

### 5.1. Fərziyyələr

Əsas biznes qərarları təsdiqlənib (Əlavə D). Qalan fərziyyələr:

- Seçilən provayderlər (ödəniş, taksit, fiskal kassa, e-qaimə, SMS, WhatsApp, xəritə) API inteqrasiyası təqdim edir. Bu, provayder seçimi zamanı yoxlanılır (Əlavə E).
- Kommersiya rəqəmləri (plan qiymətləri, B2B şərtləri, komissiya dərəcələri) buraxılışdan əvvəl müəyyən edilir və admin paneldən daxil edilir (§77).

### 5.2. Məhdudiyyətlər

- Frontend biznes hesablaması aparmır: qiymət, endirim, vergi, stok, vahid çevirməsi backend-dədir (§64).
- Frontend səlahiyyət sisteminin əsas qoruma qatı deyil (§70).
- Qiymətlər, abunə planları və limitləri, endirim qaydaları, workflow mərhələləri, haqq qaydaları, vergi dərəcələri, KPI hədəfləri və brend elementləri kodda sabit yazılmır — konfiqurasiya olunur.
- Platforma heç bir xarici provayderə sərt bağlanmır. Provayder dəyişəndə əsas biznes məntiqi yenidən yazılmır (Əlavə E).
- Azərbaycan qanunvericiliyinin fərdi məlumatlar, istehlakçı hüquqları, vergi və kassa tələbləri nəzərə alınmalıdır. Konkret tələblər hüquqşünas və mühasiblə təsdiqlənəcək.

---

# Hissə II — İstifadəçilər və giriş

## 6. Anlayışların ayrılması

Sistemdə yalnız `USER` və `TECHNICIAN` kimi iki rol olmamalıdır. Aşağıdakı anlayışlar bir-birindən ayrı saxlanılır:

| Anlayış | Nəyi müəyyən edir | Nümunə |
|---|---|---|
| Rol | Sistemdə nə edə bildiyini (icazələr) | `TECHNICIAN`, `DISPATCHER` |
| İxtisas | Hansı işləri görə bildiyini | Kondisioner → Təmir |
| Məşğulluq tipi | Şirkətlə əlaqəsini | `STAFF`, `INDEPENDENT` |
| Abunə planı / lisenziya | Hansı əlavə imkanlara çıxışı olduğunu | Müstəqil usta Pro, Müştəri Premium, Korporativ plan, STAFF lisenziyası |
| Müştəri seqmenti | Qiymət siyahısını və kommersiya şərtlərini | `RETAIL`, `PARTNER`, `WHOLESALE`, `CORPORATE` |

Bir istifadəçinin bir neçə rolu ola bilər (məsələn, usta həm də müştəridir). Belə halda interfeysdə rejim dəyişdirmə olur.

## 7. İstifadəçi rolları

### 7.1. Xarici rollar

| Rol | Kod | Təsvir | İnterfeys |
|---|---|---|---|
| Qonaq | `GUEST` | Qeydiyyatsız ziyarətçi: kataloqa və məzmuna baxır, səbətə məhsul əlavə edir. Servis sifarişi və checkout üçün giriş məcburidir. | Public sayt |
| Müştəri | `CUSTOMER` | Fərdi müştəri | Müştəri kabineti |
| Korporativ müştəri | `CORPORATE_CUSTOMER` | Çoxlu ünvan və cihazı olan təşkilat | Korporativ panel |
| Partner | `PARTNER` | Müqavilə əsasında işləyən tərəfdaş (diler, quraşdırıcı şirkət və s.) | Partner paneli |
| Topdan alıcı | `WHOLESALE_CUSTOMER` | Toplu məhsul alan şirkət | Topdan paneli |
| Usta | `TECHNICIAN` | Servis işlərini icra edir; məşğulluq tipi `STAFF` və ya `INDEPENDENT` | Usta paneli |

### 7.2. Daxili rollar

| Rol | Kod | Təsvir |
|---|---|---|
| Operator | `OPERATOR` | Sifarişləri qəbul edir və yoxlayır, telefon zəngi əsasında sifariş yaradır |
| Dispetçer | `DISPATCHER` | Ustaları təyin edir, iş cədvəlini idarə edir |
| Anbar əməkdaşı | `WAREHOUSE_EMPLOYEE` | Qəbul, buraxılış, transfer, sayım |
| Kuryer / Sürücü | `COURIER` | Yalnız özünə təyin olunmuş götürmə, çatdırılma və daşınma tapşırıqlarını icra edir (§21.6) |
| Satış əməkdaşı | `SALES_EMPLOYEE` | Satış, kommersiya təklifləri, B2B sifarişləri |
| Mühasib | `ACCOUNTANT` | Ödənişlər, fakturalar, kassa, maliyyə hesabatları |
| Menecer | `MANAGER` | Filial əməliyyatları və hesabatları |
| Admin | `ADMIN` | Sistem konfiqurasiyası: kataloq, workflow, qiymət qaydaları, abunə planları |
| Super Admin | `SUPER_ADMIN` | Tam səlahiyyət: rollar, icazələr, təşkilat səviyyəli ayarlar |

Kuryerdən başqa bütün daxili rollar `apps/admin` tətbiqində işləyir. Kuryer admin panelə daxil olmur — `apps/web`-dəki sadə mobil interfeysdən istifadə edir (§60.6).

### 7.3. Girişdən sonra yönləndirmə

| Rol | Açılış səhifəsi |
|---|---|
| `CUSTOMER` | `/account` |
| `CORPORATE_CUSTOMER` | `/corporate` |
| `PARTNER` | `/partner` |
| `WHOLESALE_CUSTOMER` | `/wholesale` |
| `TECHNICIAN` | `/technician/dashboard` |
| `COURIER` | `/courier` |
| Digər daxili rollar | `apps/admin` → Dashboard |
| Bir neçə rol | Rejim seçimi, sonra seçilmiş interfeys |

Gələcək mobil tətbiq də eyni məntiqlə işləyəcək: bir tətbiq, girişdən sonra rola görə interfeys.

## 8. İcazə modeli (RBAC)

### 8.1. Prinsiplər

- İcazə formatı: `resurs:əməliyyat` — məsələn `products:edit`, `service_orders:assign`, `estimates:approve`.
- Əməliyyatlar: `view`, `create`, `edit`, `delete`, `approve`, `assign`, `export`.
- Əhatə dairəsi (scope):
  - `OWN` — yalnız öz qeydləri;
  - `ASSIGNED` — ona təyin olunan qeydlər;
  - `BRANCH` — öz filialı;
  - `ORGANIZATION` — bütün təşkilat;
  - `PLATFORM` — bütün tenantlar (gələcək, yalnız Super Admin).
- Rol icazələr dəstidir. Super Admin rolları və icazələri paneldən redaktə edə bilir.

### 8.2. İlkin icazə matrisi

Aşağıdakı cədvəl standart (default) dəstdir; Super Admin tərəfindən dəyişdirilə bilər.

**İdarə** — tam; **Redaktə** — yaratma və dəyişmə, silmə yoxdur; **Baxış** — yalnız oxuma; **Öz** — yalnız özünə aid; **—** — çıxış yoxdur.

| Modul | Operator | Dispetçer | Anbar | Satış | Mühasib | Menecer | Admin | Usta |
|---|---|---|---|---|---|---|---|---|
| Servis sifarişləri | Redaktə | Redaktə | Baxış | Baxış | Baxış | İdarə | İdarə | Öz |
| Usta təyinatı | Baxış | İdarə | — | — | — | İdarə | İdarə | Öz (qəbul / imtina) |
| Workflow şablonları | Baxış | Baxış | — | — | — | Baxış | İdarə | — |
| Kataloq və PIM | Baxış | Baxış | Baxış | Baxış | Baxış | Baxış | İdarə | Baxış |
| Qiymət qaydaları | — | — | — | Baxış | Baxış | Baxış | İdarə | — |
| Anbar, transfer, sayım | Baxış | Baxış | İdarə | Baxış | Baxış | İdarə | İdarə | Öz (maşın anbarı) |
| Alış və təchizatçılar | — | — | Redaktə | — | Baxış | İdarə | İdarə | — |
| Satış sifarişləri | Redaktə | — | Baxış | İdarə | Baxış | İdarə | İdarə | — |
| Ödəniş, kassa, faktura | Baxış | — | — | Baxış | İdarə | Baxış | İdarə | Öz (nağd qəbulu) |
| Maliyyə hesabatları | — | — | — | — | İdarə | Baxış | İdarə | — |
| Abunə planları | — | — | — | Baxış | Baxış | Baxış | İdarə | — |
| B2B hesabları | — | — | — | İdarə | Baxış | İdarə | İdarə | — |
| Partner komissiyaları | — | — | — | Baxış | İdarə | Baxış | İdarə | — |
| Usta hesablaşmaları | — | — | — | — | İdarə | Baxış | İdarə | Öz |
| Logistika tapşırıqları | Redaktə | İdarə | Redaktə | Baxış | — | İdarə | İdarə | Öz |
| İstifadəçilər və rollar | Baxış | Baxış | — | Baxış | — | Baxış | İdarə | — |
| Audit log | — | — | — | — | Baxış | Baxış | Baxış | — |

- Menecerin əhatəsi `BRANCH`, Adminin əhatəsi `ORGANIZATION`-dır. Rol və icazələrin redaktəsi, tam audit log yalnız Super Admin-dədir.
- **Kuryer:** yalnız özünə təyin olunmuş logistika tapşırıqlarına baxır və onların statusunu yeniləyir (`logistics_tasks:view`, `logistics_tasks:update_status`, əhatə `ASSIGNED`). Başqa modullara çıxışı yoxdur.

## 9. Autentifikasiya

### 9.1. Ekranlar

- Giriş
- Qeydiyyat: fərdi müştəri, usta müraciəti, B2B müraciəti
- Şifrəni unutdum / şifrənin yenilənməsi
- Telefon OTP
- E-poçt və telefon təsdiqi
- İki faktorlu autentifikasiya (2FA)

### 9.2. Giriş üsulları

Sistem iki bərabərhüquqlu giriş üsulunu dəstəkləyir; istifadəçi istədiyini seçir:

1. Telefon nömrəsi + OTP
2. E-poçt + şifrə

- Bir hesaba həm telefon, həm e-poçt bağlana bilər; ikisi də təsdiqlənmiş olmalıdır.
- Qeydiyyat hər iki üsulla mümkündür. Sonradan ikinci üsul profildən əlavə edilir.
- Sosial şəbəkə ilə giriş ilkin mərhələdə tələb olunmur (Future, §74.2).

### 9.3. Qaydalar

- Servis sifarişi, checkout və abunə üçün giriş məcburidir. Qonaq sifarişi və avtomatik qonaq hesabı yoxdur.
- Girişsiz istifadəçi sifariş və ya checkout-a başlayanda giriş səhifəsinə yönləndirilir, girişdən sonra axına qaytarılır. Səbət saxlanılır.
- Kuryer istisna olmaqla daxili rollar üçün 2FA məcburidir. Kuryer telefon + OTP ilə daxil olur.
- Rol əsaslı routing: hər panel yalnız icazəsi olan rollara açılır.
- Sessiya müddəti bitəndə istifadəçi giriş səhifəsinə yönləndirilir və əvvəlki səhifəyə qaytarılır.

### 9.4. Usta qeydiyyatı axını

1. Şəxsi məlumatlar və əlaqə
2. İxtisasların seçilməsi (§11)
3. Xidmət zonası və iş saatları
4. Sənədlərin yüklənməsi (şəxsiyyət, sertifikatlar)
5. Abunə planının seçilməsi və ödəniş (`INDEPENDENT`). `STAFF` usta bu axından keçmir — hesabını admin yaradır və şirkət lisenziyasına bağlayır (§12)
6. Yoxlama: `PENDING_VERIFICATION` → `VERIFIED` və ya `REJECTED`
7. Aktivləşdirmə

Sənəd statusları: `PENDING`, `VERIFIED`, `REJECTED`, `EXPIRED`.

### 9.5. B2B qeydiyyatı axını

1. Şirkət məlumatları: ad, VÖEN, hüquqi ünvan, əlaqə şəxsi
2. Seqment seçimi: Partner, Topdan və ya Korporativ
3. Sənədlərin yüklənməsi
4. Satış əməkdaşı tərəfindən yoxlama və təsdiq
5. Qiymət siyahısı, ödəniş şərtləri və kredit limitinin təyini
6. Korporativ üçün plan və ünvan limitinin, Partner üçün partner tipinin və komissiya şərtlərinin təyini (§44, §45)

---

# Hissə III — Servis əməliyyatları

## 10. Servis kataloqu

### 10.1. Struktur

Servis avadanlıq kateqoriyası ilə xidmət növünün birləşməsidir: **Servis = Kateqoriya × Xidmət növü**. Məsələn: "Kondisioner → Quraşdırma", "Kombi → Periodik servis".

Hər servis üçün təyin olunur:

- ad və təsvir (AZ / RU / EN), slug
- mümkün icra formaları (§14)
- qiymət modeli (§10.2)
- tələb olunan ixtisas(lar) (§11)
- workflow şablonu (§17)
- təxmini müddət
- iş zəmanəti müddəti (§23)
- şəkillər, FAQ, SEO sahələri

### 10.2. Qiymət modelləri

| Model | Açıqlama | Nümunə |
|---|---|---|
| Sabit qiymət | Qiymət əvvəlcədən məlumdur | Kondisionerin təmizlənməsi |
| Başlanğıc qiymət | "…-dan" qiyməti göstərilir, yekun məbləğ smeta ilə | Kombinin quraşdırılması |
| Smeta əsaslı | Qiymət diaqnostika və ya ölçüdən sonra müəyyən olunur | Kompressorun təmiri |

Əlavə haqlar (çağırış, diaqnostika, iş saatından kənar, logistika) qaydalarla tətbiq olunur (§20).

## 11. Usta ixtisas sistemi

Rol ixtisas deyil. `TECHNICIAN` rolu ustanın sistemdə nə edə bildiyini, ixtisas isə hansı işləri görə bildiyini müəyyən edir.

### 11.1. Model

İxtisas **kateqoriya × xidmət növü** cütüdür. Əlavə olaraq kateqoriyaya aid bacarıqlar (tag) təyin oluna bilər.

```
Kondisioner
 ├── Xidmət növləri: Diaqnostika, Təmir, Quraşdırma, Sökülmə, Periodik servis
 └── Bacarıqlar:     Qaz doldurma
Kombi
 ├── Xidmət növləri: Diaqnostika, Təmir, Quraşdırma, Periodik servis
 └── Bacarıqlar:     Baca sistemi
Hovuz
 ├── Xidmət növləri: Diaqnostika, Təmir, Quraşdırma, Periodik servis
 └── Bacarıqlar:     Nasos, Filtrasiya, Avtomatika
İstilik sistemi
 ├── Xidmət növləri: Diaqnostika, Quraşdırma, Təmir
 └── Bacarıqlar:     Borulama
Elektrik
 └── Xidmət növləri: Diaqnostika, Quraşdırma, Təmir
Ümumi (kateqoriyadan asılı olmayan)
 └── Xidmət növləri: Ölçü götürmə
```

### 11.2. Nümunələr

| Usta | İxtisaslar |
|---|---|
| Usta A | Kondisioner → Diaqnostika; Kondisioner → Təmir |
| Usta B | Kombi → Quraşdırma; Kombi → Təmir |
| Usta C | Ümumi → Ölçü götürmə |
| Usta D | Elektrik → Quraşdırma |

### 11.3. Qaydalar

- Bir ustanın bir neçə ixtisası ola bilər.
- Sifariş yalnız tələb olunan ixtisası olan ustaya təklif və təyin oluna bilər. Kombi sifarişi kondisioner ustasına göndərilmir.
- Müəyyən ixtisaslar üçün sertifikat tələb oluna bilər (məsələn, qaz işləri). Sertifikatın müddəti bitəndə ixtisas avtomatik deaktiv olur.
- Yeni ixtisas əlavə edilməsi admin təsdiqi ilə aktivləşir.
- Ustanın ixtisas üzrə təcrübə səviyyəsi (başlanğıc, orta, ekspert) təyinat sıralamasında istifadə oluna bilər.

## 12. Usta məşğulluq tipləri

| Xüsusiyyət | Şirkət əməkdaşı (`STAFF`) | Müstəqil usta (`INDEPENDENT`) |
|---|---|---|
| Hesabın yaradılması | Admin tərəfindən | Özü qeydiyyatdan keçir və yoxlanılır (§9.4) |
| İstifadə modeli | Daxili lisenziya; fərdi abunə ödəmir (§12.1) | Fərdi ödənişli abunə məcburidir (§43) |
| Şirkətlə əlaqə | Bir şirkətə (tenant) bağlıdır | Bir neçə şirkətlə əməkdaşlıq edə bilər (§56.2) |
| Filial | Filiala bağlıdır | Xidmət zonasına bağlıdır |
| İş cədvəli | Filial və dispetçer idarə edir | Özü müəyyən edir |
| Sifarişin qəbulu | Təyin olunan işdən imtina yalnız səbəb göstərməklə | Təklifi qəbul və ya rədd edə bilər |
| Material | Şirkət anbarından, servis sərfiyyatı kimi (§22) | Şirkətdən usta qiyməti ilə alır və ya öz materialından istifadə edir |
| Müştəri ödənişi | Şirkətə edilir; usta şirkət adına nağd qəbul edə bilər (§50) | Şirkətə edilir; usta ödənişi öz adına qəbul etmir (§47) |
| Rəsmi sənədlər | Şirkətin adından | Şirkətin adından (§49) |
| Gəlir | Əmək haqqı və iş üzrə bonus (§51.2) | Daxili hesablaşma; komissiya tutulmur (§51.3) |
| Public profil | Opsional | Var |
| Reytinq və rəylər | Var | Var |

### 12.1. STAFF lisenziya modeli

- `STAFF` ustaların platformadan istifadəsi şirkət (tenant) səviyyəsində daxili lisenziya ilə tənzimlənir. Fərdi abunə planları onlara tətbiq olunmur.
- Lisenziya ustaya admin tərəfindən verilir və geri alınır; aktiv lisenziyası olmayan `STAFF` usta işə təyin oluna bilməz.
- `STAFF` ustanın imkanları (material rezervasiyası, statistika, müştəri tarixçəsi) rol və filial ayarları ilə təyin olunur.
- İlkin (bir şirkətli) mərhələdə lisenziyalar daxili istifadədir. Multi-tenant mərhələdə şirkətin aktiv lisenziya sayı onun platforma müqaviləsi ilə müəyyən olunur.

## 13. Servis sifarişi

### 13.1. Yaradılma kanalları

- Veb sayt — müştəri özü
- Operator — telefon zəngi, WhatsApp, servis mərkəzinə gəliş
- B2B panelləri — Korporativ və Partner (§45)
- Avtomatik — abunə və ya korporativ müqavilə üzrə periodik servis planı
- Zəmanət iddiası (§23.4)
- Məhsul alışı ilə birlikdə quraşdırma (§31.4)

### 13.2. Sahələr

| Sahə | Qeyd |
|---|---|
| Xidmət kateqoriyası və növü | Məcburi |
| İcra forması | Servisə görə mümkün formalar (§14) |
| Cihaz | "Mənim cihazlarım"dan seçim və ya yeni cihaz: kateqoriya, marka, model, serial nömrə |
| Problem | Siyahıdan seçim və açıqlama |
| Şəkillər və video | Opsional |
| Ünvan və xəritədə yer | Ünvanda servis və götürmə üçün məcburi. Yadda saxlanılan ünvandan seçilir; birdəfəlik ünvan yalnız plan icazə verirsə (§42) |
| Tarix və vaxt slotu | Boş slotlardan seçim (§16) |
| Usta seçimi | Opsional (§15) |
| Təcili servis | Yalnız Premium müştərilər (§42) |
| Əlaqə vasitəsi | Zəng, SMS, WhatsApp, e-poçt |
| Qeyd | Opsional |

Sifariş təsdiqlənməzdən əvvəl müştəriyə göstərilir: qiymət modeli və ya təxmini qiymət, tətbiq oluna biləcək haqlar (§20), ləğv şərtləri.

### 13.3. Qaydalar

- Hər sifarişin insan oxuya bilən nömrəsi var (məsələn, `SV-1052`). Prefiks konfiqurasiya olunur.
- Servis sifarişini yalnız sistemə daxil olmuş istifadəçi yarada bilər. Qonaq sifarişi yoxdur (§9.3).
- Ləğv standart halda pulsuzdur. İstisnalar yalnız haqq qaydaları ilə tətbiq olunur (§20).
- Operator telefon zəngi əsasında müştəri adından sifariş yaradanda sifariş mənbəyi və operator qeyd olunur. Müştərinin hesabı yoxdursa, operator onun telefon nömrəsi ilə hesab qeydiyyatdan keçirir; müştəri ilk girişdə hesabı OTP ilə təsdiqləyir.
- Partner öz müştərisi adından sifariş yarada bilər (§45.1).

## 14. Servis icra formaları

| Forma | Kod | Açıqlama |
|---|---|---|
| Ünvanda servis | `ON_SITE` | Usta müştərinin ünvanına gəlir |
| Servis mərkəzinə gətirmə | `CARRY_IN` | Müştəri cihazı özü servis mərkəzinə gətirir və təmirdən sonra götürür |
| Götürmə və çatdırma | `PICKUP_DELIVERY` | Cihaz ünvandan götürülür, servis mərkəzinə daşınır, təmirdən sonra geri çatdırılır (§21) |

Qaydalar:

- Hər servis üçün mümkün icra formaları admin tərəfindən təyin olunur.
- Hər icra forması öz workflow şablonu ilə işləyir (§17).
- Dispetçer icra formasını sifariş gedişində dəyişə bilər (məsələn, ünvanda diaqnostikadan sonra cihaz servis mərkəzinə aparılır). Bu halda sifariş yeni formanın şablonuna keçir və müştəri xəbərdar edilir.

## 15. Usta təyinatı

### 15.1. Üsullar

| Üsul | Təşəbbüskar | Axın |
|---|---|---|
| Müştəri seçimi | Müştəri | Müştəri uyğun ustalar siyahısından seçir → ustaya təklif göndərilir → usta qəbul edir. Rədd və ya cavab olmazsa müştəriyə alternativ təklif olunur və ya sifariş dispetçerə keçir. |
| Dispetçer təyinatı | Dispetçer | Dispetçer lövhəsindən (§16) ustanı təyin edir. |
| Avtomatik təyinat | Sistem | Uyğunluq sıralamasına görə ustaya təklif göndərilir. Müəyyən vaxtda cavab gəlməzsə növbəti namizədə keçir. Namizəd qalmazsa dispetçerə eskalasiya olunur. |

- Default üsul xidmət növü və filial üzrə konfiqurasiya olunur.
- Dispetçer istənilən mərhələdə təyinatı dəyişə bilər; dəyişiklik səbəbi ilə tarixçəyə yazılır.
- Təklifə cavab müddəti konfiqurasiya olunur.

### 15.2. Məcburi uyğunluq şərtləri

- tələb olunan ixtisas
- xidmət zonası
- seçilmiş vaxtda boşluq
- aktiv status və etibarlı sənədlər
- `STAFF` usta üçün aktiv lisenziya
- müstəqil usta üçün aktiv abunə, sifariş limitinin olması və sifarişin şirkəti ilə təsdiqlənmiş əməkdaşlıq (§56.2)

### 15.3. Sıralama meyarları

Meyarların çəkisi konfiqurasiya olunur:

- məsafə və ya yol vaxtı
- reytinq və zəmanət iddiası göstəricisi
- cari iş yükü
- məşğulluq tipi (`STAFF` / `INDEPENDENT` prioriteti)
- abunə planı üzrə prioritet (§43)
- müştərinin əvvəlki ustası
- lazım olan materialın ustanın mobil anbarında olması

### 15.4. Müştəriyə göstərilən ustalar

- Kart: ad, şəkil, reytinq, tamamlanmış iş sayı, ixtisaslar, ən yaxın boş vaxt.
- Promote olunan ustalar "Reklam" nişanı ilə göstərilir.
- Ustanın şəxsi telefon nömrəsi təyinat təsdiqlənənə qədər müştəriyə göstərilmir.

## 16. İş cədvəli və vaxt slotları

- **Ustanın təqvimi:** iş saatları, istirahət günləri, məzuniyyət, bloklanmış vaxtlar. Bir neçə şirkətlə işləyən müstəqil ustanın təqvimi vahiddir — bir şirkətin işi digər şirkət üçün həmin vaxtı bağlayır, amma işin detalları digər şirkətə göstərilmir.
- **Slotlar:** slot uzunluğu və yol üçün bufer xidmət növünə görə təyin olunur. Boş slotları backend hesablayır, müştəri yalnız boş slotları görür.
- **Təcili servis:** ən yaxın mümkün vaxt, Premium SLA-sına görə (§42).
- **Dispetçer lövhəsi:**
  - ustalar × vaxt (gün, həftə) görünüşü
  - drag & drop ilə təyinat və yenidən planlaşdırma
  - təyin olunmamış sifarişlər siyahısı
  - xəritə görünüşü (§59)
  - konflikt və SLA pozuntusu xəbərdarlıqları
- **Yenidən planlaşdırma:** müştəri, operator və ya dispetçer tərəfindən, səbəb kodu ilə; bütün tərəflər xəbərdar edilir.
- **Müştəri ünvanda deyil:** usta bunu qeyd edir (zəng cəhdi, foto, vaxt). Mərhələ `FAILED` olur və sifariş yenidən planlaşdırmaya düşür.

## 17. Workflow mühərriki

Bir servis sifarişi bir neçə mərhələdən və bir neçə icraçıdan ibarət ola bilər. Mərhələlər kodda sabit yazılmır — admin tərəfindən qurulan şablonlarla müəyyən olunur.

### 17.1. Şablon

- Şablon servis və icra forması üzrə təyin olunur. Məsələn: "Kondisioner quraşdırma — Ünvanda".
- Şablon sahələri: ad, aid olduğu servislər və icra formaları, mərhələlərin ardıcıllığı, versiya, status.
- Şablon statusları: `DRAFT`, `ACTIVE`, `ARCHIVED`.

### 17.2. Mərhələ parametrləri

| Parametr | Açıqlama |
|---|---|
| Ad | AZ / RU / EN |
| Müştəriyə görünən ad | Müştəri timeline-ında göstərilən sadə ad. Boş olarsa mərhələ müştəriyə göstərilmir. |
| Mərhələ növü | Yoxlama, ölçü, diaqnostika, smeta və təsdiq, anbar hazırlığı, logistika, icra (təmir və ya quraşdırma), test, yekun yoxlama, təhvil, ödəniş |
| İcraçı | Rol (operator, anbar, dispetçer və s.) və ya müəyyən ixtisası olan usta |
| Məcburilik | Məcburi və ya opsional. Opsional mərhələni operator və ya dispetçer keçə bilər (`SKIPPED`). |
| Başlama şərtləri | Məsələn: smeta təsdiqlənib, avans ödənilib, material rezerv olunub |
| Tamamlanma tələbləri | Məcburi foto, checklist, müştəri imzası, qeyd |
| SLA | Mərhələ üçün maksimum müddət; aşıldıqda eskalasiya |
| Paralellik | Mərhələ əvvəlki mərhələ ilə paralel icra oluna bilər |
| Bildirişlər | Mərhələ başlayanda və bitəndə kimə nə göndərilir |

### 17.3. İdarəetmə qaydaları

- Admin mərhələ yarada, dəyişə, sıralaya və silə bilər.
- Şablonlar versiyalanır. Dəyişiklik yeni versiya yaradır; aktiv sifarişlər başladıqları versiya ilə davam edir.
- İstifadədə olan versiyadan mərhələ fiziki silinmir — yeni versiyada çıxarılır.
- Aktivləşdirmədən əvvəl şablon yoxlanılır: ən azı bir icra və bir təhvil mərhələsi olmalı, başlama şərtləri bir-birinə zidd olmamalıdır.
- Şablonlar təşkilat səviyyəsindədir. Filiallar öz variantını yarada bilməz — proses bütün sistem üzrə vahid qalır.
- Şablonları yalnız `workflow_templates:edit` icazəsi olan istifadəçilər dəyişə bilər. Bütün dəyişikliklər audit log-a yazılır.

### 17.4. Nümunə şablonlar

**A. Kondisioner quraşdırma — Ünvanda (`ON_SITE`)**

| # | Mərhələ | İcraçı |
|---|---|---|
| 1 | Operator yoxlaması | Operator |
| 2 | Ölçü götürmə | Usta (Ümumi → Ölçü götürmə) |
| 3 | Material hesablanması | Usta və ya satış əməkdaşı |
| 4 | Smeta və müştəri təsdiqi | Müştəri |
| 5 | Anbar hazırlığı | Anbar əməkdaşı |
| 6 | Çatdırılma | Logistika (§21) |
| 7 | Quraşdırma | Usta (Kondisioner → Quraşdırma) |
| 8 | Elektrik qoşulması (opsional) | Usta (Elektrik → Quraşdırma) |
| 9 | Yekun yoxlama | Usta və ya menecer |
| 10 | Təhvil və ödəniş | Usta və müştəri |
| 11 | Zəmanətin aktivləşməsi | Sistem |

**B. Kondisioner təmiri — Ünvanda (`ON_SITE`)**

Operator yoxlaması → Usta təyinatı → Gəliş → Diaqnostika → Smeta təsdiqi → Hissə gözlənilməsi (opsional) → Təmir → Test → Təhvil və ödəniş → Zəmanət

**C. Kombi təmiri — Servis mərkəzinə gətirmə (`CARRY_IN`)**

Qəbul aktı → Diaqnostika → Smeta təsdiqi → Təmir → Test → Hazırdır (müştəriyə bildiriş) → Müştəriyə təhvil və ödəniş → Zəmanət

**D. Kombi təmiri — Götürmə və çatdırma (`PICKUP_DELIVERY`)**

Operator yoxlaması → Götürmə və qəbul aktı → Servis mərkəzinə daşınma → Diaqnostika → Smeta təsdiqi → Təmir → Test → Geri çatdırılma → Təhvil və ödəniş → Zəmanət

## 18. Statuslar

Status modeli iki səviyyəlidir: **sifarişin ümumi statusu** (sabit sistem siyahısı) və **hər mərhələnin öz statusu**. Mərhələlərin özləri şablondan gəlir (§17).

### 18.1. Sifariş statusu

| Status | Açıqlama |
|---|---|
| `DRAFT` | Operator tərəfindən başlanmış, tamamlanmamış sifariş |
| `NEW` | Yaradılıb, yoxlanılmayıb |
| `CONFIRMED` | Operator təsdiqləyib |
| `IN_PROGRESS` | Workflow icra olunur |
| `WAITING_FOR_CUSTOMER` | Müştərinin təsdiqi, ödənişi və ya cavabı gözlənilir |
| `ON_HOLD` | Dayandırılıb (səbəb kodu ilə) |
| `COMPLETED` | Bütün məcburi mərhələlər tamamlanıb |
| `CLOSED` | Ödəniş və sənədlər tamamlanıb |
| `CANCELLED` | Ləğv olunub (səbəb kodu ilə) |
| `REJECTED` | Qəbul olunmayıb, məsələn xidmət zonasından kənardır (səbəb kodu ilə) |

### 18.2. Mərhələ statusu

| Status | Açıqlama |
|---|---|
| `PENDING` | Hələ başlamayıb |
| `READY` | Başlama şərtləri ödənib |
| `ASSIGNED` | İcraçı təyin olunub |
| `ACCEPTED` | Usta işi qəbul edib |
| `ON_THE_WAY` | Usta və ya kuryer yoldadır |
| `ARRIVED` | Ünvana çatıb |
| `IN_PROGRESS` | İcra olunur |
| `WAITING_FOR_APPROVAL` | Müştəri təsdiqi gözlənilir |
| `WAITING_FOR_PART` | Hissə gözlənilir |
| `BLOCKED` | Başqa səbəbdən dayanıb |
| `COMPLETED` | Tamamlanıb |
| `SKIPPED` | Opsional mərhələ keçilib |
| `FAILED` | Uğursuz (məsələn, müştəri ünvanda deyil) |
| `CANCELLED` | Ləğv olunub |

Hər mərhələ bütün statuslardan istifadə etmir. Məsələn, `ON_THE_WAY` və `ARRIVED` yalnız sahə mərhələləri üçündür.

### 18.3. v1 statuslarının yeni modeldə qarşılığı

| v1 status | v2 qarşılığı |
|---|---|
| `NEW` | Sifariş: `NEW` |
| `CONFIRMED` | Sifariş: `CONFIRMED` |
| `WAITING_FOR_TECHNICIAN` | Mərhələ: `READY` (icraçı yoxdur) |
| `TECHNICIAN_ASSIGNED` | Mərhələ: `ASSIGNED` / `ACCEPTED` |
| `ON_THE_WAY` | Mərhələ: `ON_THE_WAY` |
| `DIAGNOSIS` | "Diaqnostika" mərhələsi: `IN_PROGRESS` |
| `WAITING_FOR_CUSTOMER_APPROVAL` | Mərhələ: `WAITING_FOR_APPROVAL`; sifariş: `WAITING_FOR_CUSTOMER` |
| `WAITING_FOR_PART` | Mərhələ: `WAITING_FOR_PART` |
| `IN_REPAIR` | "Təmir" mərhələsi: `IN_PROGRESS` |
| `TESTING` | "Test" mərhələsi: `IN_PROGRESS` |
| `READY` | "Hazırdır" mərhələsi: `COMPLETED` |
| `COMPLETED` | Sifariş: `COMPLETED` |
| `DELIVERED` | "Təhvil" və ya "Geri çatdırılma" mərhələsi: `COMPLETED` |
| `CANCELLED` | Sifariş: `CANCELLED` |

### 18.4. Keçid qaydaları

- Status keçidləri backend-də state machine ilə yoxlanılır. Frontend yalnız API-nin qaytardığı mümkün əməliyyatları (`availableActions`) göstərir.
- Hər keçid tarixçəyə yazılır: kim, nə vaxt, əvvəlki və yeni status, səbəb.
- `ON_HOLD`, `CANCELLED`, `REJECTED` və `FAILED` üçün səbəb kodu məcburidir. Səbəb kodları admin tərəfindən idarə olunur.

### 18.5. Göstərilmə

| İstifadəçi | Görünüş |
|---|---|
| Müştəri | Yalnız müştəriyə görünən adı olan mərhələlərdən ibarət sadə timeline |
| Usta | Ona aid mərhələlər və növbəti əməliyyat düymələri |
| Daxili əməkdaşlar | Tam timeline: bütün mərhələlər, icraçılar, SLA göstəricisi, tarixçə |

## 19. Diaqnostika və smeta

### 19.1. Diaqnostika

Usta sifarişə baxaraq:

- problemi müəyyən edir (siyahıdan və ya sərbəst)
- qeyd yazır, şəkil və video əlavə edir
- lazım olan materialları seçir — anbar qalığı və uyğunluq sistemi (§27) ilə
- iş haqqını və əlavə xidmətləri əlavə edir

Qiymətləri sistem hesablayır. Usta material qiymətini xüsusi icazə olmadan dəyişə bilməz.

### 19.2. Smeta

Sətir növləri: material, iş, əlavə xidmət, logistika, haqq, endirim.

```
Kompressor               1 əd.     120.00 AZN
Qaz R32                  1.2 kq     35.00 AZN
Usta xidməti                        40.00 AZN
----------------------------------------------
Cəmi:                              195.00 AZN
```

Smetada həmçinin göstərilir: tətbiq olunan endirimlər (abunə, kampaniya), ƏDV (§49), sətirlər üzrə zəmanət müddəti, smetanın etibarlılıq müddəti.

### 19.3. Müştəri qərarı

| Qərar | Nəticə |
|---|---|
| Təsdiqlə | Workflow növbəti mərhələyə keçir |
| Qismən təsdiqlə | Yalnız opsional kimi işarələnmiş sətirlərdən imtina etmək olar |
| İmtina et | Səbəb seçilir; sifariş ləğv olunur və ya yeni smeta hazırlanır. `CARRY_IN` və `PICKUP_DELIVERY` formalarında cihazın qaytarılması mərhələsinə keçilir. |
| Sual ver | Operatorla əlaqə |

Təsdiq kanalları:

- müştəri kabineti
- SMS və ya WhatsApp linki (OTP ilə)
- ünvanda ustanın cihazında müştəri imzası
- telefonla operator (qeyd və zəngin qeydiyyatı ilə)

### 19.4. Qaydalar

- Smeta dəyişəndə yeni versiya yaranır, əvvəlki versiyalar saxlanılır.
- Etibarlılıq müddəti bitmiş smeta yenidən hesablanır.
- İcra zamanı faktiki məbləğ təsdiqlənmiş smetadan konfiqurasiya olunan həddən çox fərqlənərsə, müştərinin yeni təsdiqi tələb olunur.

## 20. Diaqnostika və çağırış haqqı qaydaları

### 20.1. Standart qayda

Müştəri smetanı qəbul etmədikdə diaqnostika və ya çağırış haqqı **tutulmur**.

### 20.2. İstisna qaydaları

Admin xidmət növünə və digər şərtlərə görə haqq qaydası yarada bilər.

| Parametr | Nümunə |
|---|---|
| Haqq növü | Çağırış, diaqnostika, iş saatından kənar, logistika, gec ləğv |
| Xidmət kateqoriyası / növü | Kombi → Diaqnostika |
| İcra forması | `PICKUP_DELIVERY` |
| Vaxt şərti | Həftə sonu, 20:00–08:00 |
| Zona | Şəhər xarici |
| Müştəri seqmenti / abunə | Premium müştərilərə tətbiq olunmur |
| Tətbiq anı | Həmişə; yalnız smetadan imtina edildikdə; yalnız usta yola çıxdıqdan sonra ləğv edildikdə |
| Məbləğ | Sabit məbləğ və ya faiz |
| Smeta təsdiqlənərsə | Haqq yekun məbləğə daxil edilir və ya silinir |
| Qüvvədə olma müddəti | Başlama və bitmə tarixi |

### 20.3. Qaydalar

- Tətbiq oluna biləcək haqlar müştəriyə sifariş təsdiqlənməzdən əvvəl açıq göstərilir.
- Sifarişə yaradıldığı anda qüvvədə olan qayda tətbiq olunur; sonrakı dəyişikliklər mövcud sifarişlərə təsir etmir.
- İcazəsi olan menecer haqqı ləğv edə bilər — səbəb göstərilir və audit log-a yazılır.

## 21. Logistika

### 21.1. Əhatə

- Servis üçün cihazın müştəridən götürülməsi
- Cihazın servis mərkəzinə və filiallar arasında daşınması
- Təmirdən sonra geri çatdırılma
- Satılan məhsulun çatdırılması (§31)
- Servis üçün materialın ünvana çatdırılması

### 21.2. Logistika tapşırığı

- Sahələr: növ (götürmə, çatdırma, transfer), haradan, haraya, vaxt aralığı, icraçı (usta, kuryer və ya anbar əməkdaşı), yük (cihaz, məhsul, material), əlaqəli sifariş.
- Tapşırıq workflow mərhələsinə və ya satış sifarişinə bağlıdır.
- Statuslar: `PLANNED`, `ASSIGNED`, `ON_THE_WAY`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`, `CANCELLED`.
- Tapşırığı dispetçer və ya anbar əməkdaşı kuryerə, ustaya və ya anbar əməkdaşına təyin edir.

### 21.3. Cihazın qəbulu

Qəbul aktı:

- cihaz məlumatları və serial nömrə
- xarici vəziyyət və fotolar
- komplektasiya (pult, kabel, qutu və s.)
- müştərinin bildirdiyi problem
- müştərinin elektron imzası

Cihaza QR etiket verilir.

### 21.4. Cihazın yeri

Cihazın hər an harada olduğu izlənilir:

```
Müştəridə → Yolda → Servis mərkəzi (zona / rəf) → Yolda → Müştəriyə təhvil verildi
```

Hər dəyişiklik QR skan ilə qeyd olunur.

### 21.5. Təhvil

Təhvil aktı, müştərinin elektron imzası və foto. Zəmanət təhvildən sonra başlayır.

### 21.6. Kuryer interfeysi

Kuryer / Sürücü üçün tam idarəetmə paneli yoxdur. Sadə mobil interfeysdə kuryer yalnız özünə təyin olunmuş tapşırıqlarla işləyir:

| Görür | Edə bilər |
|---|---|
| Bugünkü və növbəti tapşırıqlar (götürmə, çatdırılma, daşınma) | Statusu yeniləmək: `ON_THE_WAY` → `PICKED_UP` → `IN_TRANSIT` → `DELIVERED` və ya `FAILED` (səbəb ilə) |
| Ünvan və xəritədə yer | Naviqasiya tətbiqində ünvanı açmaq |
| Müştəri və ya qəbul edən şəxsin əlaqə məlumatları | Zəng etmək |
| Yük: cihaz, məhsul, material və qeydlər | Götürmə və təhvil zamanı foto və müştəri imzası əlavə etmək |

- Əlaqə məlumatları yalnız tapşırıq aktiv olduğu müddətdə göstərilir; tapşırıq bitəndən sonra gizlədilir.
- Kuryer qiymətləri, sifarişin maliyyə detallarını və digər tapşırıqları görmür.
- Kuryer şirkət adına nağd qəbul edə bilər, əgər bu, tapşırıqda qeyd olunubsa (§50).

## 22. Servisdə material istifadəsi

Usta anbardan götürdüyü məhsulu "satmır". Məhsul **servis sərfiyyatı (Service Consumption)** kimi qeyd olunur.

```
Servis sifarişi: SV-1052

R32 qazı          1.20 kq
Mis boru          3.50 m
Birləşdirici      2 əd.
```

Bu məlumat:

- servis stokundan çıxılır (§37)
- servisin maya dəyərinə yazılır
- smetaya uyğun olaraq müştərinin hesabına əlavə olunur; zəmanət işlərində və abunə daxilində olan xidmətlərdə ödənişsizdir

Qaydalar:

- Sərfiyyat yalnız servis sifarişinə bağlı qeyd oluna bilər.
- Faktiki miqdar smetadan fərqlənərsə §19.4 tətbiq olunur.
- İstifadə olunmayan material anbara qaytarılır (qaytarma hərəkəti, §38).
- Sökülən köhnə hissə müştəriyə verilir, utilizasiya olunur və ya zəmanət qaytarışı üçün anbara qəbul edilir — seçim sifarişdə qeyd olunur.
- `STAFF` usta şirkət stokundan istifadə edir. `INDEPENDENT` usta materialı şirkətdən alır (satış) və ya öz materialından istifadə edir; öz materialı smetada göstərilir, şirkət stokundan çıxılmır və ustanın hesablaşmasına daxil edilir (§51.3).

## 23. Zəmanət sistemi

### 23.1. Zəmanət növləri

| Növ | Mənbə |
|---|---|
| İstehsalçı zəmanəti | Məhsulun istehsalçısı |
| Satış zəmanəti | Platformada alınan məhsul |
| İş zəmanəti | Görülən servis işi |
| Hissə zəmanəti | Quraşdırılan ehtiyat hissəsi |
| Uzadılmış zəmanət | Pro və Premium abunəlik (§42) |

Müddətlər məhsul, servis və abunə planı üzrə konfiqurasiya olunur.

### 23.2. Sənədlər

Servis tamamlandıqdan sonra sistem aşağıdakıları yaradır:

- zəmanət sənədi
- servis aktı
- faktura
- fiskal çek (§49)

Sənədlər işi hansı usta görməsindən asılı olmayaraq şirkətin adından (§49), PDF formatında, müştərinin dilində yaradılır; kabinetdə saxlanılır və e-poçtla göndərilir.

### 23.3. QR ilə yoxlama

Hər zəmanət sənədində QR kod olur. Public səhifə `/warranty/verify/[code]` zəmanətin statusunu, cihazı, müddəti və əhatəsini göstərir — fərdi məlumatlar göstərilmir.

### 23.4. Zəmanət iddiası

1. Müştəri cihaz kartından və ya sənəddən iddia yaradır.
2. Operator uyğunluğu yoxlayır: müddət, əhatə.
3. `WARRANTY` tipli servis sifarişi yaradılır və əvvəlki sifarişlə əlaqələndirilir.
4. Diaqnostika zəmanət halı olub-olmadığını müəyyən edir.
5. Zəmanət halıdırsa iş ödənişsizdir; deyilsə adi smeta axını başlayır və müştəriyə səbəb göstərilir.

Zəmanət iddiaları ustanın keyfiyyət göstəricisinə təsir edir.

---

# Hissə IV — Kataloq və e-commerce

## 24. Məhsul kataloqu

- Kateqoriyalar limitsiz dərinlikdə ağac strukturundadır. Admin yeni kateqoriya əlavə edə bilər.
- Kateqoriya sahələri: ad (AZ / RU / EN), slug, şəkil, atribut dəsti (§25), sıra, aktivlik, SEO sahələri.
- Nümunə kateqoriyalar: Kondisioner, Kombi, Nasos, Radiator, Boru, Elektrik, Qaz, Mis, Filtr, Kompressor, Sensor, Elektronika, Ventilyasiya, Hovuz avadanlığı, Ehtiyat hissələri.
- Məhsul tipləri: fiziki məhsul, ehtiyat hissəsi, sərfiyyat materialı, məhsul + xidmət paketi.
- Məhsulun görünürlüyü seqmentə görə məhdudlaşdırıla bilər (məsələn, yalnız ustalar və ya topdan alıcılar üçün).

## 25. Dinamik məhsul atributları (PIM)

Məhsullar üçün sabit form istifadə edilmir. Atributlar admin paneldən yaradılır.

### 25.1. Atribut parametrləri

| Parametr | Dəyərlər |
|---|---|
| Tip | Mətn, ədəd, ədəd + vahid, bəli / xeyr, siyahıdan bir, siyahıdan bir neçə, tarix |
| Ölçü vahidi | kW, BTU/saat, dB, m², mm, bar və s. |
| Məcburilik | Məcburi / opsional |
| Filtrdə göstərilmə | Bəli / xeyr; görünüş: checkbox, aralıq, slider |
| Müqayisədə göstərilmə | Bəli / xeyr |
| Variant yaradır | Bəli / xeyr (§26) |
| Qrup | Əsas, Enerji, Ölçülər və s. |
| Tərcümə | Ad və siyahı dəyərləri AZ / RU / EN |

- Atributlar kateqoriyaya atribut dəsti kimi bağlanır. Alt kateqoriya valideyn kateqoriyanın dəstini miras alır.
- Marka və model atribut deyil — ayrıca obyektlərdir (§27).

### 25.2. Nümunələr

| Kateqoriya | Atributlar |
|---|---|
| Kondisioner | Soyutma gücü (BTU/saat), isitmə gücü (kW), inverter (bəli / xeyr), enerji sinfi, qaz tipi, tövsiyə olunan otaq sahəsi (m²), səs səviyyəsi (dB), Wi-Fi (bəli / xeyr), rəng |
| Kombi | Güc (kW), isitmə sahəsi (m²), yanacaq növü, isti su məhsuldarlığı (l/dəq), baca tipi |
| Boru | Material, diametr (mm), divar qalınlığı (mm), uzunluq (m), işçi təzyiq (bar) |

## 26. Məhsul variantları (SKU)

- **Məhsul** ümumi kartdır: ad, təsvir, şəkillər. **Variant (SKU)** satılan konkret vahiddir.
- Variant yaradan atributlar məhsul üzrə seçilir. Məsələn, eyni model üçün 9000 / 12000 / 18000 BTU və rəng.
- Hər SKU-nun öz kodu, barkodu, qiymətləri, stoku, çəkisi və ölçüləri, lazım olduqda uyğunluq siyahısı var.
- Məhsul səhifəsində seçilmiş variant URL-də əks olunur.

## 27. Marka, model və uyğunluq sistemi

### 27.1. İyerarxiya

**Marka → Seriya → Model.** Model kateqoriyaya bağlıdır. Müştəri cihazları (§53) və ehtiyat hissələri eyni model bazasından istifadə edir.

### 27.2. Uyğunluq

- Ehtiyat hissəsi ilə cihaz modeli arasında çoxa-çox əlaqə.
- Hissə ilə hissə arasında əlaqə: analoq və əvəzedici hissələr, OEM kodları.
- Uyğunluq tək-tək, seriya üzrə və ya toplu (CSV / Excel import) idarə olunur.

Nümunə — "Bu kompressor hansı kondisionerlərə uyğundur?":

```
Uyğundur:
LG DualCool X123
LG DualCool X124
LG ArtCool A50
```

### 27.3. İstifadə yerləri

- Məhsul səhifəsində "Uyğun cihazlar" bloku və "Cihazınıza uyğundurmu?" yoxlaması.
- Müştəri kataloqda modeli və ya "Mənim cihazlarım"dan cihazını seçir — yalnız uyğun hissələr göstərilir.
- Usta diaqnostikada material seçərkən uyğun hissələr önə çıxır.
- Axtarışda model adı ilə uyğun hissələr tapılır.

## 28. Filtr sistemi

Filtrlər kateqoriyaya görə dinamik dəyişir.

**Ümumi filtrlər:** qiymət, marka, model, stokda var, reytinq, istehsal ölkəsi, kampaniya, yeni məhsul, "cihazıma uyğun".

"Satıcı" filtri çox şirkətli (multi-tenant) mərhələdə aktivləşdirilir (§56).

**Texniki filtrlər** kateqoriyanın atribut dəstindən gəlir (§25). Nümunə — Kondisioner:

```
Marka           □ Bosch   □ LG   □ Samsung   □ Midea
Soyutma gücü    □ 9000    □ 12000   □ 18000   □ 24000 BTU
Texnologiya     □ Inverter   □ On/Off
Enerji sinfi    □ A+   □ A++   □ A+++
```

Tələblər:

- Filtr vəziyyəti URL-də saxlanılır və paylaşıla bilir.
- Hər seçim üzrə nəticə sayı backend-dən gəlir (facets).
- Aktiv filtrlər çip kimi göstərilir, tək-tək və ya hamısı birdən sıfırlanır.
- Mobil cihazda filtrlər ayrıca panel (sheet) kimi açılır.

## 29. Axtarış

- Global axtarış nəticələri: məhsul, ehtiyat hissəsi, marka, model, servis, FAQ.
- Nümunə: `LG 18000 compressor` yazıldıqda məhsullar, marka, model və uyğun ehtiyat hissələri çıxır.
- Autocomplete, son axtarışlar, populyar axtarışlar; nəticə olmadıqda alternativ təkliflər.
- Dil xüsusiyyətləri:
  - ə/e, ı/i, ö/o, ü/u, ş/sh, ç/ch, ğ/gh normallaşdırılması
  - kirill ↔ latın transliterasiyası
  - AZ / RU / EN sinonimləri (kondisioner / кондиционер / air conditioner)
  - yazı səhvlərinə tolerantlıq
  - model kodlarında boşluq və defisə həssas olmamaq (`X-123` = `X123`)
- Frontend axtarışı digər data kimi mock API ilə işləyir (`GET /api/search`). Axtarış mühərriki backend mərhələsində seçilir (Əlavə A).

## 30. Məhsul səhifəsi

Məcburi elementlər:

- şəkil qalereyası və video
- variant seçimi
- qiymət (istifadəçinin seqmentinə görə, §46) və endirim
- taksit təklifi (§47)
- stok (filiallar üzrə)
- marka, model, SKU
- texniki xüsusiyyətlər
- uyğun cihazlar
- zəmanət
- çatdırılma və quraşdırma seçimi
- rəylər
- əlaqəli məhsullar və alternativlər
- müqayisəyə və favoritlərə əlavə

## 31. Səbət, checkout və çatdırılma

### 31.1. Səbət

- Miqdar vahid seçimi ilə daxil edilir (məsələn, metr və ya rulon). Çevirmə və qiymət backend-dən gəlir.
- Məhsula quraşdırma xidməti əlavə etmək mümkündür.
- Promo kod.
- Qiymət və ya stok dəyişəndə xəbərdarlıq.
- Qeydiyyatsız istifadəçinin səbəti saxlanılır və girişdən sonra hesabdakı səbətlə birləşdirilir.
- Checkout yalnız sistemə daxil olmuş istifadəçi üçündür. Qonaq checkout-u yoxdur (§9.3).

### 31.2. Checkout addımları

1. Giriş yoxlaması: daxil olmayan istifadəçi giriş səhifəsinə yönləndirilir və sonra checkout-a qaytarılır
2. Çatdırılma üsulu: kuryer, filialdan götürmə və ya quraşdırma ilə birlikdə
3. Ünvan — plana görə (§42):
   - **Basic:** yalnız hesabda yadda saxlanılmış ünvan; birdəfəlik başqa ünvan daxil etmək olmaz
   - **Pro:** yadda saxlanılmış ünvan və ya birdəfəlik əlavə çatdırılma / servis ünvanı (hesabda saxlanılmır)
   - **Premium:** yadda saxlanılmış ünvanlardan biri və ya birdəfəlik ünvan
   - **B2B:** şirkət hesabının ünvanları, limit müqaviləyə görə (§44.1)
4. Quraşdırma vaxtı (paket seçilibsə)
5. Ödəniş üsulu (§47)
6. Faktura məlumatları (B2B üçün VÖEN və rekvizitlər)
7. Yoxlama və təsdiq

### 31.3. Çatdırılma

- Çatdırılma zonaları, tarifləri və vaxt aralıqları admin tərəfindən idarə olunur.
- Filialdan götürmə: filial seçimi, stokun yoxlanılması, hazır olma bildirişi.
- Böyük həcmli məhsullar üçün ayrıca çatdırılma qaydaları.

### 31.4. Məhsul + quraşdırma

- Satış sifarişi ilə birlikdə əlaqəli servis sifarişi yaradılır və quraşdırma şablonu tətbiq olunur (§17.4).
- Məhsul rezerv olunur.
- Çatdırılma və quraşdırma bir vizitdə planlaşdırıla bilər.

### 31.5. Satış sifarişi statusları

`PENDING_PAYMENT`, `CONFIRMED`, `PROCESSING`, `READY_FOR_PICKUP`, `SHIPPED`, `DELIVERED`, `COMPLETED`, `CANCELLED`, `RETURN_REQUESTED`, `RETURNED`.

## 32. Qaytarma və geri ödəniş

1. Müştəri sifarişdən qaytarma müraciəti yaradır: məhsul, miqdar, səbəb, foto.
2. Operator və ya satış əməkdaşı müraciəti yoxlayır (müddət, şərtlər).
3. Məhsul götürülür və ya müştəri filiala gətirir.
4. Anbar yoxlaması: satışa yararlı, zədəli və ya təchizatçıya qaytarılmalı.
5. Geri ödəniş ilkin ödəniş üsulu ilə və ya balansa edilir.

- Statuslar: `REQUESTED`, `APPROVED`, `REJECTED`, `RECEIVED`, `INSPECTED`, `REFUNDED`, `CLOSED`.
- Qaytarma müddəti və şərtləri istehlakçı hüquqları qanunvericiliyinə uyğun konfiqurasiya olunur.
- Quraşdırılmış və ya ölçüyə görə kəsilmiş məhsulların (məsələn, boru) qaytarılma məhdudiyyətləri müştəriyə alışdan əvvəl göstərilir.

## 33. Qalereya və media

Frontend Phase 1-də dəstəklənir:

- drag & drop və çoxlu yükləmə
- önizləmə, sıralama, əsas şəkil seçimi
- kəsmə (crop) və zoom
- video önizləmə
- yükləmə proqresi və xəta halları (format, ölçü)
- alt mətn (AZ / RU / EN)

Limitlər (format, maksimum ölçü, say) API-dən gəlir. Backend mərhələsində fayllar obyekt storage-ə yüklənir (Əlavə A).

---

# Hissə V — Anbar

## 34. Anbar strukturu

| Anbar növü | Nümunə |
|---|---|
| Mərkəzi anbar | Mərkəzi anbar |
| Filial anbarı | Bakı filialı, Naxçıvan filialı |
| Servis mərkəzi anbarı | Servis mərkəzinin ehtiyat hissələri |
| Mobil anbar | Servis maşını №1, Servis maşını №2 |
| Usta anbarı | `STAFF` ustanın üzərindəki material |
| Tranzit (virtual) | Transfer zamanı yolda olan mallar |
| Karantin | Yoxlama gözləyən və zədəli mallar |

- Hər anbar filiala bağlıdır və məsul şəxsi var.
- Anbarlar anbar qruplarında birləşdirilə bilər (məsələn, "Bakı anbarları", "Mobil anbarlar"). Anbar qrupu hesabatlarda və maya dəyəri metodunun təyinində istifadə olunur (§40.4).
- Anbar daxilində zona və rəf strukturu opsionaldır.
- Stok hər anbar üzrə ayrıca uçota alınır.

## 35. Ölçü vahidləri və əsas vahid

### 35.1. Vahidlər

| Vahid | Qısaltma |
|---|---|
| ədəd | əd. |
| metr | m |
| santimetr | sm |
| kiloqram | kq |
| qram | q |
| litr | l |
| millilitr | ml |
| rulon | rulon |
| qutu | qutu |
| paket | paket |
| banka | banka |
| balon | balon |
| dəst | dəst |
| pallet | pallet |

Vahidlərin siyahısı admin tərəfindən genişləndirilə bilər; adları AZ / RU / EN dillərindədir.

### 35.2. Əsas vahid (base unit)

Hər məhsul və material üçün ayrıca əsas vahid təyin olunur. Stok bu vahidlə saxlanılır.

| Məhsul / material | Əsas vahid |
|---|---|
| Mis boru | metr |
| Kabel | metr |
| Ehtiyat hissəsi | ədəd |
| Qaz (R32, R410A) | kiloqram |
| Maye (antifriz, yağ) | litr |

Onluq dəqiqlik vahid üzrə konfiqurasiya olunur (məsələn, ədəd — 0, metr — 2, kiloqram — 3 rəqəm).

## 36. Qablaşdırma çevirmələri və vahid qiymətləri

### 36.1. Çevirmələr

Çevirmələr məhsula məxsusdur — müxtəlif məhsulların qutusunda fərqli say ola bilər.

| Məhsul | Çevirmə |
|---|---|
| Mis boru | 1 rulon = 50 metr |
| Birləşdirici | 1 qutu = 20 ədəd |
| R32 qazı | 1 balon = 12 kq |

- Sistem çevirməni avtomatik aparır (backend).
- Satış, alış və anbar hərəkətləri icazə verilmiş istənilən vahidlə aparıla bilər; stok həmişə əsas vahidlə yazılır.
- Açılmış qablaşdırmadan satış olanda (məsələn, rulondan metrlə) qalıq əsas vahidlə uçota alınır.

### 36.2. Fərqli vahid qiymətləri

```
Boru:
1 metr            4.00 AZN
50 m rulon      180.00 AZN   (50 × 4.00 = 200.00 AZN əvəzinə)
```

Qablaşdırma qiyməti ayrıca qiymət qaydası kimi saxlanılır (§46).

## 37. Stok növləri

### 37.1. Stok təyinatı

| Təyinat | Açıqlama |
|---|---|
| Satış stoku | Onlayn və filial satışı üçün |
| Servis stoku (Service Stock) | Servis fəaliyyətində istifadə olunan ehtiyat hissələri, materiallar və sərfiyyat məhsulları |

Eyni məhsul hər iki təyinatda ola bilər. Təyinatlar arasında keçid anbar hərəkəti ilə aparılır (§38).

### 37.2. Qalıq göstəriciləri

| Göstərici | Açıqlama |
|---|---|
| Fiziki (Physical) | Anbarda faktiki olan miqdar |
| Rezerv (Reserved) | Sifarişlər və ustalar üçün ayrılmış miqdar |
| Zədəli (Damaged) | Fiziki qalığa daxildir, istifadəyə yararsızdır |
| İstifadə edilə bilən (Available) | Fiziki − Rezerv − Zədəli |
| Yolda (In Transit) | Transferdə olan, hələ qəbul edilməmiş; fiziki qalığa daxil deyil |
| Sifarişdə (On Order) | Təchizatçıdan gözlənilən |

```
Fiziki:                100 m
Rezerv:                 20 m
Zədəli:                  0 m
İstifadə edilə bilən:   80 m
```

- Bütün göstəriciləri backend hesablayır (§64).
- Göstəricilər anbar, filial və təyinat üzrə görünür.
- Minimum qalıq həddi aşağı düşəndə bildiriş göndərilir.

## 38. Anbar hərəkətləri

| Hərəkət | Açıqlama |
|---|---|
| Qəbul | Təchizatçıdan alış |
| Satış buraxılışı | Satış sifarişi üzrə |
| Servis sərfiyyatı | Servis sifarişi üzrə (§22) |
| Transfer | Anbarlar arası göndərmə və qəbul (§40.1) |
| Qaytarma | Müştəridən, ustadan və ya təchizatçıya |
| Silinmə | Zədə, itki, müddətin bitməsi |
| Təyinat dəyişikliyi | Satış stoku ↔ servis stoku |
| Düzəliş | Sayım nəticəsi (§40.3) |

- Hər hərəkətdə qeyd olunur: sənəd nömrəsi, tarix, anbar, məhsul, miqdar (daxil edilən vahid və əsas vahid), maya dəyəri, səbəb, icraçı, əlaqəli sənəd.
- Hərəkətlər silinmir, yalnız əks hərəkətlə düzəldilir.

## 39. Rezervasiya

Rezerv mənbələri: servis sifarişi (smeta təsdiqindən sonra), satış sifarişi (checkout), usta (planlaşdırılmış iş üçün), transfer.

Nümunə — usta sabahkı iş üçün 20 metr boru rezerv edir:

```
Fiziki:                100 m
Rezerv:                 20 m
İstifadə edilə bilən:   80 m
```

Qaydalar:

- Rezervin müddəti var; müddət bitəndə rezerv avtomatik buraxılır və bildiriş göndərilir.
- Usta rezervi planlaşdırılmış işə bağlı olmalıdır.
- `STAFF` ustalar üçün rezervasiya abunədən asılı deyil. `INDEPENDENT` ustalar üçün rezervasiya imkanı abunə planı ilə müəyyən olunur (§43).
- Eyni stokun iki dəfə rezerv edilməsinin və ya satılmasının qarşısı backend-də tranzaksiya səviyyəsində alınır.

## 40. Transfer, alış və sayım

### 40.1. Transfer

Nümunə: `Mərkəzi anbar → Servis maşını №4`

- Statuslar: `DRAFT` → `APPROVED` → `IN_TRANSIT` → `RECEIVED`, `PARTIALLY_RECEIVED` və ya `DISCREPANCY`; istənilən mərhələdə `CANCELLED`.
- Qəbulda fərq aşkarlanarsa uyğunsuzluq aktı yaradılır.

### 40.2. Alış və təchizatçılar

- Təchizatçı: ad, VÖEN, əlaqə, ödəniş şərtləri, məhsullar üzrə alış qiymətləri.
- Alış sifarişi statusları: `DRAFT` → `SENT` → `CONFIRMED` → `PARTIALLY_RECEIVED` → `RECEIVED` → `CLOSED`; və ya `CANCELLED`.
- Qəbul zamanı maya dəyəri yazılır və təchizatçı fakturası ilə uyğunlaşdırılır.

### 40.3. Sayım (inventarizasiya)

- Tam və ya qismən sayım (zona, kateqoriya, mobil anbar üzrə).
- Sayım zamanı hərəkətlərin bloklanması opsionaldır.
- Fərqlər təsdiqləndikdən sonra düzəliş hərəkəti yaradılır.
- Mobil anbarlar (servis maşınları) üçün dövri sayım qrafiki.

### 40.4. Maya dəyəri

Sistem iki metodu dəstəkləyir:

| Metod | Açıqlama |
|---|---|
| Orta çəkili (Weighted Average) | Hər qəbuldan sonra orta maya dəyəri yenidən hesablanır |
| FIFO (First In, First Out) | Çıxış ən əvvəl qəbul olunmuş partiyanın maya dəyəri ilə aparılır |

Metodun təyini — daha konkret səviyyə üstündür:

1. Məhsul
2. Məhsul kateqoriyası
3. Anbar qrupu
4. Şirkət üzrə standart metod

Qaydalar:

- Şirkət səviyyəsində standart metod məcburidir; digər səviyyələr opsionaldır.
- Metod dəyişikliyi növbəti hesabat dövrünün əvvəlindən qüvvəyə minir və keçmiş hərəkətləri yenidən hesablamır.
- FIFO üçün qəbul partiyaları (qəbul tarixi, miqdar, maya dəyəri) saxlanılır.
- Metod dəyişiklikləri yalnız icazəsi olan istifadəçi tərəfindən edilir və audit log-a yazılır.
- Metod seçimi mühasiblə razılaşdırılır; sistem hər iki metodu eyni vaxtda fərqli səviyyələrdə tətbiq edə bilir.

---

# Hissə VI — Abunəliklər

## 41. Abunə modeli

Plan sistemi dinamikdir və tam admin tərəfindən idarə olunur. Müştəri, usta və korporativ planlar bir-birindən ayrı sistemlərdir.

### 41.1. Plan strukturları

| Plan qrupu | Planlar |
|---|---|
| Müştəri planları | Basic (pulsuz), Pro, Premium (§42) |
| Müstəqil usta planları | Basic, Pro, Premium (§43) |
| Korporativ planlar | Müqavilə əsasında konfiqurasiya olunan planlar (§44.3) |
| Xüsusi planlar | Gələcəkdə admin tərəfindən yaradılan yeni planlar |

`STAFF` ustalar plan sisteminə deyil, daxili lisenziya modelinə tabedir (§12.1).

### 41.2. Plan parametrləri

Hər plan üçün admin paneldən dəyişdirilir:

| Parametr | Açıqlama |
|---|---|
| Aylıq qiymət | Kommersiya qərarı ilə təyin olunur |
| İllik qiymət | Kommersiya qərarı ilə təyin olunur |
| Əlavə müddətlər | 3 və 6 aylıq müddətlər opsional olaraq aktivləşdirilə bilər |
| İstifadə limitləri | Aylıq sifariş sayı, cihaz sayı və s. |
| Ünvan sayı | Yadda saxlanılan ünvanların maksimum sayı |
| Birdəfəlik ünvan | Checkout və sifarişdə yadda saxlanılmayan ünvan icazəsi |
| Aktiv sifariş limiti | Eyni vaxtda açıq ola bilən sifarişlərin sayı |
| Prioritet səviyyəsi | Təyinat və növbədə üstünlük (0 — standart) |
| SLA | Reaksiya və gəliş müddətləri |
| Təcili servis | İcazə və müddət |
| Endirimlər | Məhsul və servis endirimi faizi |
| Əlavə funksiyalar | Plan imkanlarının siyahısı (entitlements) |
| Sınaq müddəti | Opsional |
| Görünürlük | Public, yalnız dəvətlə, arxiv |

Qiymət strukturunun nümunəsi (kommersiya qiyməti deyil — yalnız uzun müddətə endirim prinsipini göstərir):

| Müddət | Nümunə qiymət |
|---|---|
| 1 ay | 10 AZN |
| 3 ay | 27 AZN |
| 6 ay | 50 AZN |
| 12 ay | 90 AZN |

### 41.3. İmkanlar (entitlements)

- Hər imkanın kodu var (məsələn, `urgent_service`, `max_addresses`, `max_monthly_jobs`). Dəyəri bəli / xeyr, say limiti və ya faiz ola bilər.
- Frontend imkanları API-dən alır və plan adına görə qərar vermir.
- Planlar kumulyativdir: yuxarı plan aşağı planın bütün imkanlarını daxil edir.

```json
{
  "plan": "CUSTOMER_PREMIUM",
  "entitlements": {
    "urgent_service": true,
    "max_addresses": 10,
    "one_time_address": true,
    "max_active_orders": 10,
    "priority_level": 2,
    "service_discount_percent": 15
  }
}
```

### 41.4. Həyat dövrü

- Statuslar: `TRIAL`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`, `CANCELLED`, `EXPIRED`.
- Yenilənmə: kartla avtomatik və ya əllə uzatma.
- Yüksəltmə dərhal tətbiq olunur, qalan müddət nəzərə alınır.
- Endirmə cari dövrün sonunda tətbiq olunur.
- Ləğv edildikdə imkanlar cari dövrün sonuna qədər qalır.
- Ödəniş uğursuz olarsa güzəşt müddəti başlayır və bildirişlər göndərilir; sonra abunə `EXPIRED` olur.
- Abunə bitəndə plan imkanları dayanır, istifadəçinin məlumatları silinmir.

## 42. Müştəri planları

Cədvəldəki rəqəmlər tövsiyə olunan başlanğıc limitlərdir və admin paneldən dəyişdirilir (§41.2).

| İmkan | Basic (pulsuz) | Pro | Premium |
|---|---|---|---|
| Aylıq / illik qiymət | Pulsuz | Kommersiya qərarı | Kommersiya qərarı |
| Standart servis sifarişi | ✓ | ✓ | ✓ |
| Cihaz qeydiyyatı | 10 cihaza qədər | 25 cihaza qədər | 50 cihaza qədər |
| Sifariş və servis tarixçəsi | ✓ | ✓ | ✓ |
| Standart zəmanət | ✓ | ✓ | ✓ |
| Yadda saxlanılan ünvanlar | 1 | 1 | 10 |
| Birdəfəlik ünvan (checkout və sifarişdə) | — | ✓ | ✓ |
| Aktiv servis sifarişi limiti | 2 | 5 | 10 |
| Genişləndirilmiş sənəd arxivi (texniki və foto hesabatlar) | — | ✓ | ✓ |
| Periodik baxış xatırlatmaları | — | ✓ | ✓ |
| Məhsul endirimi | — | 5% | 10% |
| Servis endirimi | — | 10% | 15% |
| Uzadılmış iş zəmanəti | — | +3 ay | +6 ay |
| Prioritet səviyyəsi | 0 | 1 | 2 |
| Reaksiya SLA-sı (təsdiq və usta təyinatı, iş saatlarında) | 24 saat | 8 saat | 2 saat |
| Təcili servis (ustanın gəlişi, şəhər daxilində) | — | — | 4 saat |
| Xüsusi çağrı xətti | — | — | ✓ |
| İllik pulsuz texniki baxış | — | — | 1 baxış |
| Ailə üzvləri və onların cihazlarının idarəsi | — | — | 4 nəfərə qədər |

Qeydlər:

- **Təcili servis və bir neçə ünvan yalnız Premium müştərilər üçündür** (Əlavə D.1, qərar 11). Basic və Pro müştərilərə bu seçimlər "Premium ilə əlçatandır" nişanı ilə göstərilir.
- **Birdəfəlik ünvan:** Basic müştəri yalnız hesabındakı ünvandan istifadə edir və onu redaktə edə bilər. Pro və Premium müştəri checkout və ya servis sifarişində hesabda saxlanılmayan əlavə ünvan daxil edə bilər (Əlavə D.2, qərar 5).
- Korporativ müştərilərin ünvan limiti bu planlardan asılı deyil (§44.3).
- Qanunla tələb olunan sənədlər (fiskal çek, faktura, zəmanət sənədi, servis aktı) planından asılı olmayaraq bütün müştərilərə verilir.
- Ailə üzvləri: Premium müştəri hesabına ailə üzvlərini dəvət edə və ortaq cihazları birgə idarə edə bilər.

## 43. Usta planları

Müstəqil ustaların platformaya qeydiyyatı və aktiv istifadəsi fərdi ödənişli abunə ilə olur. Pulsuz plan yoxdur; sınaq müddəti konfiqurasiya oluna bilər. Hesablaşma modeli yalnız abunə əsaslıdır — platforma ustanın işlərindən faiz və ya komissiya tutmur (§51.3).

Rəqəmlər tövsiyə olunan başlanğıc limitlərdir və admin paneldən dəyişdirilir (§41.2).

| İmkan | Basic | Pro | Premium |
|---|---|---|---|
| Aylıq / illik qiymət | Kommersiya qərarı | Kommersiya qərarı | Kommersiya qərarı |
| Public profil | ✓ | ✓ | ✓ |
| Aylıq qəbul edilən sifariş limiti | 20 | 60 | Limitsiz |
| Aktiv iş limiti (eyni vaxtda) | 3 | 6 | 10 |
| İxtisas sayı | 2 | 5 | Limitsiz |
| Xidmət zonası sayı | 1 | 3 | Limitsiz |
| Prioritet səviyyəsi | 0 | 1 | 2 |
| Usta qiymətləri ilə alış | ✓ | ✓ | ✓ |
| Əsas statistika | ✓ | ✓ | ✓ |
| Geniş statistika və gəlir hesabatları | — | ✓ | ✓ |
| Xüsusi qiymətlər | — | ✓ | ✓ |
| Material rezervasiyası (eyni vaxtda aktiv rezerv) | — | 5 | 20 |
| Xidmət göstərdiyi müştərilərin tarixçəsi | — | ✓ | ✓ |
| Axtarışda üstünlük | — | — | ✓ |
| Geniş CRM (müştəri qeydləri, xatırlatmalar) | — | — | ✓ |
| Promote / reklam | — | — | ✓ |
| Xüsusi endirimlər və kampaniyalar | — | — | ✓ |

Qaydalar:

- Şirkət əməkdaşı olan ustalar bu planlara tabe deyil — daxili lisenziya modeli ilə işləyir (§12.1).
- Müstəqil ustanın abunəsi platforma səviyyəsindədir və əməkdaşlıq etdiyi bütün şirkətlər üçün keçərlidir. Limitlər bütün şirkətlər üzrə cəmi hesablanır (§56.2).
- Müştəri tarixçəsinə çıxış yalnız ustanın özünün xidmət göstərdiyi müştərilərə aiddir və fərdi məlumatlar qanunvericiliyinə uyğun məhdudlaşdırılır.
- Abunə bitəndə yeni sifariş təklifləri dayanır, aktiv işlər tamamlanır, public profil axtarışdan çıxarılır. Artıq tamamlanmış işlər üzrə hesablaşma davam edir.
- Promote olunan ustalar müştəriyə "Reklam" nişanı ilə göstərilir.

---

# Hissə VII — B2B: Partner, Topdan, Korporativ

## 44. B2B hesab modeli

### 44.1. Şirkət hesabı

- Şirkət məlumatları: hüquqi ad, VÖEN, hüquqi və faktiki ünvan, bank rekvizitləri.
- Seqment: Partner, Topdan və ya Korporativ.
- Müqavilə: nömrə, müddət, şərtlər, fayl.
- Təyin olunmuş satış əməkdaşı (account manager).
- Qiymət siyahısı və fərdi endirim şərtləri (§46).
- Ödəniş şərtləri: ön ödəniş və ya təxirə salınmış ödəniş (gün sayı müqavilə ilə təyin olunur).
- Ünvan limiti və korporativ plan (§44.3).
- Kredit limiti və cari borc.
- E-qaimə tələbi (§49).

### 44.2. Şirkət daxili istifadəçilər

| Rol | İmkanlar |
|---|---|
| Hesab sahibi | Bütün imkanlar, şirkət istifadəçilərinin idarəsi |
| Sifarişçi | Satış və servis sifarişi yaradır |
| Təsdiqləyici | Müəyyən məbləğdən yuxarı sifarişləri təsdiqləyir |
| Mühasib | Fakturalar, aktlar, ödənişlər, borc |
| Obyekt məsulu | Yalnız ona bağlı ünvanlar üzrə servis sifarişləri (Korporativ) |

### 44.3. Korporativ planlar və ünvan limiti

Korporativ müştərilərin ünvan limiti Basic, Pro və Premium planlarından asılı deyil. Limit aşağıdakılardan biri ilə müəyyən olunur (üstünlük sırası ilə):

1. Xüsusi kommersiya şərtləri
2. Müqavilə
3. Korporativ plan

Korporativ plan parametrləri (tövsiyə olunan başlanğıc dəyərlər, admin paneldən dəyişdirilir):

| Parametr | Başlanğıc dəyər |
|---|---|
| Aylıq / illik qiymət | Kommersiya qərarı və ya müqavilə |
| Ünvan (obyekt) sayı | 20 |
| Şirkət istifadəçiləri | 10 |
| Qeydiyyatlı cihaz sayı | 500 |
| Aktiv servis sifarişi limiti | 30 |
| Prioritet səviyyəsi | 2 |
| Reaksiya SLA-sı | 2 saat |
| Təcili servis (ustanın gəlişi) | 4 saat |
| Planlı servis | Müqavilə qrafikinə görə |

Limitə çatdıqda yeni ünvan əlavə etmək bloklanır və satış əməkdaşına limit artımı sorğusu göndərmək imkanı verilir.

## 45. B2B panelləri

### 45.1. Partner paneli — `/partner`

Partner modeli konfiqurasiya olunandır. Partnerin imkanları partner tipi və müqaviləsi ilə müəyyən edilir.

**Partner tipləri** admin tərəfindən yaradılır (məsələn: diler, quraşdırıcı şirkət, agent). Hər tip üçün imkanlar yandırılıb-söndürülür:

| İmkan | Açıqlama |
|---|---|
| Partner qiymətləri ilə alış | Kataloq və satış sifarişləri |
| Öz müştərisi adından servis sifarişi | Sifariş partner hesabı altında yaradılır; son müştərinin adı, telefonu və ünvanı sifarişdə saxlanılır |
| Son müştəriyə bildiriş | Son müştəriyə status bildirişlərinin göndərilməsi |
| Faktura alıcısı | Partner və ya son müştəri — müqavilə ayarı; sənədlər hər halda şirkətin adından verilir (§49) |
| Komissiya | Komissiyalı və ya komissiyasız iş (§45.4) |

Panel bölmələri:

- Dashboard: sifarişlər, borc, kredit limiti, komissiya balansı, kampaniyalar
- Kataloq partner qiymətləri ilə
- Satış sifarişləri və təkrar sifariş
- Öz müştəriləri üçün servis və quraşdırma sifarişləri
- Komissiyalar (aktivdirsə)
- Fakturalar, aktlar, ödənişlər, üzləşmə aktı
- Şirkət istifadəçiləri və profil

### 45.2. Topdan paneli — `/wholesale`

- Kataloq topdan qiymətləri və miqdar pillələri ilə
- Sürətli sifariş: SKU kodu ilə və ya Excel / CSV yükləməklə
- Kommersiya təklifi (quote) sorğusu və təklifin qəbulu
- Minimum sifariş miqdarı və məbləği
- Sifarişlər, çatdırılma, fakturalar, e-qaimə
- Borc və kredit limiti

### 45.3. Korporativ panel — `/corporate`

- Obyektlər və ünvanlar (limit §44.3)
- Cihaz parkı: obyektlər üzrə cihazlar, vəziyyət, zəmanət
- Servis müqaviləsi və SLA göstəriciləri
- Planlı (periodik) servis qrafiki
- Servis sifarişləri və şirkət daxili təsdiq axını
- Aktlar, fakturalar, e-qaimə
- Hesabatlar: obyekt, cihaz və xərc üzrə
- İstifadəçilər və obyekt məsulları

### 45.4. Partner komissiyası

Komissiya funksiyası partner tipi və ya konkret partner üçün ayrıca aktiv və deaktiv edilir.

| Komissiya modeli | Nümunə |
|---|---|
| Faizlə | Sifarişin məbləğinin 5%-i |
| Sabit məbləğ | Hər quraşdırma sifarişi üçün 20 AZN |
| Xidmət növünə görə | Kondisioner quraşdırma — 7%, kombi təmiri — 15 AZN |
| Müqaviləyə görə xüsusi | Konkret partner üçün fərdi dərəcələr və şərtlər |

Qaydalar:

- Qayda seçimi — daha konkret üstündür: müqavilə üzrə xüsusi qayda → xidmət növü qaydası → partner tipinin standart qaydası.
- Hesablama bazası konfiqurasiya olunur: ƏDV-siz məbləğ, yalnız iş haqqı və ya bütün sifariş.
- Komissiya sifariş `CLOSED` statusuna keçib ödəniş tam alındıqdan sonra hesablanır.
- Komissiya statusları: `PENDING`, `APPROVED`, `PAID`, `CANCELLED`.
- Sifariş ləğv edilərsə və ya geri ödəniş olarsa komissiya ləğv edilir və ya düzəldilir; artıq ödənilmişsə növbəti hesablaşmadan tutulur.
- Komissiya hesablaşması üzləşmə aktı ilə aparılır; partner panelində sifarişlər üzrə komissiya hesabatı göstərilir.
- Nümunədəki dərəcələr real deyil — kommersiya şərtləri ilə müəyyən olunur.

---

# Hissə VIII — Ödəniş, vergi və maliyyə

## 46. Qiymət sistemi

### 46.1. Qiymət siyahıları

Bir məhsulun bir neçə qiyməti ola bilər.

| Qiymət siyahısı | Kimə | Nümunə |
|---|---|---|
| `RETAIL` | Qonaq və fərdi müştəri | 10.00 AZN |
| `TECHNICIAN` | Ustalar | 8.00 AZN |
| `PARTNER` | Partnerlər | 7.50 AZN |
| `WHOLESALE` | Topdan alıcılar | 7.00 AZN |
| `CORPORATE` | Korporativ müştərilər | Müqaviləyə görə |

### 46.2. Yekun qiymətə təsir edən amillər

- qiymət siyahısı (seqment və ya rol)
- fərdi müqavilə qiyməti
- miqdar pilləsi və qablaşdırma qiyməti (§36.2)
- abunə endirimi (§42, §43)
- kampaniya və promo kod
- ƏDV (§49)

### 46.3. Endirimlərin birləşdirilməsi

Bütün sistem üzrə vahid sərt qayda yoxdur. Birləşmə qaydası hər endirim və kampaniya səviyyəsində admin tərəfindən təyin olunur. Abunə endirimləri də eyni atributlarla konfiqurasiya olunur.

| Atribut | Dəyərlər |
|---|---|
| Birləşmə rejimi | `STACKABLE` — digər endirimlərlə toplanır; `EXCLUSIVE` — heç bir endirimlə birləşmir; `COMBINABLE_WITH_LIST` — yalnız seçilmiş kampaniyalarla birlikdə tətbiq olunur |
| İcazə verilən kampaniyalar | `COMBINABLE_WITH_LIST` rejimi üçün siyahı |
| Prioritet | Tətbiq ardıcıllığı və ziddiyyət zamanı üstünlük (kiçik rəqəm — yüksək prioritet) |
| Tətbiq bazası | Başlanğıc qiymət və ya əvvəlki endirimdən sonrakı qiymət |
| Maksimum endirim həddi | Opsional; məhsul və ya səbət üzrə |

Hesablama məntiqi (backend):

1. Şərtlərə uyğun bütün endirimlər seçilir və prioritetə görə sıralanır.
2. Ən yüksək prioritetli `EXCLUSIVE` endirim varsa, yalnız o tətbiq olunur.
3. Əks halda endirimlər ardıcıllıqla tətbiq olunur; birləşmə rejiminə uyğun gəlməyənlər atlanır.
4. Maksimum endirim həddi varsa, yekun endirim onunla məhdudlaşdırılır.
5. Tətbiq olunan və atlanan endirimlər səbəbi ilə birlikdə cavabda qaytarılır (`appliedDiscounts`).

### 46.4. Frontend qaydası

Frontend qiyməti və endirimləri özü hesablamır. Belə etmək olmaz:

```ts
if (user.role === "technician") price = 8;
```

Bunun əvəzinə API hazır nəticə qaytarır:

```json
{
  "basePrice": { "amount": "10.00", "currency": "AZN" },
  "effectivePrice": { "amount": "8.00", "currency": "AZN" },
  "priceType": "TECHNICIAN",
  "appliedDiscounts": [],
  "vat": { "rate": "18.00", "included": true }
}
```

Frontend yalnız göstərir.

## 47. Ödəniş üsulları

| Üsul | Harada | Qeyd |
|---|---|---|
| Nağd | `STAFF` ustaya, kuryerə, filial kassasına — şirkət adına | Fiskal çek məcburidir (§49); nağd uçotu §50 |
| Kart — onlayn | Veb, mobil | Ödəniş provayderi vasitəsilə |
| Kart — POS terminal | Usta, kuryer, filial | Mobil və ya stasionar POS |
| Bank köçürməsi | Əsasən B2B | Hesab-faktura əsasında |
| Taksit | Onlayn və filialda | Taksit kartları və bank taksit məhsulları; şərtlər provayderdən gəlir |
| Balans / kredit limiti | B2B | Təxirə salınmış ödəniş (§44) |

Ödəniş formaları:

- tam ödəniş
- avans (quraşdırma və sifarişlə gətirilən məhsul üçün)
- qismən ödəniş
- bir sifariş üzrə bir neçə ödəniş (məsələn, avans kartla, qalıq nağd)

Hansı üsulun hansı hallarda əlçatan olduğu (məbləğ, seqment, xidmət növü üzrə) konfiqurasiya olunur.

**Müstəqil ustanın işi üzrə ödəniş:**

- Müştəri ödənişi şirkətə edir. Müstəqil usta ödənişi öz adına və ya öz hesabına qəbul etmir.
- Ünvanda ödəniş şirkətin onlayn ödəniş linki, şirkətin POS terminalı və ya şirkət adına fiskal çek vuran mobil kassa ilə aparılır.
- Müstəqil ustanın şirkət adına nağd qəbul etməsi şirkət ayarıdır (default: söndürülüb). Aktivdirsə, nağd §50 qaydaları ilə uçota alınır və hesablaşmada nəzərə alınır (§51.3).

## 48. Ödəniş axını və statuslar

```
Web / Mobile
      ↓
Backend API
      ↓
Payment Provider Adapter
      ↓
Bank / ödəniş provayderləri
```

- Frontend birbaşa banka və ya provayderə qoşulmur.
- Adapter vendor-neutral qurulur: provayder dəyişəndə yalnız adapter dəyişir (Əlavə E).
- Kart məlumatları platformada saxlanılmır — provayderin ödəniş səhifəsi və ya tokenizasiya istifadə olunur.
- Ödənişdən qayıdanda nəticə səhifəsi statusu API-dən yoxlayır, URL parametrinə etibar etmir.

| Status | Açıqlama |
|---|---|
| `INITIATED` | Ödəniş yaradılıb |
| `PENDING` | Provayderin cavabı gözlənilir |
| `PAID` | Uğurla ödənilib |
| `PARTIALLY_PAID` | Sifariş üzrə qismən ödənilib |
| `FAILED` | Uğursuz |
| `CANCELLED` | Ləğv edilib |
| `REFUNDED` | Tam geri qaytarılıb |
| `PARTIALLY_REFUNDED` | Qismən geri qaytarılıb |

Frontend bu statusları yalnız göstərir. Status dəyişikliyi backend-də provayder bildirişləri (webhook) ilə baş verir.

## 49. Vergi, fiskal çek və faktura

Konkret hüquqi tələblər mühasib və hüquqşünas tərəfindən təsdiqlənəcək. Bu bölmə sistemin həmin tələblərə hazır olmasını tələb edir.

### 49.1. ƏDV

- ƏDV dərəcəsi və ƏDV-dən azad məhsul və xidmət kateqoriyaları konfiqurasiya olunur.
- B2C: qiymətlər ƏDV daxil göstərilir.
- B2B: qiymət ƏDV-siz, ƏDV məbləği ayrıca göstərilə bilər.
- Smeta, faktura və çek sətirlər üzrə və yekun ƏDV məbləğini göstərir.

### 49.2. Sənədlər

| Sənəd | Nə vaxt yaradılır |
|---|---|
| Fiskal çek | Hər nağd və kart ödənişində; geri ödənişdə qaytarma çeki |
| Hesab-faktura | Ödənişdən əvvəl, əsasən B2B |
| Elektron qaimə-faktura (e-qaimə) | B2B satış və xidmətlərdə |
| Servis / təhvil-təslim aktı | Servis və quraşdırma tamamlandıqda |
| Zəmanət sənədi | §23 |
| Üzləşmə aktı | B2B hesablaşmalarında |

### 49.3. Qaydalar

- Sənəd nömrələri ardıcıl, seriyalı və dəyişdirilməzdir.
- Verilmiş sənəd silinmir — ləğv və ya düzəliş sənədi ilə düzəldilir.
- Bütün rəsmi maliyyə və hüquqi sənədlər (fiskal çek, hesab-faktura, xidmət aktı, ƏDV sənədləri və digər tələb olunan sənədlər) platformanı idarə edən şirkətin — tenantın — adından və rekvizitləri ilə verilir (§56).
- Bu qayda işi müstəqil usta görəndə də tətbiq olunur. Müstəqil usta müştəriyə öz adından sənəd vermir.
- Fiskal çek kassa inteqrasiyası vasitəsilə vurulur; çekin fiskal nömrəsi və yoxlama linki sifarişdə saxlanılır.

Frontend Phase 1: sənəd önizləmə şablonları, sənəd siyahıları və statusları mock data ilə.

## 50. Nağd pul və kassa

- **Kassalar:** filial kassası; `STAFF` usta, kuryer və (icazə verilibsə) müstəqil ustanın şirkət adına qəbul etdiyi nağd balansı.
- **Nağd qəbulu:** usta nağd aldıqda sifariş, məbləğ və fiskal çek qeyd olunur; məbləğ ustanın nağd balansına yazılır.
- **Təhvil:** usta nağdı filial kassasına təhvil verir, kassir təsdiqləyir.
- **Uyğunsuzluq:** fərq aktı yaradılır, menecer təsdiqləyir.
- **Limit:** ustanın üzərində saxlaya biləcəyi maksimum nağd məbləğ; aşıldıqda xəbərdarlıq.
- **Kassa növbəsi:** açılış, bağlanış, gün sonu hesabatı.

## 51. Maliyyə modulu və hesablaşmalar

### 51.1. Maliyyə modulu

Əhatə:

- gəlirlər və xərclər
- alışlar və satışlar
- servis və abunə gəlirləri
- usta hesablaşmaları
- geri ödənişlər
- debitor borclar (B2B) və təchizatçı borcları
- kassalar və bank hesabları
- ƏDV hesabatı

Qeydlər:

- Phase 1-də maliyyə dashboard-u və hesabat ekranları mock data ilə hazırlanır. Tam mühasibat uçotu (ERP) sonrakı mərhələdir.
- İlkin mərhələdə konkret mühasibat proqramı ilə inteqrasiya edilmir. Arxitektura ayrıca inteqrasiya qatı ilə qurulur ki, sonradan seçiləcək proqram əsas biznes məntiqini dəyişmədən qoşulsun (Əlavə E.3).

### 51.2. STAFF usta hesablaşması

| Mövzu | Qayda |
|---|---|
| Gəlirin əsası | Əmək haqqı və iş üzrə bonus; bonus qaydaları konfiqurasiya olunur |
| Earnings səhifəsi | İş sayı, bonuslar, nağd balans |
| Ödəniş | Əmək haqqı sistemi ilə (platformadan kənar) |

### 51.3. Müstəqil usta hesablaşması

Model yalnız abunə əsaslıdır: platforma ustanın işindən faiz və ya komissiya tutmur. Müştəri ödənişi şirkətə daxil olur, ustaya çatacaq məbləğ daxili hesablaşma ilə ödənilir.

**Ustaya çatacaq məbləğ** (sifariş üzrə):

- smetadakı iş və xidmət sətirləri (ustanın icra etdiyi)
- ustanın öz materialı ilə bağlı sətirlər (§22)

**Tutulmalar:**

- usta şirkət adına nağd qəbul edibsə, həmin məbləğ (§47)
- ustanın şirkətdən nisyə götürdüyü material
- qanunvericiliyə uyğun vergi tutulmaları (mühasiblə müəyyən olunur)
- sonradan geri ödəniş olunmuş sifarişlər üzrə düzəlişlər

Şirkətin sifarişdən gəliri — şirkət materialının satışı və logistika kimi — ustanın məbləğinə daxil deyil.

**Proses:**

1. Sifariş `CLOSED` statusuna keçir və müştəri ödənişi tam alınır.
2. Sifariş üzrə hesablaşma sətri yaradılır (`PENDING`).
3. Mühasib dövr üzrə hesablaşmanı yoxlayır və təsdiqləyir (`APPROVED`).
4. Ödəniş edilir (`PAID`); hesablaşma aktı yaradılır.
5. Mübahisə və ya zəmanət iddiası varsa sətir saxlanıla bilər (`ON_HOLD`).

- Hesablaşma dövrü (həftəlik, iki həftəlik, aylıq) şirkət ayarıdır.
- Bir neçə şirkətlə işləyən usta hər şirkətlə ayrıca hesablaşır (§56.2).
- Usta panelində (`/technician/earnings`) sifarişlər üzrə hesablanmış, təsdiqlənmiş, ödənilmiş məbləğlər və tutulmalar göstərilir.

---

# Hissə IX — Müştəri modulları

## 52. Müştəri kabineti

Bölmələr:

- Dashboard
- Profil
- Ünvanlar
- Mənim cihazlarım
- Servis sifarişləri
- Satış sifarişləri
- Qaytarmalar
- Abunəlik
- Ödənişlər
- Zəmanətlər
- Sənədlər
- Favoritlər
- Bildirişlər
- Rəylər
- Ailə üzvləri (Premium)
- Təhlükəsizlik

Dashboard-da göstərilir: aktiv sifarişlər və cari mərhələ, təsdiq gözləyən smetalar, yaxınlaşan servislər və xatırlatmalar, zəmanəti bitən cihazlar, abunə statusu.

Müştəri məlumatları (minimum): ad, soyad, telefon, e-poçt, dil, ünvanlar, cihazlar, sifariş və servis tarixçəsi, abunəlik, zəmanətlər, bildiriş seçimləri, fərdi məlumatların emalına razılıq.

## 53. Mənim cihazlarım

```
Ev
 ├── LG DualCool 18000 BTU
 ├── Bosch Condens 7000
 └── Pool Pump XYZ
```

Cihazlar ünvan (obyekt) üzrə qruplaşdırılır.

Cihaz kartı:

- kateqoriya, marka, model (§27)
- serial nömrə
- alış və quraşdırma tarixi
- ünvan
- zəmanət(lər)
- servis tarixçəsi və növbəti periodik servis tarixi
- şəkillər, sənədlər, QR etiket

İmkanlar:

- Platformada alınıb quraşdırılan cihaz avtomatik əlavə olunur.
- Əllə əlavə: model axtarışı, serial nömrə, sənəd yükləmə.
- Cihaz kartından birbaşa servis sifarişi və zəmanət iddiası yaratmaq.
- "Uyğun ehtiyat hissələri" keçidi.
- Periodik servis xatırlatmaları (Pro və Premium).

## 54. Servis tarixçəsi

```
LG DualCool

12.05.2026   Filtr təmizləndi
18.07.2026   Qaz dolduruldu — 0.8 kq
04.09.2026   Kompressor dəyişdirildi
```

Hər qeyddə: sifariş, usta, görülən işlər, istifadə olunan materiallar, sənədlər, fotolar, zəmanət.

## 55. Rəy sistemi

| Rəy obyekti | Nə vaxt | Meyarlar |
|---|---|---|
| Servis və usta | İş tamamlandıqdan sonra | Ümumi qiymət (1–5 ulduz), xidmət keyfiyyəti, vaxtında gəlmə, davranış, şərh, şəkil |
| Məhsul | Yalnız təsdiqlənmiş alışdan sonra | Ulduz, üstünlüklər və çatışmazlıqlar, şərh, şəkil |

Qaydalar:

- Rəylər moderasiyadan keçir (avtomatik filtr və əl ilə yoxlama).
- Usta və şirkət rəyə cavab yaza bilər.
- İstifadəçilər rəy barədə şikayət göndərə bilər.
- Reytinq backend-də hesablanır.
- Aşağı reytinqli rəy haqqında menecerə bildiriş göndərilir.

---

# Hissə X — Platforma

## 56. Multi-tenant hazırlığı

İlkin mərhələdə platforma bir şirkət üçün işləyir, amma gələcəkdə başqa servis şirkətləri də qoşula biləcək.

### 56.1. Tenant modeli

- **Tenant** (təşkilat) platformadan istifadə edən servis şirkətidir.
- Bütün biznes obyektləri tenant-a bağlıdır: filiallar, anbarlar, kataloq, qiymətlər, workflow şablonları, abunə planları, sənəd rekvizitləri.
- API müqaviləsində tenant konteksti sessiyadan gəlir. Phase 1 interfeysində tenant seçimi göstərilmir.
- Platforma səviyyəsində idarəetmə (tenantların qoşulması, lisenziyalar) sonrakı mərhələdir.

### 56.2. Kommersiya məlumatlarının izolyasiyası və müstəqil ustalar

Kataloq tenantlar arasında avtomatik paylaşılmır. Hər şirkət ayrıca idarə edir:

- xidmət kataloqunu
- məhsulları və qiymətləri
- anbarı və materialları
- kampaniyaları
- digər kommersiya məlumatlarını

Müstəqil usta eyni platformada bir neçə şirkətlə işləyə bilər:

| Səviyyə | Nə saxlanılır |
|---|---|
| Platforma | Ustanın profili, sənədləri və yoxlaması, ixtisasları, abunəsi (§43), vahid təqvimi (§16), ümumi reytinqi |
| Şirkətlə əməkdaşlıq | Şirkətin təsdiqi və əməkdaşlıq statusu, şirkətin xidmət zonaları, şirkətin qiymət siyahısı, işlər, hesablaşmalar (§51.3), şirkətin daxili qeydləri |

- Əməkdaşlıq ustanın müraciəti və ya şirkətin dəvəti ilə başlayır; şirkət təsdiqləyir.
- Usta panelində bütün şirkətlərin işləri bir yerdə, şirkət nişanı ilə göstərilir.
- Usta bir şirkətin işində yalnız həmin şirkətin kataloqunu, qiymətlərini və materiallarını görür.
- Şirkət ustanın digər şirkətlərdəki işlərini, müştərilərini və qazancını görmür — yalnız təqvimdə məşğul vaxtı görür.

### 56.3. Brend konfiqurasiyası

Yekun brend adı və domen hələ müəyyən edilməyib. Demo və inkişaf mərhələsində işçi ad kimi `besqardasServis.az` istifadə olunur; domen alınmayıb. Loqo, rəng palitrası və vizual kimlik servis platformasına uyğun hazırlanacaq.

Brend sistemi dəyişdirilə bilən şəkildə qurulur. Tenant ayarı kimi konfiqurasiya olunur:

| Element | Harada istifadə olunur |
|---|---|
| Loqo və favicon | Sayt, panellər, sənədlər |
| Əsas, aksent və ikinci dərəcəli rənglər | Design system tokenləri (§68) |
| Şirkət adı | UI, SEO, bildirişlər |
| Domen | Sayt və admin panel ünvanları |
| Əlaqə məlumatları | Footer, əlaqə səhifəsi, sənədlər |
| E-poçt şablonlarında brend | Bildirişlər (§58) |
| Faktura və sənəd brendi | PDF sənədlər (§49) |
| Mobil / PWA elementləri | Tətbiq ikonu, splash, manifest |

Kodda brend adı, rəng və ya domen sabit yazılmır.

## 57. Filiallar və şəhərlər

- Filial: ad, şəhər, ünvan, xəritədə yer, iş saatları, əlaqə, anbarlar, servis mərkəzi, xidmət zonaları, menecer.
- Daxili əməkdaşlar və `STAFF` ustalar filiala bağlıdır; məlumatların görünürlüyü `BRANCH` əhatəsi ilə məhdudlaşır (§8).
- Servis sifarişi ünvana görə avtomatik müvafiq filiala yönləndirilir.
- Hesabatlar filiallar üzrə və konsolidə formada hazırlanır.

## 58. Bildiriş sistemi

Kanallar: in-app, push, e-poçt, SMS, WhatsApp.

### 58.1. Əsas hadisələr

| Hadisə | Alıcı | Default kanal |
|---|---|---|
| Sifariş yaradıldı / təsdiqləndi | Müştəri | In-app, SMS |
| Usta təyin olundu / yola çıxdı | Müştəri | Push, SMS |
| Smeta hazırdır | Müştəri | Push, SMS, WhatsApp |
| Cihaz hazırdır | Müştəri | SMS |
| Yeni iş təklifi | Usta | Push |
| Yeni logistika tapşırığı | Kuryer | SMS, in-app |
| Hesablaşma təsdiqləndi / ödənildi | Müstəqil usta | In-app, e-poçt |
| Mərhələnin SLA-sı aşıldı | Dispetçer, menecer | In-app |
| Ödəniş uğurlu / uğursuz | Müştəri | In-app, e-poçt |
| Aşağı stok | Anbar əməkdaşı | In-app |
| Rezervin müddəti bitir | Usta, anbar əməkdaşı | In-app |
| Abunənin müddəti bitir | Müştəri, usta | E-poçt, push |
| Zəmanət bitir / periodik servis vaxtıdır | Müştəri | E-poçt, push |
| Sənədin müddəti bitir | Usta, admin | E-poçt |

### 58.2. Qaydalar

- Şablonlar AZ / RU / EN dillərindədir; bildiriş istifadəçinin dilində göndərilir.
- İstifadəçi kanal seçimlərini idarə edir; məcburi tranzaksiya bildirişləri istisnadır.
- Marketinq bildirişləri yalnız istifadəçinin razılığı ilə göndərilir.
- Sakit saatlar tətbiq olunur; təcili hallar istisnadır.
- Phase 1: Notification Center, bildiriş seçimləri ekranı və admin şablon redaktoru UI-ı.

## 59. Xəritə və məkan

- **Ünvan seçimi:** axtarış və xəritədə pin; bina, mənzil, mərtəbə, giriş kimi dəqiqləşdirmələr.
- **Xidmət zonaları:** poliqon kimi təyin olunur (admin və müstəqil usta).
- **Dispetçer xəritəsi:** sifarişlər, ustalar, filiallar.
- **Filial, anbar və çatdırılma zonaları** xəritədə.
- **Ustanın real vaxt yeri** (`ON_THE_WAY` zamanı) sonrakı mərhələdir.

Phase 1-də xəritə komponenti mock data ilə hazırlanır. Xəritə provayderi adapter vasitəsilə qoşulur və dəyişdirilə bilər (Əlavə E).

---

# Hissə XI — Frontend tələbləri (Phase 1)

## 60. `apps/web` səhifələri

Bütün URL-lər dil prefiksi ilə başlayır (§62): `/az/...`, `/ru/...`, `/en/...`. Aşağıda prefikssiz göstərilir.

### 60.1. Public

| Route | Səhifə |
|---|---|
| `/` | Ana səhifə |
| `/services` | Xidmətlər |
| `/services/[slug]` | Xidmət detalı |
| `/services/[slug]/book` | Servis sifarişi axını |
| `/shop` | Kataloq |
| `/shop/[...category]` | Kateqoriya (çoxsəviyyəli) |
| `/product/[slug]` | Məhsul |
| `/search` | Axtarış nəticələri |
| `/compare` | Müqayisə |
| `/cart` | Səbət |
| `/checkout` | Checkout |
| `/checkout/result` | Ödəniş nəticəsi |
| `/technicians` | Ustalar |
| `/technicians/[id]` | Ustanın public profili |
| `/pricing` | Abunə planları |
| `/warranty/verify/[code]` | QR ilə zəmanət yoxlaması |
| `/become-technician` | Usta kimi qoşulma |
| `/business` | B2B müraciəti |
| `/branches` | Filiallar |
| `/about`, `/contact`, `/faq` | Korporativ səhifələr |
| `/terms`, `/privacy` | Hüquqi səhifələr |

Ustanın public profili `/technicians/[id]` ünvanındadır ki, şəxsi usta panelinin `/technician/...` route-ları ilə qarışmasın.

### 60.2. Auth

| Route | Səhifə |
|---|---|
| `/login` | Giriş |
| `/register` | Qeydiyyat |
| `/forgot-password` | Şifrəni unutdum |
| `/reset-password` | Şifrənin yenilənməsi |
| `/verify` | OTP, e-poçt və telefon təsdiqi |
| `/2fa` | İki faktorlu autentifikasiya |
| `/select-mode` | Bir neçə rolu olan istifadəçi üçün rejim seçimi |

### 60.3. Müştəri kabineti

| Route | Səhifə |
|---|---|
| `/account` | Dashboard |
| `/account/profile` | Profil |
| `/account/addresses` | Ünvanlar |
| `/account/devices`, `/account/devices/[id]` | Cihazlar və cihaz kartı |
| `/account/services`, `/account/services/[id]` | Servis sifarişləri və detal |
| `/account/orders`, `/account/orders/[id]` | Satış sifarişləri və detal |
| `/account/returns` | Qaytarmalar |
| `/account/subscription` | Abunəlik |
| `/account/payments` | Ödənişlər |
| `/account/warranties` | Zəmanətlər |
| `/account/documents` | Sənədlər |
| `/account/favorites` | Favoritlər |
| `/account/notifications` | Bildirişlər |
| `/account/reviews` | Rəylər |
| `/account/family` | Ailə üzvləri (Premium) |
| `/account/security` | Təhlükəsizlik |

### 60.4. Usta paneli

| Route | Səhifə |
|---|---|
| `/technician/dashboard` | Dashboard |
| `/technician/jobs` | İşlər: "Yeni təkliflər" və "Mənim işlərim" tabları |
| `/technician/jobs/[id]` | İş detalı: mərhələlər, diaqnostika, smeta, material, təhvil |
| `/technician/schedule` | Cədvəl |
| `/technician/specializations` | İxtisaslar |
| `/technician/inventory` | Mobil anbar |
| `/technician/reservations` | Rezerv olunmuş materiallar |
| `/technician/customers` | Müştərilər |
| `/technician/earnings` | Qazanc və nağd balans |
| `/technician/subscription` | Abunəlik (`INDEPENDENT`) |
| `/technician/reviews` | Rəylər |
| `/technician/documents` | Sənədlər və yoxlama statusu |
| `/technician/statistics` | Statistika |
| `/technician/settings` | Ayarlar: profil, iş saatları, xidmət zonası |

### 60.5. B2B panelləri

| Panel | Route-lar |
|---|---|
| Korporativ | `/corporate`, `/corporate/sites`, `/corporate/devices`, `/corporate/services`, `/corporate/schedule`, `/corporate/contracts`, `/corporate/documents`, `/corporate/reports`, `/corporate/users` |
| Partner | `/partner`, `/partner/catalog`, `/partner/orders`, `/partner/services`, `/partner/commissions`, `/partner/documents`, `/partner/balance`, `/partner/users` |
| Topdan | `/wholesale`, `/wholesale/catalog`, `/wholesale/quick-order`, `/wholesale/quotes`, `/wholesale/orders`, `/wholesale/documents`, `/wholesale/balance`, `/wholesale/users` |

### 60.6. Kuryer interfeysi

Sadə, mobil üçün optimallaşdırılmış interfeys (§21.6):

| Route | Səhifə |
|---|---|
| `/courier` | Bugünkü və növbəti tapşırıqlar |
| `/courier/tasks/[id]` | Tapşırıq: ünvan, əlaqə, yük, status yeniləmə, foto və imza |

### 60.7. Sistem səhifələri

404, 500, texniki işlər səhifəsi, icazə yoxdur (403).

## 61. `apps/admin` səhifələri

Admin panel ayrıca tətbiqdir və ayrıca domendə yerləşir (məsələn, `admin.<domen>`). Buna görə route-larda `/admin` prefiksi yoxdur.

| Qrup | Route-lar |
|---|---|
| Ümumi | `/` (dashboard), `/notifications`, `/profile` |
| Servis əməliyyatları | `/service-orders`, `/service-orders/[id]`, `/dispatch`, `/schedule`, `/estimates`, `/logistics`, `/warranty-claims` |
| Servis konfiqurasiyası | `/services`, `/workflow-templates`, `/fee-rules`, `/reason-codes` |
| İstifadəçilər | `/customers`, `/technicians`, `/technicians/verification`, `/technicians/licenses`, `/technicians/partnerships`, `/couriers`, `/employees`, `/b2b-accounts`, `/partner-types`, `/users`, `/roles` |
| Kataloq | `/products`, `/categories`, `/brands`, `/models`, `/attributes`, `/compatibility`, `/units` |
| Satış | `/sales-orders`, `/returns`, `/quotes`, `/price-lists`, `/promotions` |
| Anbar | `/inventory`, `/warehouses`, `/stock-movements`, `/reservations`, `/transfers`, `/stock-counts`, `/purchases`, `/suppliers` |
| Abunəlik | `/subscription-plans`, `/subscriptions` |
| Maliyyə | `/payments`, `/invoices`, `/fiscal-receipts`, `/cash-desks`, `/technician-settlements`, `/partner-commissions`, `/finance`, `/costing-methods`, `/tax-settings` |
| Kommunikasiya | `/notification-templates`, `/reviews` |
| Sayt məzmunu | `/content/pages`, `/content/faq`, `/content/banners` |
| Təşkilat | `/branches`, `/warehouse-groups`, `/service-zones`, `/settings`, `/settings/branding`, `/integrations`, `/audit-logs` |
| Hesabatlar | `/reports`, `/kpi-targets` |

Dashboard widget-ləri istifadəçinin roluna görə göstərilir:

- günlük sifarişlər və aktiv servislər
- təyin olunmamış sifarişlər və SLA pozuntuları
- ustaların iş yükü
- satış və gəlir
- aşağı stok
- yeni müştərilər və abunəliklər
- B2B borcları
- kassalarda və ustalarda nağd

## 62. Lokalizasiya

- **Dillər:** Azərbaycan (default), Rus, İngilis. Admin panel də üç dildədir.
- **URL:** `/az`, `/ru`, `/en` prefiksləri. `/` ünvanı istifadəçinin seçdiyi və ya brauzerin dilinə yönləndirir.
- **Tərcümə olunanlar:**
  - UI mətnləri və xəta mesajları
  - kataloq: məhsul adları, təsvirlər, atributlar və dəyərləri
  - servis, kateqoriya və workflow mərhələ adları
  - bildiriş, e-poçt və sənəd şablonları
  - SEO metadata
- **Fallback:** tərcümə yoxdursa AZ versiyası göstərilir.
- **Formatlar:** pul (AZN), tarix (`dd.MM.yyyy`), 24 saatlıq vaxt, ədədlər — dilə uyğun `Intl` formatları ilə. Saat qurşağı: Asia/Baku.
- **Telefon:** +994 formatında maskalı input.
- İstifadəçinin dil seçimi profildə saxlanılır və bildirişlərdə istifadə olunur.
- UI mətnləri kodda sabit yazılmır — tərcümə açarları ilə istifadə olunur.

## 63. Responsive dizayn

Ayrıca mobil tətbiq olsa da, mobil veb diqqətdən kənarda qalmamalıdır. Dizayn mobile-first yanaşma ilə qurulur.

| Breakpoint | Aralıq (px) |
|---|---|
| Mobile | 320–767 |
| Tablet | 768–1023 |
| Desktop | 1024–1439 |
| Large Desktop | 1440+ |

- Usta paneli sahədə telefonla istifadə üçün optimallaşdırılır: böyük toxunma sahələri, bir əllə idarə, kamera ilə foto, zəif internet halları.
- Admin panel əsasən desktop üçündür; anbar və dispetçer ekranları planşeti də dəstəkləyir.

## 64. Frontend-in əsas prinsipi

> Frontend backend-dən asılı olmadan yazılır, amma backend müqaviləsinə (§65) uyğun hazırlanır.

Frontend biznes hesablaması aparmır, yalnız göstərir:

| Sahə | Backend hesablayır | Frontend göstərir |
|---|---|---|
| Qiymət | Effektiv qiymət, endirimlərin birləşdirilməsi, ƏDV | §46.4-dəki cavab |
| Hesablaşma | Ustaya çatacaq məbləğ, partner komissiyası | Hesablaşma sətirləri |
| Stok | Qalıqlar və vahid çevirmələri | `Stock: 37.5 kg` |
| Abunə | Plan imkanları | `entitlements` |
| Workflow | Mümkün status keçidləri | `availableActions` |
| İcazələr | İstifadəçinin icazələri | Düymə və bölmələrin görünməsi |
| Haqlar | Tətbiq olunan haqlar | Smeta sətirləri |
| Vaxt slotları | Boş vaxtlar | Slot seçimi |

Frontend validasiyası yalnız istifadəçi təcrübəsi üçündür; yekun yoxlama backend-dədir.

## 65. API müqaviləsi və mock API

### 65.1. Contract-first

- API müqaviləsi ekranlar yazılmazdan əvvəl hazırlanır: OpenAPI və ya paylaşılan Zod sxemləri (`packages/schemas`).
- Tiplər, API client və mock handler-lər müqaviləyə uyğun qurulur.
- Backend mərhələsində həmin müqavilə implementasiya olunur.

### 65.2. Konvensiyalar

| Mövzu | Qayda |
|---|---|
| Format | JSON, `camelCase` |
| Tarix və vaxt | ISO 8601, UTC; istifadəçiyə Asia/Baku saat qurşağında göstərilir |
| Pul | `{ "amount": "195.00", "currency": "AZN" }` — decimal string, float istifadə olunmur |
| Miqdar | `{ "value": "3.50", "unit": "m" }` |
| ID | UUID; insan oxuya bilən nömrələr ayrıca sahədir (`SV-1052`) |
| Siyahılar | Pagination, sort və filter parametrləri vahid formatda |
| Xətalar | Vahid format: `code`, lokallaşdırılmış `message`, `fieldErrors` |
| Dil | `Accept-Language` başlığı |
| Mümkün əməliyyatlar | Resurs cavabında `availableActions` |
| Təkrar sorğu | Ödəniş və sifariş yaradılmasında idempotency açarı |

### 65.3. Mock API

- Dummy JSON faylları birbaşa import edilmir. Bütün data MSW (Mock Service Worker) vasitəsilə API sorğuları ilə gəlir.
- Nümunə endpoint-lər: `GET /api/products`, `GET /api/services`, `GET /api/service-orders`, `GET /api/technicians`, `GET /api/search`.
- Mock data realist və bir-biri ilə əlaqəlidir (sifarişdəki usta, cihaz və material uyğun gəlir) və üç dildədir.
- Mock layer gecikmə, xəta (4xx / 5xx) və boş halları simulyasiya edə bilir.
- Workflow, smeta təsdiqi, rezervasiya və ödəniş statusları mock tərəfdə state machine ilə simulyasiya olunur.
- Real API gələndə frontend kodu dəyişmir — yalnız mock layer söndürülür.

### 65.4. Texniki risk

Public səhifələr SSR tələb edir (§72). MSW brauzerdə rahat işləyir, amma Next.js-in server tərəfində mock etmək məhdud ola bilər. Bu, Foundation mərhələsində yoxlanılır; lazım olarsa eyni handler-lərlə işləyən ayrıca mock server istifadə olunur.

## 66. Frontend texnologiya steki

| Sahə | Seçim |
|---|---|
| Framework | Next.js (App Router), React, TypeScript |
| UI | Tailwind CSS, shadcn/ui (Radix UI əsasında), Lucide Icons |
| Formlar | React Hook Form, Zod |
| Server state | TanStack Query |
| Client state | Zustand |
| Cədvəllər | TanStack Table |
| Lokalizasiya | next-intl |
| Mock API | MSW |
| Qrafiklər | Recharts və ya ekvivalent |
| Tarix | date-fns |
| Drag & drop | dnd-kit |
| Komponent kataloqu | Storybook |
| Testlər | Vitest, Testing Library, Playwright |
| Monorepo | Turborepo, pnpm workspaces |
| Kod keyfiyyəti | ESLint, Prettier, TypeScript strict rejimi |
| CI | GitHub Actions |

- Versiyalar Foundation mərhələsində sabitlənir.
- Xəritə komponenti provayderdən asılı olmayan interfeys (adapter) üzərində qurulur; Phase 1-də tövsiyə olunan provayderlərdən biri istifadə olunur (Əlavə E).

## 67. Monorepo strukturu

```
service-platform/
├── apps/
│   ├── web/          # Public sayt, müştəri, usta və B2B panelləri
│   ├── admin/        # CRM / ERP paneli
│   ├── api/          # Backend (sonrakı mərhələ)
│   ├── mobile/       # iOS / Android (sonrakı mərhələ)
│   └── desktop/      # Windows (yalnız ehtiyac yaranarsa)
├── packages/
│   ├── ui/           # Design system komponentləri
│   ├── schemas/      # Zod sxemləri və API müqaviləsi
│   ├── types/        # Sxemlərdən törəyən paylaşılan tiplər
│   ├── api-client/   # API client və TanStack Query hook-ları
│   ├── mocks/        # MSW handler-ləri və mock data
│   ├── i18n/         # Tərcümələr və format utilitləri
│   ├── config/       # ESLint, TypeScript, Tailwind konfiqurasiyaları
│   └── utils/        # Ümumi köməkçi funksiyalar
└── docs/
```

Phase 1-də aktiv hazırlanır: `apps/web`, `apps/admin`, `packages/*`.

## 68. Design system

Frontend başlamazdan əvvəl design token sistemi qurulur: rənglər, tipoqrafiya, spacing, radius, kölgə, breakpoint-lər, z-index, animasiyalar.

- Brend tokenləri (loqo, əsas, aksent və ikinci dərəcəli rənglər) tenant ayarlarından gələ biləcək şəkildə qurulur (§56.3). Demo mərhələsində `besqardasServis.az` işçi brendi üçün müvəqqəti tokenlər istifadə olunur.
- Tokenlər qaranlıq temaya hazır qurulur.
- Şrift Azərbaycan və kirill hərflərini tam dəstəkləməlidir.

| Qrup | Komponentlər |
|---|---|
| Form | Button, Input, Textarea, Select, MultiSelect, Combobox, Checkbox, Radio, Switch, DatePicker, TimePicker, PhoneInput, QuantityInput (vahid seçimi ilə) |
| Overlay | Modal, Drawer, Sheet, Popover, Tooltip, DropdownMenu, CommandPalette (global axtarış) |
| Naviqasiya | Tabs, Breadcrumb, Pagination, Stepper, Sidebar |
| Göstərmə | Badge, StatusBadge, Avatar, Card, Timeline, Rating, PriceTag, StockIndicator, Skeleton, EmptyState, ErrorState, Alert, Toast |
| Data | DataTable, Chart, KPI kartı |
| Media | Uploader, Gallery, ImageCropper, VideoPreview |
| Domen | ProductCard, ServiceCard, TechnicianCard, DeviceCard, EstimateTable, WorkflowTimeline, SlotPicker, AddressPicker, DocumentPreview, PlanComparison |

Bütün komponentlər Storybook-da sənədləşdirilir.

## 69. DataTable

Admin sisteminin əsas komponentidir. Dəstəkləməlidir:

- filter, sort, pagination
- sütunların görünürlüyü və sırası
- export (CSV / XLSX; böyük həcmdə backend tərəfindən)
- bulk seçim və bulk əməliyyatlar (icazəyə görə)
- saxlanılmış filtrlər
- server-side data rejimi
- sətir detalına keçid
- sabit başlıq və sıxlıq seçimi
- planşet üçün uyğun görünüş

## 70. Frontend təhlükəsizliyi

Frontend heç vaxt səlahiyyət sisteminin əsas qoruma qatı deyil. Bütün icazələr backend-də yenidən yoxlanılır.

- **UI icazələri:** `CanView`, `CanCreate`, `CanEdit`, `CanDelete`, `CanApprove` kimi yoxlamalar `resurs:əməliyyat` formatında icazələr (§8) və `availableActions` əsasında işləyir; route guard-lar.
- **Tokenlər:** httpOnly və Secure cookie-lərdə saxlanılır; `localStorage`-da saxlanılmır.
- **XSS:** istifadəçi məzmunu (rəylər, təsvirlər) təmizlənir; CSP başlıqları tətbiq olunur.
- **Fayl yükləmə:** tip və ölçü yoxlanılır; yekun yoxlama backend-dədir.
- **Həssas məlumatlar:** telefon və VÖEN kontekstə görə maskalanır; kart məlumatları göstərilmir.
- **Kritik əməliyyatlar:** silmə və geri ödəniş kimi əməliyyatlarda təsdiq dialoqu.
- **Fərdi məlumatlar:** razılıq formaları, cookie bildirişi, məlumatın ixracı və silinməsi üçün sorğu ekranları.

## 71. Əlçatanlıq

Minimum **WCAG 2.2 AA** hədəflənir:

- klaviatura ilə naviqasiya
- görünən focus vəziyyəti
- ekran oxuyucu etiketləri
- rəng kontrastı
- əlçatan formlar və xəta mesajları
- kifayət qədər böyük toxunma sahələri
- `prefers-reduced-motion` dəstəyi

## 72. SEO

Public web üçün:

- SSR və ya statik generasiya
- metadata, OpenGraph, canonical
- hreflang (AZ / RU / EN)
- dillər üzrə sitemap, robots
- JSON-LD: Product, Service, LocalBusiness (hər filial üçün), BreadcrumbList, FAQPage
- filtr səhifələri üçün indeksasiya qaydaları (canonical və ya noindex)

Kabinetlər, panellər və admin panel indekslənmir.

## 73. Performans

Hədəflər (mobil cihazlarda, 75-ci persentil):

| Göstərici | Hədəf |
|---|---|
| LCP | < 2.5 s |
| CLS | < 0.1 |
| INP | < 200 ms |

- Şəkillərdə lazy loading, responsive ölçülər və müasir formatlar.
- Route səviyyəsində kod bölünməsi; xəritə, qrafik və redaktor kimi ağır komponentlər dinamik yüklənir.
- JS bundle büdcəsi Foundation mərhələsində müəyyən olunur.
- Uzun siyahılarda virtualizasiya.
- Usta paneli zəif mobil internetdə işləyə bilməlidir: optimistik yeniləmə, təkrar cəhd.

---

# Hissə XII — İcra

## 74. Prioritetlər, komanda və mərhələlər

### 74.1. Prioritet səviyyələri

| Səviyyə | Məna |
|---|---|
| **MVP (Must-have)** | İlk production buraxılışı üçün vacib funksiyalar |
| **Phase 2** | MVP-dən sonra əlavə olunan genişləndirmələr |
| **Future / Optional** | Sonrakı mərhələlər üçün nəzərdə tutulan funksiyalar |

Phase 2 və Future funksiyaları üçün MVP-də yalnız data modeli və API müqaviləsi səviyyəsində hazırlıq görülür; UI hazırlanmır.

### 74.2. Funksiyaların prioritetləri

| Modul | MVP | Phase 2 | Future / Optional |
|---|---|---|---|
| Autentifikasiya | Telefon + OTP, e-poçt + şifrə, qeydiyyat, şifrə bərpası, rol əsaslı routing, daxili rollar üçün 2FA | Bir neçə rol üçün rejim dəyişdirmə | Sosial giriş |
| Public sayt | Ana səhifə, xidmətlər, ustalar və profil, usta qoşulma səhifəsi, filiallar, korporativ və hüquqi səhifələr, SEO | QR ilə zəmanət yoxlaması, B2B müraciət səhifəsi | — |
| Kataloq | Kateqoriyalar, dinamik atributlar, variantlar, filtr, axtarış, məhsul səhifəsi, uyğunluq | Müqayisə, toplu import (CSV / Excel), analoq hissələr, məhsul rəyləri | Çox satıcılı kataloq |
| Səbət və checkout | Səbət, checkout, kuryer və filialdan götürmə, sabit çatdırılma tarifi, məhsul + quraşdırma, plan üzrə ünvan qaydaları | Zona əsaslı çatdırılma tarifləri, promo kodlar | — |
| Servis əməliyyatları | Servis sifarişi, üç icra forması, ixtisaslar, müştəri seçimi və dispetçer təyinatı, workflow şablonları, statuslar, smeta və təsdiq, haqq qaydaları, vaxt slotları, servis və usta rəyləri | Avtomatik təyinat, dispetçer xəritəsi, periodik servis planları | Ustanın real vaxt izlənməsi |
| Logistika | Logistika tapşırıqları, kuryer interfeysi, qəbul və təhvil aktı | QR etiket və cihaz yerinin skan ilə izlənməsi | Marşrut optimallaşdırılması |
| Zəmanət | Zəmanət sənədi, operator tərəfindən zəmanət sifarişi | Müştərinin özü zəmanət iddiası yaratması | — |
| Müştəri kabineti | Profil, ünvanlar, cihazlar, sifarişlər, ödənişlər, zəmanətlər, sənədlər, bildirişlər, favoritlər | Qaytarma müraciəti, ailə üzvləri | — |
| Usta paneli | İşlər, cədvəl, diaqnostika və smeta, mobil anbar, material sərfiyyatı, qazanc, sənədlər, abunə | Geniş statistika, geniş CRM, promote | Bir neçə şirkətlə əməkdaşlıq, offline rejim |
| Abunəlik | Müştəri Basic / Pro / Premium, müstəqil usta planları, entitlements, plan redaktoru, STAFF lisenziyaları | Korporativ planlar, sınaq müddəti, 3 və 6 aylıq müddətlər | Xüsusi planlar |
| B2B | — | Korporativ, Partner (komissiya daxil), Topdan panelləri və B2B qeydiyyatı | — |
| Ödəniş və sənədlər | Onlayn kart, nağd, POS, ödəniş statusları, fiskal çek, faktura, xidmət aktı, admin tərəfindən geri ödəniş | Taksit, bank köçürməsi, kredit limiti, e-qaimə | — |
| Endirimlər | Abunə endirimləri, kampaniyalar (`STACKABLE` / `EXCLUSIVE`) | `COMBINABLE_WITH_LIST`, prioritet redaktoru, maksimum endirim həddi | — |
| Hesablaşmalar | Müstəqil usta hesablaşması, nağd balans və kassaya təhvil | Partner komissiyaları, maliyyə dashboard-u və hesabatları | Mühasibat proqramı inteqrasiyası |
| Anbar | Anbarlar, vahidlər və çevirmələr, qalıqlar, hərəkətlər, sadə qəbul, rezervasiya, transfer, şirkət səviyyəsində orta çəkili maya dəyəri | Alış sifarişləri və təchizatçılar, sayım, anbar qrupları, FIFO və səviyyələr üzrə metod | — |
| Admin panel | Dashboard, servis sifarişləri, dispetçer lövhəsi, workflow və haqq qaydaları, kataloq, anbar, qiymət siyahıları, abunə planları, ödənişlər, istifadəçilər və rollar, filiallar, audit log, brend ayarları | KPI hədəfləri və KPI dashboard-u, sayt məzmunu, bildiriş şablonları, inteqrasiyalar ekranı | Platforma səviyyəsində tenant idarəsi |
| Bildirişlər | In-app, SMS, tranzaksiya e-poçtları | WhatsApp, istifadəçinin kanal seçimləri | Push (mobil tətbiqlə) |
| Platforma | AZ / RU / EN, data modelində tenant konteksti, vendor-neutral adapterlər | — | Multi-tenant (yeni şirkətlərin qoşulması), mobil tətbiq, Windows tətbiqi |

### 74.3. Minimum komanda tərkibi (Phase 1 — Frontend)

| Rol | Say | Yüklənmə | Məsuliyyət |
|---|---|---|---|
| Product Owner | 1 | Qismən | Prioritetlər, qərarlar, sprint nəticələrinin qəbulu |
| Project Manager / Business Analyst | 1 | Tam | Backlog, tələblərin detallaşdırılması, sprint planı, stakeholder-lərlə əlaqə |
| UI/UX dizayner | 1 | İlk 3 ay tam, sonra qismən | İstifadəçi axınları, maketlər, design system |
| Tech Lead / Senior Frontend | 1 | Tam | Arxitektura, monorepo, API müqaviləsi, code review |
| Frontend developer | 3 | Tam | `apps/web` və `apps/admin` modulları |
| QA mühəndisi | 1 | 2-ci aydan tam | Test planı, manual və E2E testlər |
| Backend / Solution architect | 1 | Qismən | API müqaviləsinin gələcək backend ilə uyğunluğu |
| Tərcüməçi / kontent redaktoru | 1 | Qismən | RU və EN tərcümələr, məzmun |

### 74.4. Müddət və delivery mərhələləri

Tövsiyə olunan plan iki həftəlik sprintlərlə:

| Həftə | Delivery mərhələsi | Texniki mərhələlər (§74.5) | Nəticə |
|---|---|---|---|
| 1–3 | Discovery | — | İstifadəçi axınları, wireframe-lər, backlog, API müqaviləsinin ilk versiyası |
| 4–6 | Foundation | 1, 2, 3-ün başlanğıcı | Monorepo, CI, i18n, MSW, domen modeli, design tokenləri |
| 7–10 | Əsaslar | 3, 4, 5 | Design system, autentifikasiya, public sayt |
| 11–16 | Kommersiya və servis nüvəsi | 6, 7 | Kataloq, checkout, servis sifarişi, workflow, smeta |
| 17–22 | Kabinetlər və əməliyyatlar | 8, 9, 11 | Müştəri kabineti, usta və kuryer interfeysi, admin servis əməliyyatları |
| 23–27 | Admin modulları | 12, 13 | Kataloq, anbar, abunəlik, ödəniş, istifadəçilər |
| 28–29 | Stabilizasiya və qəbul (UAT) | 14 | Polish, əlçatanlıq, performans, tərcümələrin yoxlanması |

| Mərhələ | Müddət |
|---|---|
| Frontend MVP (discovery və UAT daxil) | 29 həftə (təxminən 7 ay) |
| Frontend Phase 2 | MVP-dən sonra təxminən 12 həftə |

İlk production buraxılışı üçün backend MVP də tələb olunur (Əlavə A). Backend paralel başlamasa, production buraxılışı frontend MVP-dən sonra backend müddəti qədər gecikir; backend müddəti və komandası ayrıca planlaşdırılır.

### 74.5. Texniki mərhələlər

| # | Mərhələ | Məzmun | Asılılıq |
|---|---|---|---|
| 1 | Foundation | Monorepo, Next.js, TypeScript, lint, formatter, CI, i18n infrastrukturu, MSW və SSR yoxlaması | — |
| 2 | Domen modeli və API müqaviləsi | Sxemlər, statuslar, icazələr, mock data generatorları | 1 |
| 3 | Design system | Tokenlər, komponentlər, Storybook | 1 |
| 4 | Auth və rol əsaslı routing | Giriş, qeydiyyat, OTP, 2FA, rejim seçimi, icazə komponentləri | 2, 3 |
| 5 | Public sayt | Ana səhifə, xidmətlər, korporativ və hüquqi səhifələr, SEO | 3 |
| 6 | Kataloq və e-commerce | Kateqoriyalar, filtr, axtarış, məhsul, uyğunluq, səbət, checkout | 2, 3 |
| 7 | Servis sifarişi və workflow | Sifariş axını, icra formaları, slotlar, statuslar, smeta, haqlar | 2, 3, 4 |
| 8 | Müştəri kabineti | Cihazlar, sifarişlər, zəmanət, sənədlər, abunəlik | 6, 7 |
| 9 | Usta paneli | İşlər, cədvəl, material, qazanc, qeydiyyat və yoxlama | 7 |
| 10 | B2B panelləri | Partner, Topdan, Korporativ | 6, 7 |
| 11 | Admin — servis əməliyyatları | Sifarişlər, dispetçer lövhəsi, workflow şablonları, haqq qaydaları, logistika | 7 |
| 12 | Admin — kataloq və anbar | PIM, uyğunluq, vahidlər, anbar, transfer, alış, sayım | 6 |
| 13 | Admin — abunəlik, maliyyə, istifadəçilər | Planlar, ödənişlər, kassa, sənədlər, rollar, audit | 4 |
| 14 | Polish | Responsive, əlçatanlıq, performans, animasiyalar, tərcümələrin yoxlanması | Hamısı |

10-cu mərhələ (B2B panelləri) Phase 2-yə aiddir və MVP planına daxil deyil. 9-cu mərhələ kuryer interfeysini də əhatə edir.

### 74.6. MVP sərhədinə nəzarət

- MVP siyahısına yeni funksiya yalnız Product Owner təsdiqi ilə əlavə olunur. Əlavə olunan funksiya həcmində başqa funksiya Phase 2-yə keçirilir və ya müddət rəsmi olaraq yenilənir.
- Hər sərhəd dəyişikliyi dəyişiklik tarixçəsinə yazılır.
- Phase 2 funksiyaları MVP sprintlərinə yalnız bütün MVP funksiyaları təhvil verildikdən sonra götürülür.

## 75. Frontend MVP Definition of Done

Aşağıdakı meyarlar MVP buraxılışına aiddir. Phase 2 funksiyaları üçün eyni keyfiyyət meyarları (§75.2) tətbiq olunur.

### 75.1. Funksional

- [ ] §74.2-də MVP kimi işarələnmiş bütün funksiyalar və onlara aid §60, §61 səhifələri mövcuddur.
- [ ] MVP rolları üçün panellər və rol əsaslı UI işləyir: müştəri, müstəqil və `STAFF` usta, kuryer, daxili rollar.
- [ ] Qonaq servis sifarişi və checkout-a başlayanda girişə yönləndirilir.
- [ ] Plan limitləri (ünvan, birdəfəlik ünvan, aktiv sifariş, təcili servis) entitlements əsasında işləyir.
- [ ] Müstəqil usta hesablaşması və kuryer tapşırıqları simulyasiya olunur.
- [ ] Bütün səhifələr mock API ilə işləyir; birbaşa import olunan dummy JSON yoxdur.
- [ ] Servis workflow ən azı üç şablon üzrə (ünvanda təmir, quraşdırma, götürmə və çatdırma) başdan sona simulyasiya olunur.
- [ ] Smetanın təsdiqi, qismən təsdiqi, imtinası və haqq qaydaları simulyasiya olunur.
- [ ] Filtr, axtarış, səbət və checkout işləyir.
- [ ] Anbar, rezervasiya, transfer və ölçü vahidlərinin göstərilməsi işləyir.
- [ ] Müştəri və usta abunəlik UI-ı işləyir; imkanlar `entitlements` ilə idarə olunur.
- [ ] Ödəniş statusları və sənəd önizləmələri göstərilir.
- [ ] Bütün interfeys AZ / RU / EN dillərinə tərcümə olunub.

### 75.2. Keyfiyyət

- [ ] Hər səhifədə loading, empty və error halları var.
- [ ] Formlarda validasiya və lokallaşdırılmış xəta mesajları var.
- [ ] Kod paylaşılan komponentlərdən qurulub; komponentlər Storybook-dadır.
- [ ] TypeScript və lint xətası yoxdur.
- [ ] Kritik axınlar üçün E2E testlər keçir: giriş, servis sifarişi, smeta təsdiqi, checkout.
- [ ] Avtomatlaşdırılmış əlçatanlıq yoxlamasında kritik xəta yoxdur.
- [ ] Public səhifələr §73-dəki performans hədəflərinə cavab verir.
- [ ] Responsive: 320 px-dən 1440+ px-ə qədər; iOS Safari və Android Chrome-da yoxlanılıb.
- [ ] Production build uğurludur.

## 76. Risklər

| Risk | Təsir | Azaltma yolu |
|---|---|---|
| Workflow mühərrikinin mürəkkəbliyi | Yüksək | Əvvəlcə üç şablonla başlamaq; versiyalaşdırma ilk gündən |
| API müqaviləsinin backend mərhələsində dəyişməsi | Yüksək | Contract-first yanaşma; backend komandası ilə erkən razılaşma |
| Müstəqil usta hesablaşmasının vergi və hüquqi tərəfi (sənədlər şirkət adından, ödəniş ustaya sonradan) | Yüksək | Müqavilə şablonu və vergi tutulmaları mühasib və hüquqşünasla MVP-dən əvvəl razılaşdırılır |
| MVP həcminin böyüməsi | Yüksək | §74.6 sərhəd qaydaları |
| Provayderlərdən asılılıq | Orta | Vendor-neutral adapterlər (Əlavə E) |
| Fiskal kassa, e-qaimə və taksit inteqrasiyaları | Yüksək | Adapter arxitekturası; provayderlərin erkən seçimi |
| Fərdi məlumatların qorunması | Yüksək | Minimum çıxış prinsipi, razılıq, audit log |
| MSW və SSR uyğunsuzluğu | Orta | Foundation-da yoxlama; lazım olarsa ayrıca mock server |
| Üç dildə məzmun hazırlığı | Orta | Tərcümə prosesinin və məsul şəxsin erkən təyini |
| Multi-tenant hazırlığının təxirə salınması | Orta | Tenant kontekstinin data modelində ilk gündən olması |

## 77. Açıq kommersiya parametrləri

Bütün açıq biznes sualları cavablandırılıb (Əlavə D.2). Biznes məntiqi, rollar, autentifikasiya, multi-tenant modeli, ödəniş axını, müstəqil usta modeli, logistika, plan sistemi, anbar uçotu və sənədləşmə üzrə qərarlar yekundur.

Sənəddə yalnız aşağıdakı kommersiya rəqəmləri və seçimləri sonradan müəyyən edilir. Onların hamısı admin paneldən daxil edilir və kod dəyişikliyi tələb etmir:

| # | Parametr | Harada daxil edilir | Bölmə |
|---|---|---|---|
| 1 | Müştəri Pro və Premium planlarının aylıq və illik qiymətləri | `/subscription-plans` | §42 |
| 2 | Müstəqil usta planlarının aylıq və illik qiymətləri | `/subscription-plans` | §43 |
| 3 | Korporativ plan qiymətləri və müqavilə şərtləri | `/subscription-plans`, `/b2b-accounts` | §44.3 |
| 4 | Partner komissiya dərəcələri | `/partner-types`, `/b2b-accounts` | §45.4 |
| 5 | B2B ödəniş şərtləri və kredit limitləri | `/b2b-accounts` | §44.1 |
| 6 | Xidmət qiymətləri və haqq məbləğləri | `/services`, `/fee-rules` | §10, §20 |
| 7 | Çatdırılma tarifləri | `/settings` | §31.3 |
| 8 | Provayderlərin yekun seçimi (Əlavə E-dəki tövsiyələr əsasında) | `/integrations` | Əlavə E |
| 9 | Yekun brend adı, domen, loqo və rəng palitrası | `/settings/branding` | §56.3 |
| 10 | Əlavə Approver-lərin təyini | Sənəd başlığı | Sənəd rolları |

---

# Əlavələr

## Əlavə A — Texniki istiqamət (Phase 1-dən kənar)

Bu əlavə sonrakı mərhələlər üçün texniki istiqaməti təsvir edir və Phase 1 tələbi deyil. Yekun qərarlar backend mərhələsi başlamazdan əvvəl təsdiqlənir.

### A.1. Backend

**NestJS + TypeScript.** Sistem sadə CRUD deyil və aydın domen sərhədləri tələb edir.

Domen modulları: Auth, Users, Organizations (tenant), Branches, Customers, B2B Accounts, Technicians, Catalog, Pricing, Inventory, Service Orders, Workflow, Logistics, Sales Orders, Payments, Fiscal & Documents, Subscriptions, Finance, Notifications, Reviews, Search, Audit.

### A.2. Verilənlər bazası

**PostgreSQL.** D1 / SQLite bu layihə üçün uyğun deyil, çünki çoxlu tranzaksional əməliyyat var: stok, rezervasiya, ödəniş, servis, maliyyə, anbar hərəkətləri. Tenant izolyasiyası modeli backend mərhələsində seçilir.

### A.3. ORM

**Prisma** əsas seçimdir; alternativ — Drizzle ORM.

### A.4. Redis

İstifadə sahələri: cache, OTP, sessiyalar, rate limiting, müvəqqəti rezervasiyalar, növbə (queue), distributed lock.

Eyni stokun eyni anda iki nəfərə satılmasının əsas qarşısı PostgreSQL tranzaksiyaları və sətir kilidləri ilə alınır; Redis lock köməkçi vasitədir.

### A.5. Növbə sistemi

**BullMQ + Redis.** HTTP sorğusunu gözlətməməli olan işlər:

- SMS, e-poçt, push və WhatsApp göndərişi
- faktura, fiskal çek və zəmanət sənədinin yaradılması
- hesabatların hazırlanması
- abunələrin yenilənməsi
- rezerv müddətinin bitməsi və SLA yoxlamaları

### A.6. Fayl storage

**Cloudflare R2** (S3 uyğun). Şəkillər və fayllar verilənlər bazasında saxlanmır; bazada yalnız URL, açar və metadata qalır. Yükləmə presigned URL ilə aparılır.

### A.7. Axtarış mühərriki

PostgreSQL full-text search ilə başlamaq və ya ayrıca axtarış mühərriki (Meilisearch, Typesense və s.) istifadə etmək §29-dakı dil tələblərinə görə seçilir.

### A.8. Docker

Development mühiti Docker Compose ilə qaldırılır: PostgreSQL, Redis, Backend, Workers. Frontend lokal olaraq ayrıca işləyə bilər.

### A.9. Mobil tətbiq

**React Native + Expo + TypeScript.** Android və iOS eyni kod bazasından çıxarılır. Girişdən sonra istifadəçinin roluna görə fərqli naviqasiya açılır. Usta interfeysi üçün kamera, push, geolokasiya və məhdud offline rejim.

### A.10. Windows tətbiqi

Yalnız real ehtiyac (anbar, kassa) yaranarsa hazırlanır. **Tauri + React + TypeScript** — mövcud UI komponentlərindən istifadə etməyə imkan verir; ayrıca C# tətbiqi tələb olunmur.

### A.11. CI/CD və mühitlər

**GitHub Actions.** Hosting, mühitlər (dev / staging / production), monitorinq və xəta izlənməsi backend mərhələsində müəyyən olunur.

## Əlavə B — Hədəf arxitektura

```
           ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
           │ Web          │  │ Admin        │  │ Mobile       │
           │ Next.js      │  │ Next.js      │  │ React Native │
           └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                  └─────────────────┼─────────────────┘
                                    │  HTTPS / JSON
                             ┌──────▼───────┐
                             │  NestJS API  │
                             └──────┬───────┘
      ┌──────────────┬──────────────┼──────────────┬──────────────┐
┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│ PostgreSQL │ │ Redis      │ │ R2 Storage │ │ Workers    │ │ Xarici     │
│            │ │ Cache, OTP │ │ Fayllar    │ │ BullMQ     │ │ servislər  │
└────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
```

- Bütün klientlər (Web, Admin, Mobile) API-yə bərabər səviyyədə qoşulur; biri digərindən asılı deyil.
- Workers növbəni Redis üzərindən emal edir.
- Xarici servislər: ödəniş və taksit provayderləri, fiskal kassa, e-qaimə, SMS, WhatsApp, e-poçt, push, xəritə, gələcəkdə mühasibat proqramı. Hamısı adapterlər vasitəsilə qoşulur (Əlavə E).

## Əlavə C — Qlossari

| Termin | İzah |
|---|---|
| Servis sifarişi (Service Order) | Müştərinin servis tələbi və onun bütün mərhələləri |
| Mərhələ (Stage) | Workflow-un icraçısı və statusu olan addımı |
| Workflow şablonu | Servis və icra forması üçün mərhələlərin ardıcıllığı |
| İcra forması | Ünvanda, servis mərkəzinə gətirmə, götürmə və çatdırma |
| Smeta (Estimate) | Diaqnostika və ya ölçüdən sonra hazırlanan qiymət təklifi |
| Servis sərfiyyatı (Service Consumption) | Servis işində istifadə olunan və stokdan çıxılan material |
| Servis stoku (Service Stock) | Servis fəaliyyəti üçün ayrılmış ehtiyat hissələri, materiallar və sərfiyyat məhsulları |
| Əsas vahid (Base Unit) | Məhsulun stokda uçota alındığı vahid |
| Rezerv | Konkret sifariş və ya usta üçün ayrılmış stok |
| SKU | Məhsulun satılan konkret variantı |
| Uyğunluq (Compatibility) | Ehtiyat hissəsinin uyğun olduğu cihaz modelləri |
| İmkan (Entitlement) | Abunə planının verdiyi konkret hüquq və ya limit |
| SLA | Reaksiya və ya icra üçün öhdəlik müddəti |
| Tenant | Platformadan istifadə edən servis şirkəti |
| `STAFF` / `INDEPENDENT` | Şirkət əməkdaşı olan usta / müstəqil usta |
| STAFF lisenziyası | Şirkət əməkdaşı olan ustanın platformadan istifadə hüququ; fərdi abunə əvəzinə şirkət səviyyəsində verilir |
| Əməkdaşlıq (Partnership) | Müstəqil ustanın konkret şirkətlə təsdiqlənmiş iş əlaqəsi |
| Hesablaşma (Settlement) | Şirkətin müstəqil ustaya və ya partnerə çatacaq məbləği hesablaması və ödəməsi |
| Partner komissiyası | Partnerə sifariş üzrə hesablanan faiz və ya sabit məbləğ |
| Kuryer / Sürücü | Yalnız özünə təyin olunmuş logistika tapşırıqlarını icra edən rol |
| Birdəfəlik ünvan | Sifarişdə istifadə olunan, amma hesabda saxlanılmayan ünvan |
| Endirim birləşmə rejimi | Endirimin digər endirimlərlə birlikdə tətbiq olunma qaydası |
| Orta çəkili maya dəyəri | Hər qəbuldan sonra yenidən hesablanan orta alış dəyəri |
| FIFO | İlk daxil olan partiyanın ilk çıxdığı maya dəyəri metodu |
| Anbar qrupu | Hesabat və maya dəyəri üçün birləşdirilmiş anbarlar |
| MVP | İlk production buraxılışı üçün vacib funksiyalar toplusu |
| Adapter | Xarici provayderi əsas biznes məntiqindən ayıran inteqrasiya komponenti |
| Fiskal çek | Vergi orqanına ötürülən kassa çeki |
| E-qaimə | Elektron qaimə-faktura |
| VÖEN | Vergi ödəyicisinin eyniləşdirmə nömrəsi |
| MSW | Mock Service Worker — API sorğularını mock edən alət |

## Əlavə D — Qəbul edilmiş biznes qərarları

Qərarlar 13.09.2026 tarixində Product Owner tərəfindən verilib.

### D.1. Əsas biznes qərarları

| # | Mövzu | Qərar |
|---|---|---|
| 1 | Ustalar | Həm şirkət əməkdaşları, həm də müstəqil ustalar |
| 2 | Platforma modeli | İlkin olaraq bir şirkət üçün; gələcəkdə başqa servis şirkətləri də qoşula bilər |
| 3 | Usta seçimi | Qarışıq model: müştəri seçə bilər, dispetçer təyin edə bilər, sistem avtomatik seçə bilər |
| 4 | Abunə | Müştəri üçün Basic pulsuzdur; ustaların qeydiyyatı və istifadəsi ödənişli abunə ilədir |
| 5 | B2B | Partner, Topdan və Korporativ müştəri üçün ayrıca rol və ayrıca panel |
| 6 | Ödəniş | Nağd, kart / onlayn, bank köçürməsi və taksit; ƏDV, fiskal çek və faktura nəzərə alınır |
| 7 | Dillər | AZ / RU / EN |
| 8 | Smetadan imtina | Standart halda haqq tutulmur; admin xidmət növünə görə istisna qaydası yarada bilər |
| 9 | İcra formaları | Ünvanda servis, servis mərkəzinə gətirmə, ünvandan götürmə və geri çatdırma |
| 10 | Workflow | Admin mərhələləri yarada, dəyişə və silə bilər; proses bütün sistem üzrə vahid və nəzarətli qalır |
| 11 | Premium | Təcili servis və bir neçə ünvan yalnız Premium müştərilər üçündür |
| 12 | Service Stock | Servis üçün ehtiyat hissələri, materiallar və sərfiyyat məhsulları moduludur; hər məhsulun öz ölçü vahidi var |
| 13 | Sənəd | Mövcud fayl yenilənir; struktur yenidən qurulur, texniki detallar əlavələrə keçirilir, çatışmayan bölmələr əlavə olunur |

### D.2. Açıq suallar üzrə qərarlar

| # | Mövzu | Qərar | Bölmə |
|---|---|---|---|
| 1 | STAFF ustalar | Daxili lisenziya modeli; fərdi abunəyə tabe deyil. Müstəqil ustalar fərdi ödənişli plan seçir | §12.1, §43 |
| 2 | Müstəqil usta hesablaşması | Yalnız abunə əsaslı; işlərdən faiz və ya komissiya tutulmur | §51.3 |
| 3 | Sənədlər və ödəniş | Bütün rəsmi sənədlər şirkətin adından; müştəri şirkətə ödəyir, ustaya çatacaq məbləğ daxili hesablaşma ilə ödənilir | §47, §49, §51.3 |
| 4 | Qonaq sifarişi | Yoxdur; servis sifarişi və checkout üçün giriş məcburidir | §9.3, §13.3, §31 |
| 5 | Birdəfəlik ünvan | Basic — yox, yalnız mövcud ünvan; Pro — checkout və sifarişdə birdəfəlik ünvan mümkündür | §31.2, §42 |
| 6 | Korporativ ünvan limiti | Müştəri planlarından asılı deyil; müqavilə, korporativ plan və ya xüsusi şərtlərlə təyin olunur | §44.3 |
| 7 | Kuryer rolu | Ayrıca rol; tam panel yoxdur — yalnız özünə təyin olunmuş tapşırıqlar və status yeniləmə | §7.2, §21.6 |
| 8 | Partner modeli | Konfiqurasiya olunandır; öz müştərisi adından sifariş yarada bilər; komissiya faiz, sabit, xidmət növü və müqavilə üzrə; aktiv / deaktiv edilir | §45.1, §45.4 |
| 9 | Giriş üsulları | Telefon + OTP və e-poçt + şifrə; istifadəçi seçir; sosial giriş ilkin tələb deyil | §9.2 |
| 10 | Endirimlərin birləşdirilməsi | Kampaniya səviyyəsində idarə olunur: toplanır, birləşmir, seçilmiş kampaniyalarla, prioritetə görə | §46.3 |
| 11 | Plan sistemi | Dinamik, admin idarə edir; PRD-də struktur və başlanğıc limitlər, qiymətlər sonradan | §41–43, §44.3 |
| 12 | Maya dəyəri | Orta çəkili və FIFO; şirkət standartı, məhsul, kateqoriya və anbar qrupu üzrə fərqli metod mümkündür | §40.4 |
| 13 | Mühasibat inteqrasiyası | İlkin mərhələdə yoxdur; ayrıca inteqrasiya qatı ilə arxitektura hazır qurulur | §51.1, Əlavə E.3 |
| 14 | Provayderlər | Azərbaycan bazarı üçün tövsiyələr; vendor-neutral arxitektura | Əlavə E |
| 15 | Multi-tenant | Müstəqil usta bir neçə şirkətlə işləyə bilər; kataloq və kommersiya məlumatları şirkətlər arasında izolyasiya olunur | §56.2 |
| 16 | Brend | Yekun ad və domen müəyyən edilməyib; işçi ad `besqardasServis.az` (domen alınmayıb); brend elementləri konfiqurasiya olunur | §56.3 |
| 17 | KPI hədəfləri | PRD-də başlanğıc hədəflər; admin paneldən dəyişdirilir | §2 |
| 18 | MVP, komanda, müddət | MVP / Phase 2 / Future prioritetləri, minimum komanda və delivery planı | §74 |
| 19 | Product Owner və Approver-lər | Product Owner — layihənin sahibi, yekun təsdiq səlahiyyəti; rəhbərlik əlavə Approver-lər təyin edə bilər | Sənəd rolları |

## Əlavə E — İnteqrasiyalar və provayderlər

### E.1. Vendor-neutral prinsip

- Hər xarici xidmət sahəsi üçün sistem daxilində vahid interfeys müəyyən olunur; konkret provayder adapter kimi qoşulur.
- Biznes məntiqi yalnız interfeysi tanıyır — provayderin adını və API detallarını tanımır.
- Provayder ayarları (açarlar, rejim, aktivlik) `/integrations` ekranında tenant səviyyəsində saxlanılır. Gizli açarlar şifrələnir və UI-da göstərilmir.
- Eyni sahə üçün bir neçə provayder aktiv ola bilər (məsələn, əsas və ehtiyat SMS provayderi, müxtəlif taksit kartları).
- Provayderdən gələn bildirişlər (webhook) imza ilə yoxlanılır və idempotent emal olunur.
- Xarici sorğular və cavablar loglanır; həssas məlumatlar maskalanır.
- Provayder dəyişəndə yalnız yeni adapter yazılıb aktivləşdirilir — sifariş, ödəniş və sənəd məntiqi dəyişmir.

### E.2. Sahələr və tövsiyə olunan provayderlər

Siyahı tövsiyədir. Yekun seçim kommersiya şərtləri, API imkanları və texniki yoxlamadan sonra edilir (§77).

| Sahə | Daxili interfeys | Tövsiyə olunan variantlar |
|---|---|---|
| Onlayn kart ödənişi | `PaymentProvider` | Epoint (Kapital Bank dəstəkli), GoldenPay, Payriff; bankların e-commerce ekvayrinq xidmətləri (Kapital Bank, PAŞA Bank, ABB) |
| POS terminal | `PosProvider` | Ekvayrinq bankının mobil və stasionar POS həlləri |
| Taksit | `InstallmentProvider` | Bank taksit kartları: Birbank / BirKart (Kapital Bank), Bolkart (Bank of Baku) və digərləri — çox vaxt ödəniş şlüzü və ya ekvayrinq bankı vasitəsilə |
| Fiskal kassa və fiskal çek | `FiscalProvider` | Dövlət Vergi Xidmətinin tələblərinə uyğun onlayn nəzarət-kassa aparatı (NKA) təchizatçıları; seçim mühasiblə birlikdə edilir |
| E-qaimə / elektron faktura | `EInvoiceProvider` | Dövlət Vergi Xidmətinin elektron sistemi (e-taxes.gov.az); avtomatik inteqrasiya imkanları yoxlanılmalıdır, olmadıqda sənəd məlumatlarının export-u |
| SMS | `SmsProvider` | LSIM; mobil operatorların korporativ kütləvi SMS xidmətləri (Azercell, Nar və s.); beynəlxalq ehtiyat variant — Twilio, Vonage |
| WhatsApp | `MessagingProvider` | WhatsApp Business Platform (Meta Cloud API) birbaşa və ya Business Solution Provider-lər (Twilio, Infobip, 360dialog) |
| E-poçt | `EmailProvider` | Amazon SES, Resend, SendGrid, Mailgun |
| Push bildirişlər | `PushProvider` | Firebase Cloud Messaging, Expo Push (mobil tətbiqlə) |
| Xəritə və geolokasiya | `MapProvider`, `GeocodingProvider` | Google Maps Platform, Mapbox, OpenStreetMap əsaslı həllər (MapLibre) |
| Fayl storage | `StorageProvider` | Cloudflare R2, Amazon S3 və S3 uyğun storage |
| Mühasibat proqramı | `AccountingExporter` | İlkin mərhələdə yoxdur (E.3) |

### E.3. Mühasibat inteqrasiya qatı

İlkin mərhələdə konkret mühasibat proqramı ilə inteqrasiya edilmir, amma sistem buna hazır qurulur:

- **Maliyyə hadisələri:** satış, ödəniş, geri ödəniş, alış, anbar hərəkəti, usta hesablaşması və partner komissiyası standart formatda yaradılır və saxlanılır.
- **Export API:** hadisələr və sənədlər dövr üzrə çəkilə bilir (JSON, CSV / XLSX).
- **Uyğunlaşdırma cədvəlləri:** məhsul, xidmət, ödəniş üsulu və vergi növləri xarici sistemin hesab kodlarına uyğunlaşdırılır.
- **Sinxronizasiya statusu:** hər sənəd üçün `NOT_SENT`, `SENT`, `FAILED`, `ACKNOWLEDGED`; təkrar göndərmə idempotentdir.
- **Adapter:** proqram seçiləndə yalnız `AccountingExporter` adapteri yazılır; əsas biznes məntiqi dəyişmir.
