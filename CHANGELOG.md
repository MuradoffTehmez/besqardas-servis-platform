# Dəyişiklik tarixçəsi

## [Unreleased]

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
