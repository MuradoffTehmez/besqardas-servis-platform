# Təhlükəsizlik siyasəti

## Dəstəklənən versiyalar

| Versiya            | Status                                       |
| ------------------ | -------------------------------------------- |
| `0.3.x`            | Cari frontend demo; yalnız kritik düzəlişlər |
| `< 0.3`            | Dəstəklənmir                                 |
| Production backend | Bu repository-də mövcud deyil                |

Bu kod bazası Phase 1 frontend demo-dur. Mock API real autentifikasiya, məlumat davamlılığı və production təhlükəsizlik sərhədi təmin etmir.

## Boşluğun məxfi bildirilməsi

Təhlükəsizlik boşluğunu, şəxsi məlumatı, tokeni və ya exploit detalını public issue, discussion və pull request-də paylaşmayın.

1. Repository-nin [Private vulnerability reporting](https://github.com/MuradoffTehmez/besqardas-servis-platform/security/advisories/new) formasından istifadə edin.
2. Forma əlçatan deyilsə, [repository sahibinin GitHub profili](https://github.com/MuradoffTehmez) üzərindən məxfi əlaqə kanalı istəyin; ilkin public mesajda texniki detal verməyin.
3. Hesabatda təsirlənən commit/tag, komponent, təkrar yaratma addımları, gözlənilən təsir və mümkün mitigation əlavə edin.
4. Test üçün yalnız sintetik məlumatdan istifadə edin.

Qəbul təsdiqi və düzəliş müddəti riskin şiddətindən və layihənin demo statusundan asılıdır. Təsdiqlənmiş boşluq üçün koordinasiyalı açıqlama vaxtı reporter ilə razılaşdırılır.

## Əhatə

Aşağıdakılar təhlükəsizlik hesabatıdır:

- autentifikasiya və sessiya bypass-ı;
- RBAC və tenant izolyasiyası pozuntusu;
- XSS, CSRF, injection, SSRF və path traversal;
- həssas məlumatın log, UI, bundle və ya API cavabında sızması;
- ödəniş/idempotency manipulyasiyası;
- dependency və CI supply-chain riski;
- webhook imza yoxlaması və replay problemi.

Demo credential-larının açıq olması, məlumatın restart zamanı sıfırlanması və real provider-lərin olmaması məlum Phase 1 xüsusiyyətləridir; ayrıca boşluq sayılmır.

## Production üçün məcburi nəzarətlər

Production buraxılışından əvvəl ən azı bunlar ayrıca təsdiqlənməlidir:

- server-side auth, təhlükəsiz cookie/session və MFA;
- hər endpoint-də RBAC, tenant scoping və audit;
- rate limiting, brute-force müdafiəsi və təhlükəsiz error cavabları;
- secret manager, rotasiya və least-privilege credential-lar;
- TLS, təhlükəsizlik header-ləri və CSP;
- webhook imzası, timestamp/replay yoxlaması və idempotency;
- database migration, backup, restore və retention siyasəti;
- dependency, secret və code scanning;
- incident response, observability və təhlükəsizlik testləri.

## Safe harbor

Yalnız sizə aid hesablar və sintetik demo məlumatları ilə, xidmətin əlçatanlığına və digər istifadəçilərə zərər vermədən araşdırma aparın. Məlumatı dəyişdirməyin, çıxarmayın, davamlı giriş yaratmayın və üçüncü tərəf sistemlərini hədəf almayın.
