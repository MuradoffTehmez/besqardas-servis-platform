# Dəyişiklik tarixçəsi

## [Unreleased]

### Əlavə edildi (Added)

- Ətraflı layihə/səhifə auditi və ayrıca GitHub Wiki sənədlər dəsti.
- `SUPPORT.md`, `CODE_OF_CONDUCT.md`, `CODEOWNERS` və sənədləşmə issue forması.
- npm və GitHub Actions üçün Dependabot qrupları.
- CodeQL və pull request dependency review workflow-ları.
- `test:e2e` və tam lokal keyfiyyət qapısı üçün `check` komandaları.

### Dəyişdirildi (Changed)

- README, contribution, security, issue və pull request sənədləri tam yeniləndi.
- CI-a Playwright E2E/SEO/a11y mərhələsi əlavə edildi və bütün action-lar immutable commit SHA-larına pin edildi.
- `.env.example` faktiki runtime dəyişənləri və Playwright override-ları ilə genişləndirildi.

### Düzəlişlər (Fixed)

- Checkout E2E radio seçimi lokalizasiya copy-sindən asılı olmayan semantik locator-a keçirildi; uğursuz gözləməni gizlədən `.catch()` silindi.
- E2E browser context-də cookie seçimi deterministik edildi.
- Geniş rol/endpoint inteqrasiya testinin CI yükündə 5 saniyəlik timeout riski aradan qaldırıldı.

## [v0.3.1] - 2026-09-14

### Əlavə edildi (Added)

#### SEO və Server-Side Rendering (SSR) (PRD §72)

- Public səhifələr üçün tam Server-Side Rendering (SSR) və TanStack Query cache hidratasiyası.
- Hər bir səhifə üçün dinamik metadata: başlıq (title), təsvir (description), canonical URL, çoxdilli hreflang (AZ, RU, EN), OpenGraph və JSON-LD strukturları (`BreadcrumbList`, `WebSite`).
- Çoxdilli `sitemap.xml` və axtarış sistemləri üçün `robots.txt`; qapalı zonalar, səbət, axtarış və filtrlər üçün noindex qaydaları.
- Prefikssiz ünvanlar üçün dil deteksiyası və avtomatik yönləndirmə proxisi (`proxy.ts`), fərdi 404 səhifələri.
- ICU-dan asılı olmayan sabit cədvəllə ədəd, ay və həftə günü formatlaması (SSR və brauzer çıxışlarının tam uyğunluğu).

#### Müqayisə sistemi və kateqoriya üzrə müqayisə səhifəsi

- Kateqoriyalar üzrə müqayisə modulu (`/compare`): yalnız eyni əsas kateqoriya daxilində yan-yana müqayisə (hər kateqoriyada 4 məhsula qədər).
- "Yalnız fərqləri göstər" rejimi, xüsusiyyət qrupları və fərqlərin vizual vurğulanması.
- Mobil cihazlar üçün fərdi 2 məhsullu müqayisə, yerdəyişmə və kart bölmələri.
- Başlıqda say nişanlı müqayisə ikonu, kartda və məhsul səhifəsində müqayisə düyməsi, toast vasitəsilə səhifəyə keçid.
- API ilə tam sinxronizasiya (`isFavorite`, `inCompare`); qonaq istifadəçilər üçün girişə yönləndirmə.

#### Xidmətlər kataloqu və xidmət detalı yenidən dizaynı

- Kataloq: axtarış və statistikalı hero bölməsi, ikonlu kateqoriya plitələri, zəngin xidmət kartları (reytinq, sifariş sayı, icra formaları, zəmanət, qiymət).
- Xidmət detalı: əsas faktlar, problem seçimi (sifariş formasına ötürülür), 5 addımlı icra prosesi, xidmətə daxil olanlar, hüquqlar və ləğv şərtləri, FAQ akkordeonu, rəylər və oxşar xidmətlər.
- Mobil görünüş: üfüqi kateqoriya zolağı, şaquli addımlar və altda sabit sifariş paneli.

#### E2E testlər və stabillik

- Playwright E2E və axe əlçatanlıq testləri (`e2e/auth.spec.ts`, `e2e/checkout.spec.ts`, `e2e/mobile.spec.ts`, `e2e/seo-a11y.spec.ts`, `e2e/service-flow.spec.ts`).
- `loginWithEmail` funksiyasında retry logic və 2FA gözləmə/idarəetmə mexanizmi.
- Səhifələrdə hidratasiya siqnalı (`html[data-hydrated]`) ilə testlərin interaktivliyi gözləməsi.

### Dəyişdirildi (Changed)

#### Məhsul kataloqu və məhsul kartı

- Məhsul kartında fərqləndirilmiş qiymət bloku solda, səbət düyməsi sağda; favorit ikonu birbaşa şəkil üzərində.
- Başlıq, axtarış və sıralama vahid alətlər panelinə birləşdirildi; alt kateqoriyalar üçün üfüqi sürüşən zolaq.
- Kateqoriya ağacı və filtrlər: say göstəriciləri, aktiv bənd vurğulanması, fieldset stilləri; daxili scroll qutusu ləğv edildi.
- Mobil: 2 sütunlu adaptiv şəbəkə, yan-yana yerləşən filtr və sıralama düymələri.
- Kataloqda hər səhifədə 24 məhsul və 6-dan çox parametr olduqda yığılan filtrlər.
- Sayt konteynerinin maksimal eni 1440px-ə qədər artırıldı.

#### Məhsul səhifəsi və səbət

- Məhsul detalı: zəngin qalereya (əsas şəkil + miniatürlər), endirim nişanı, variant düymələri, taksit/qənaət bloku, quraşdırma seçimi, filial anbar qalıqları və rəy kartları.
- Səbət səhifəsi: fərdi sətir kartları, quraşdırma xidməti seçimi, promo kod bloku, sətir xəbərdarlıqları, yekun qənaət və mobil üçün sabit alt rəsmiləşdirmə paneli.

#### B2B və korporativ kabinet

- B2B kabinet daxilində şirkətdaxili təsdiq növbəsi (sifarişlərin təsdiq/rədd edilməsi), sifarişlərdə "təsdiq gözləyir" nişanı.
- B2B kataloq keçidləri kabinet daxilində saxlanılır.
- İstifadəçi rəylərinə şikayət mexanizmi; admin paneldən birbaşa canlı saytda baxış keçidi.

### Düzəlişlər (Fixed)

- **i18n**: Sayt başlığı, footer, ana səhifə və kartlardakı bütün sabit mətnlər `site.*` tərcümə açarlarına keçirildi (AZ / RU / EN).
- **Formatlama**: Pul, müddət və tarixlər formatlayıcılar vasitəsilə vahid standartla əks etdirilir.
- **Əlçatanlıq (a11y)**: Keçidlər standart `<a href>` teqlərinə çevrildi, etiketsiz form elementlərinə əlçatan adlar təyin edildi.
- **Lint**: Vahid flat ESLint konfiqurasiyası (`eslint.config.mjs`) təyin edildi, istifadəsiz kodlar və xətalar aradan qaldırıldı.

## [v0.3.0] - 2026-09-14

### Əlavə edildi (Added)

#### CRM/ERP admin paneli (PRD §61)

- `apps/admin` üçün bütün route-lar: dashboard, servis sifarişləri və operator sifarişi, dispetçer lövhəsi (timeline və xəritə), həftəlik cədvəl, logistika, zəmanət iddiaları.
- **Workflow şablon redaktoru**: mərhələ əlavə/sıralama/kopyalama, başlama şərtləri, tamamlama tələbləri, SLA, yoxlama və versiyalı saxlama.
- **İstifadəçilər**: müştəri 360° kartı, usta detalı, sənəd/ixtisas yoxlaması, ştat lisenziyaları, əməkdaşlıqlar, istifadəçi dəvəti və rol × əməliyyat × əhatə matrisi.
- **Kataloq və satış**: məhsul redaktoru (atribut, variant qiymətləri, vahid çevirmələri, uyğunluq), CSV uyğunluq importu, satış sifarişi, kommersiya təklifinə qiymət.
- **Maliyyə və təşkilat**: abunə planı və entitlement redaktoru, maliyyə icmalı, kassa təhvili, usta hesablaşmaları, ayarlar, brend önizləməsi, inteqrasiyalar, hesabatlar və KPI.

#### Anbar

- **Mal qəbulu**: qaimə siyahısı, redaktor və detal səhifəsi — barkod/SKU skaneri (təkrar skan miqdarı artırır), alış sifarişindən avtomatik doldurma, siyahıdan (Excel) yapışdırma, qəbul zamanı yeni məhsul yaratma, zona, partiya (LOT), son istifadə tarixi, seriya nömrələri, qaimə şəkli/PDF.
- Qaralama → təsdiq (RECEIPT hərəkətləri, orta maya dəyəri, alış sifarişinin yenilənməsi) → əks hərəkət; sayım bloku olan anbarda təsdiq qadağandır.
- Qalıqlar, stok hərəkətləri, transferlər, inventarizasiya, alışlar və maya dəyəri metodu.

#### Məhsullar

- **Yeni məhsul səhifəsi**: SKU təklifi, EAN-13 barkod generatoru, seqment qiymətləri, çoxlu şəkil və ilkin anbar qalığı (marja göstəricisi ilə).
- **Məhsul şəkilləri**: brauzerdə sıxma, sürükləyib sıralama, əsas şəkil, alternativ mətn (AZ/RU/EN), silmə; vitrin, səbət və sifarişlərdə yüklənmiş şəkil göstərilir.
- Kataloq: 127 məhsul, 63 kateqoriya, 40 brend və 213 SKU variantı.

#### Profil

- Bütün rollar üçün şəkil yükləmə və kəsmə, doluluq göstəricisi, cins, şəhər, vəzifə, üstün tutulan əlaqə kanalı, marketinq razılığı və son fəaliyyət.
- Usta, B2B və kuryer üçün profil səhifələri; avatar panel başlığında, sayt menyusunda, ustalar siyahısında və CRM-də.
- **B2B şirkət profili**: loqo, əlaqə şəxsi, veb sayt, bank rekvizitləri (IBAN yoxlaması), hüquqi məlumatlar; redaktə yalnız sahib/mühasib üçün.

#### Naviqasiya

- Panel başlığında breadcrumb, `Ctrl+K` sürətli keçid palitrası, istifadəçi menyusu (profil, rejim dəyişmə, sayt/CRM keçidi, çıxış).
- Planşetdə ikon zolağı, yığıla bilən menyu, uzun admin menyusunda akkordeon qruplar və menyu axtarışı; sayt başlığında rola uyğun istifadəçi menyusu.
- **Platforma xəritəsi** (`/demo`): bütün modullar və bir kliklə uyğun demo hesabı ilə giriş.

#### Mock API və infrastruktur

- Yeni endpoint-lər: `/admin/goods-receipts`, `/admin/variants/search`, `/admin/products/:id/media`, `/account/avatar`, `/account/activity`, `/b2b/company`; 20 inteqrasiya testi.
- Development rejimində Mock API web/admin ilə avtomatik qaldırılır, izlənilir və kod dəyişikliklərində yenidən başladılır (`MOCK_AUTOSTART=0` ilə söndürülür).
- Bütün yeni mətnlər üçün AZ / RU / EN tərcümələr; i18n yoxlama skripti qısa köməkçi funksiyaları da tanıyır.

### Dəyişdirildi (Changed)

- Müştəri servis sifarişi detalı: növbəti addım bloku, qısa xülasə və bölmələr (gedişat, smeta, ödəniş, məlumatlar, sənədlər).
- Əməliyyat düymələri: əsas 2–3 əməliyyat görünür, qalanları “Daha çox” menyusundadır.
- Anbar qalıqları səhifəsində əsas əməliyyat “Yeni mal qəbulu”dur; məhsul yaratma dialoq əvəzinə tam səhifədir.
- 4 sütunlu şəbəkələr 3+1 kimi qırılmır; mock paneli sağ-aşağıya keçdi.

### Düzəlişlər (Fixed)

- Mock API dayananda səhifələrdə “Məlumat yüklənmədi” xətası: əlaqə kəsiləndə üst zolaq göstərilir, bərpa olunanda məlumatlar özü yenilənir.
- 404/403 xətalarında “Geri” düyməsi; kuryer siyahısına səhifə başlığı; boş səbətlə checkout.
- Barkod skaneri tez yazanda köhnə axtarış nəticəsinin seçilməsi.

## [v0.2.0] - 2026-09-14

### Əlavə edildi (Added)

- **Çoxrollu Portallar**: Müştəri Şəxsi Kabineti (`/account`), Usta Paneli (`/technician`), Kuryer İdarəetməsi (`/courier`), B2B Korporativ Kabinet (`/b2b`) və Admin/CRM idarəetməsi (`/admin`).
- **Resurs və CRUD Mühərriki**: Deklarativ `ResourcePage`, `ResourceGrid`, dinamik `FieldInput` (AZN, i18n çoxdillilik, multi-seçim), `RowOps` əməliyyat keçidləri və audit tarixçəsi.
- **Əməliyyat Axınları**: Smeta razılaşdırması/imtinası, usta təmir mərhələləri, ehtiyat hissəsi tələbləri, kuryer statusları və dispetçer təyinatı.
- **Autentifikasiya və Təhlükəsizlik**: Telefon OTP daxilolma və yoxlanış, qeydiyyat və şifrə bərpası formaları, rol əsaslı route guard-lar.
- **Çoxdilli Lokalizasiya**: Bütün səhifələr, bildirişlər və enum etiketləri üçün tam AZ / RU / EN dəstəyi.
- **HTTP Mock API**: 100+ endpoint, real Azərbaycan servis kontekstində seed dataları və istifadəçi təcridi.

### Düzəlişlər (Fixed)

- Admin CRUD sahələrində və `useOptions` seçim utilitində TypeScript tip xətaları aradan qaldırıldı.

---

## [v0.1.0-demo.1] - 2026-09-13

- PRD əsasında frontend təqdimatının və mock API-nin ilkin tətbiqi.
- Responsive public sayt, xidmət və məhsul kataloqu, AZ / RU / EN interfeysi.
- Demo giriş, servis sifarişi, səbət və nağd checkout axınları.
- Müştəri kabineti və CRM sifariş icmalı.
- Repo töhfə qaydaları, issue / PR şablonları, CI və release qaydaları.
