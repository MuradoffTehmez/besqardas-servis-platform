# Layihəyə töhfə qaydaları

Töhfələr kiçik, yoxlanıla bilən və PRD ilə izlənə bilən olmalıdır. Dəyişiklik etməzdən əvvəl [PRD](docs/PRD.md), [demo əhatəsi](docs/DEMO.md) və [layihə auditi](docs/PROJECT_AUDIT.md) ilə tanış olun.

## Başlamazdan əvvəl

1. Mövcud issue və pull request-lərdə eyni işin aparılmadığını yoxlayın.
2. Bug, funksiya və ya sənədləşmə şablonu ilə issue açın.
3. Məqsədi, əhatəni, PRD bölməsini və yoxlanıla bilən qəbul meyarlarını qeyd edin.
4. Təhlükəsizlik boşluğunu public issue-da paylaşmayın; [SECURITY.md](SECURITY.md) istifadə edin.

## Lokal mühit

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Node.js versiyası `.nvmrc`, pnpm versiyası isə `package.json#packageManager` ilə müəyyən edilir.

E2E üçün Chromium quraşdırın:

```bash
pnpm exec playwright install --with-deps chromium
```

## Branch və commit qaydası

`main`-dən qısaömürlü branch yaradın:

- `feat/<mövzu>` — yeni funksiya;
- `fix/<mövzu>` — xəta düzəlişi;
- `docs/<mövzu>` — yalnız sənədləşmə;
- `test/<mövzu>` — test əhatəsi;
- `refactor/<mövzu>` — davranışı dəyişməyən refaktor;
- `chore/<mövzu>` — alətlər, CI və texniki xidmət.

Commit başlıqları Conventional Commits üslubundadır:

```text
feat(web): servis müqayisəsini əlavə et
fix(mocks): idempotent checkout cavabını sabitlə
docs(wiki): route kataloqunu yenilə
```

Bir commit bir məntiqli dəyişiklik daşımalıdır. Generasiya edilmiş faylları və şəxsi IDE konfiqurasiyasını commit etməyin.

## Kod qaydaları

- TypeScript strict sərhədlərini və mövcud paket məsuliyyətlərini qoruyun.
- API payload-larını `packages/schemas` daxilində Zod ilə müəyyən edin; tipləri `packages/types` vasitəsilə paylaşın.
- UI-dan seed/mock data-nı birbaşa import etməyin; data HTTP API-dən gəlməlidir.
- Qiymət, ƏDV, endirim, stok, slot, RBAC və entitlement biznes məntiqini UI-a köçürməyin.
- Yeni istifadəçi mətnini AZ/RU/EN fayllarına əlavə edin və i18n yoxlamasını işə salın.
- İnteraktiv elementlər klaviatura ilə işləməli, fokus görünməli və uyğun accessible name daşımalıdır.
- Gizli açar, token, real müştəri məlumatı və production credential commit etməyin.

## Test tələbləri

Göndərməzdən əvvəl ən azı:

```bash
pnpm check
```

UI, route, auth, checkout, servis workflow-u, mobil davranış və ya əlçatanlıq dəyişibsə:

```bash
pnpm test:e2e
```

Windows-da lokal Chrome ilə:

```powershell
$env:PW_CHANNEL = "chrome"
pnpm test:e2e
```

Yeni davranış üçün uyğun test əlavə edin. Flaky testi sadəcə retry ilə gizlətməyin; səbəbi deterministik vəziyyət, timeout və ya test datası səviyyəsində aradan qaldırın.

## Pull request checklist-i

- Dəyişiklik bir problemə fokuslanır.
- Bağlı issue və PRD bölməsi göstərilib.
- İstifadəçi davranışı və texniki yanaşma izah edilib.
- Risk, rollback və məlum məhdudiyyətlər yazılıb.
- Lint, typecheck, i18n, test və build nəticələri qeyd edilib.
- UI dəyişikliyində desktop/mobil görüntü və a11y yoxlanılıb.
- API müqaviləsi dəyişibsə schema, mock, client və sənədlər birlikdə yenilənib.
- Yeni route və ya rol dəyişibsə demo xəritəsi, README/Wiki və testlər yenilənib.
- Breaking dəyişiklik və istifadəçi görünən yenilik `CHANGELOG.md`-ə əlavə edilib.

Draft PR natamam iş üçün uyğundur. CI yaşıl və review tamamlanmadan merge etməyin.

## Review prioritetləri

Review aşağıdakı sıra ilə aparılır:

1. təhlükəsizlik və məlumat izolyasiyası;
2. correctness və edge case-lər;
3. API müqaviləsi və geriyə uyğunluq;
4. əlçatanlıq, lokalizasiya və responsive davranış;
5. performans və maintainability;
6. sənədlərin aktuallığı.

## Release

Versiya və release prosesi [docs/RELEASING.md](docs/RELEASING.md)-dədir. Tag-ları force-push etməyin və dərc edilmiş release tarixçəsini yenidən yazmayın.

## Lisenziya

Repository üçün açıq mənbə lisenziyası təsdiqlənməyib. Töhfə göndərmək kodun ayrıca istifadə və yayılma hüququ verdiyi anlamına gəlmir.
