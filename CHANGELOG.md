# Dəyişiklik tarixçəsi

## [Unreleased]

### Əlavə edildi (Added)
- **Mal qəbulu (anbara məhsul əlavə etmə)**: qaimə siyahısı, redaktor və detal səhifəsi — barkod/SKU skaneri (təkrar skan miqdarı artırır), alış sifarişindən avtomatik doldurma, siyahıdan (Excel) yapışdırma, qəbul zamanı yeni məhsul yaratma, zona, partiya (LOT), son istifadə tarixi, seriya nömrələri, qaimə şəkli/PDF, qaralama → təsdiq → əks hərəkət; sayım bloku olan anbarda təsdiq qadağandır.
- **Yeni məhsul səhifəsi**: əsas məlumat, SKU təklifi və EAN-13 barkod generatoru, seqment qiymətləri, çoxlu şəkil yükləmə və ilkin anbar qalığı (marja göstəricisi ilə).
- **Məhsul şəkilləri**: brauzerdə sıxma, sürükləyib sıralama, əsas şəkil, alternativ mətn (AZ/RU/EN), silmə; vitrin və sifarişlərdə yüklənmiş şəkil göstərilir.
- **Profil**: şəkil yükləmə və kəsmə, doluluq göstəricisi, cins, şəhər, vəzifə, üstün tutulan əlaqə kanalı, marketinq razılığı, son fəaliyyət; usta, B2B və kuryer üçün də profil səhifəsi. Avatar panel başlığında, sayt menyusunda, ustalar siyahısında və CRM-də görünür.
- **Şirkət profili (B2B)**: loqo, əlaqə şəxsi, veb sayt, bank rekvizitləri (IBAN yoxlaması), hüquqi məlumatlar; redaktə yalnız sahib/mühasib üçün.
- Mock API: `/admin/goods-receipts`, `/admin/variants/search`, `/admin/products/:id/media`, `/account/avatar`, `/account/activity`, `/b2b/company` və 6 yeni inteqrasiya testi.
- **CRM/ERP admin paneli (PRD §61)**: `apps/admin` üçün bütün route-lar — dashboard, servis sifarişləri və operator sifarişi, dispetçer lövhəsi, həftəlik cədvəl, logistika, zəmanət iddiaları.
- **Workflow şablon redaktoru**: mərhələ əlavə/sıralama/kopyalama, başlama şərtləri, tamamlama tələbləri, SLA, yoxlama və versiyalı saxlama.
- **İstifadəçilər**: müştəri 360° kartı, usta detalı, sənəd/ixtisas yoxlaması, ştat lisenziyaları, əməkdaşlıqlar, istifadəçi dəvəti və rol × əməliyyat × əhatə matrisi.
- **Kataloq, satış, anbar**: məhsul redaktoru (atribut, variant qiymətləri, vahid çevirmələri, uyğunluq), CSV uyğunluq importu, satış sifarişi, kommersiya təklifinə qiymət, qalıqlar, stok hərəkətləri, transfer və mal qəbulu, inventarizasiya, alışlar, maya dəyəri metodu.
- **Maliyyə və təşkilat**: abunə planı və entitlement redaktoru, maliyyə icmalı, kassa təhvili, usta hesablaşmaları, ayarlar, brend önizləməsi, inteqrasiyalar, hesabatlar və KPI.
- Admin mətnləri üçün AZ / RU / EN tərcümələr; i18n yoxlama skripti qısa köməkçi funksiyaları da tanıyır.
- **Naviqasiya**: panel başlığında breadcrumb, `Ctrl+K` sürətli keçid palitrası, istifadəçi menyusu (profil, rejim dəyişmə, sayt/CRM keçidi, çıxış); planşetdə ikon zolağı, yığıla bilən menyu, uzun admin menyusunda akkordeon və menyu axtarışı.
- **Platforma xəritəsi** (`/demo`): bütün modullar, səhifələr və bir kliklə uyğun demo hesabı ilə giriş; footer və giriş səhifəsindən keçid.
- Sayt başlığında rola uyğun istifadəçi menyusu; admin menyusuna yoxlama, lisenziya, əməkdaşlıq və vahid çevirmələri əlavə olundu.
- Kataloq: 127 məhsul, 63 kateqoriya, 40 brend və 213 SKU variantı.

### Dəyişdirildi (Changed)
- Müştəri servis sifarişi detalı: növbəti addım bloku, qısa xülasə və bölmələr (gedişat, smeta, ödəniş, məlumatlar, sənədlər).
- Əməliyyat düymələri: əsas 2–3 əməliyyat görünür, qalanları “Daha çox” menyusundadır.
- 4 sütunlu şəbəkələr 3+1 kimi qırılmır; mock paneli sağ-aşağıya keçdi.

### Düzəlişlər (Fixed)
- Mock API dayananda səhifələrdə “Məlumat yüklənmədi” xətası: dev rejimində mock server avtomatik qaldırılır və izlənilir; əlaqə kəsiləndə üst zolaq göstərilir, bərpa olunanda məlumatlar özü yenilənir.
- 404/403 xətalarında “Geri” düyməsi; kuryer siyahısına səhifə başlığı; boş səbətlə checkout.

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
