# Dəyişiklik tarixçəsi

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
