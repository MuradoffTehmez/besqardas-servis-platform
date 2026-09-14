# Dəyişiklik tarixçəsi

## [Unreleased]

### Əlavə edildi (Added)
- **CRM/ERP admin paneli (PRD §61)**: `apps/admin` üçün bütün route-lar — dashboard, servis sifarişləri və operator sifarişi, dispetçer lövhəsi, həftəlik cədvəl, logistika, zəmanət iddiaları.
- **Workflow şablon redaktoru**: mərhələ əlavə/sıralama/kopyalama, başlama şərtləri, tamamlama tələbləri, SLA, yoxlama və versiyalı saxlama.
- **İstifadəçilər**: müştəri 360° kartı, usta detalı, sənəd/ixtisas yoxlaması, ştat lisenziyaları, əməkdaşlıqlar, istifadəçi dəvəti və rol × əməliyyat × əhatə matrisi.
- **Kataloq, satış, anbar**: məhsul redaktoru (atribut, variant qiymətləri, vahid çevirmələri, uyğunluq), CSV uyğunluq importu, satış sifarişi, kommersiya təklifinə qiymət, qalıqlar, stok hərəkətləri, transfer və mal qəbulu, inventarizasiya, alışlar, maya dəyəri metodu.
- **Maliyyə və təşkilat**: abunə planı və entitlement redaktoru, maliyyə icmalı, kassa təhvili, usta hesablaşmaları, ayarlar, brend önizləməsi, inteqrasiyalar, hesabatlar və KPI.
- Admin mətnləri üçün AZ / RU / EN tərcümələr; i18n yoxlama skripti qısa köməkçi funksiyaları da tanıyır.

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
