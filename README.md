# besqardasServis.az — Servis İdarəetmə Platforması

> Phase 1 — Frontend. İşçi ad (`besqardasServis.az`) müvəqqətidir, yekun brend deyil (PRD §56.3).

Texniki servis, məhsul və ehtiyat hissəsi satışı, anbar, ustalar, müştəri cihazları və maliyyəni vahid sistemdə birləşdirən platformanın frontend hissəsi. Tələblər: [docs/PRD.md](docs/PRD.md).

**Cari status:** frontend demo namizədi. Bütün PRD/MVP modulları tamamlanmayıb. [Demo əhatəsi və təqdimat ssenarisi](docs/DEMO.md), [töhfə qaydaları](CONTRIBUTING.md), [release prosesi](docs/RELEASING.md), [dəyişikliklər](CHANGELOG.md), [təhlükəsizlik](SECURITY.md).

## Struktur (PRD §67)

```
apps/
  web/        Public sayt, müştəri kabineti, usta paneli, kuryer, B2B panelləri  → http://localhost:3000
  admin/      CRM / ERP paneli (daxili əməkdaşlar)                             → http://localhost:3001
packages/
  ui/         Design system və domen komponentləri
  schemas/    Zod sxemləri — API müqaviləsi (contract-first)
  types/      Sxemlərdən törəyən tiplər
  api-client/ Fetch client və TanStack Query hook-ları
  mocks/      MSW handler-ləri, mock data, state machine-lər, mock server   → http://localhost:4000
  i18n/       AZ / RU / EN tərcümələr və format utilitləri
  config/     TypeScript konfiqurasiyaları
  utils/      Ümumi köməkçi funksiyalar (axtarış normallaşdırması, maskalar)
docs/         PRD
```

## İşə salma

```bash
npx pnpm@10 install
npx pnpm@10 dev
```

`dev` üç prosesi paralel qaldırır: mock API (`:4000`), web (`:3000`), admin (`:3001`).
Hər iki tətbiq `/api/*` sorğularını mock serverə yönləndirir; mock server eyni MSW handler-lərini `getResponse` ilə icra edir (PRD §65.4 — SSR üçün ayrıca mock server).

## Demo hesablar

OTP və 2FA kodu həmişə `123456`, şifrə `Demo1234!`.

| Rol | Giriş |
|---|---|
| Müştəri (Premium) | `aysel@demo.az` və ya `+994501112233` |
| Müştəri (Basic) | `rashad@demo.az` |
| Müstəqil usta (Pro) | `elvin@demo.az` |
| STAFF usta | `kamran@demo.az` |
| Usta + müştəri (rejim seçimi) | `nicat@demo.az` |
| Kuryer | `+994553334455` |
| Korporativ | `corporate@demo.az` |
| Partner | `partner@demo.az` |
| Topdan | `wholesale@demo.az` |
| Operator / Dispetçer / Anbar / Satış / Mühasib / Menecer / Admin / Super Admin | `operator@demo.az`, `dispatcher@demo.az`, `warehouse@demo.az`, `sales@demo.az`, `accountant@demo.az`, `manager@demo.az`, `admin@demo.az`, `superadmin@demo.az` |

## Əsas prinsiplər

- Frontend biznes hesablaması aparmır — qiymət, endirim, ƏDV, stok, slotlar, `availableActions`, `entitlements` API-dən gəlir (§64).
- Bütün data MSW handler-ləri vasitəsilə API sorğuları ilə gəlir; dummy JSON birbaşa import edilmir (§65.3).
- Mock layer gecikmə, xəta və boş halları simulyasiya edir (tətbiqlərdəki "Mock" panelindən).
- Əsas demo UI mətnləri AZ (default), RU, EN dillərindədir. Tam domen lokalizasiyası və SEO ayrıca qəbul işidir (§62).
