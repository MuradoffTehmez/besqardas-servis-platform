# Brauzer qəbul protokolu

Demo buraxılışı istifadəçiyə təqdim edilməzdən əvvəl bu protokol üzrə yoxlanılır (PRD §68–73, §75). Avtomatlaşdırılmış qapılar əvvəl keçməlidir; əl ilə yoxlama avtomatik testlərin əhatə etmədiyi vizual və davranış detallarını tutur.

## 1. Avtomatlaşdırılmış qapılar

| Qapı | Komanda | Keçmə şərti |
| --- | --- | --- |
| Lint, TypeScript, i18n, unit, build | `pnpm check` | Hamısı yaşıl |
| Kritik E2E, SEO, axe, Core Web Vitals | `pnpm test:e2e` | Bütün ssenarilər keçir |
| Vizual reqressiya (desktop + mobil) | `pnpm test:visual` | Etalondan fərq ≤ 1% |
| Lighthouse | `pnpm build`, serverlər, `pnpm perf:lighthouse` | Əlçatanlıq və SEO ≥ 0.9, CLS ≤ 0.1; performans ≥ 0.7 (xəbərdarlıq) |
| Komponent kataloqu | `pnpm build-storybook` | Build uğurlu, bütün story-lər render olunur |

CI-da `CI` workflow-u hər PR-da, `Lighthouse` workflow-u main-ə push, həftəlik və əl ilə işləyir.

### E2E əhatəsi

- Giriş (e-poçt/şifrə, telefon + OTP, 2FA), rol əsaslı yönləndirmə və `next` ilə geri qayıdış
- Qonaq → servis sifarişi (5 addım) → smetanın kabinetdən təsdiqi
- Usta: təklifi qəbul → yola çıxma → gəliş → checklist və foto ilə icra → imza və ödənişlə təhvil → sifariş tamamlanır
- Kataloq → səbət → kartla ödəniş → sifariş kabinetdə
- Klaviatura: Esc dialoqu bağlayır, fokus çağıran düyməyə qayıdır
- SEO: SSR məzmunu, canonical, `hreflang`, JSON-LD, sitemap, robots, noindex, 404
- Əlçatanlıq: public və kabinet səhifələrində axe WCAG 2.2 AA kritik pozuntu yoxdur
- Core Web Vitals: LCP ≤ 2.5 s və TTFB ≤ 800 ms (CI production), CLS ≤ 0.1 (hər yerdə)
- Mobil: üfüqi sürüşmə yoxdur, mobil menyu, kuryer və usta interfeysi

### Vizual etalonlar

Şrift render-i əməliyyat sistemindən asılıdır, ona görə etalonlar platformaya görə saxlanılır: `e2e/__screenshots__/<layihə>/<ad>-<platforma>.png`. Hazırda Windows (`win32`) etalonları repodadır. Linux etalonu lazım olduqda Playwright Docker imicində `pnpm test:visual --update-snapshots` işlədilir və nəticə PR ilə commit olunur. Qəsdən edilən dizayn dəyişikliyindən sonra etalon eyni qayda ilə yenilənir və PR-da əvvəl/sonra görüntüləri göstərilir.

## 2. Brauzer və cihaz matrisi

| Mühit | Ölçü | Minimum yoxlama |
| --- | --- | --- |
| Chrome (Windows/macOS), son versiya | 1440×900 | Tam ssenari (bölmə 3) |
| Edge, son versiya | 1366×768 | Public sayt, giriş, checkout |
| Firefox, son versiya | 1440×900 | Public sayt, kabinet, dil dəyişmə |
| Safari (macOS) | 1440×900 | Public sayt, giriş, məhsul detalı |
| Safari (iOS) / Chrome (Android) | 390×844 | Mobil menyu, giriş, sifariş, usta və kuryer paneli |
| Planşet | 768×1024 | Kabinet bölmə zolağı, cədvəllərin sürüşməsi |

## 3. Əl ilə qəbul ssenarisi

Hər addım üçün nəticə **Keçdi / Keçmədi / Qeyd** kimi yazılır; "Keçmədi" üçün issue açılır.

**Public sayt**
1. Ana səhifə, xidmətlər, mağaza, məhsul detalı, ustalar, planlar, filiallar, FAQ, əlaqə açılır; header və footer bütün səhifələrdə eynidir.
2. Dil seçimi bayraqlarla işləyir (AZ/RU/EN); URL prefiksi və mətnlər dəyişir, səhifə yerində qalır.
3. Məhsul detalında nağd/kredit seçimi, ay seçildikdə aylıq ödəniş və fərq göstərilir.
4. Zəmanət yoxlaması etibarlı və etibarsız kodla fərqli nəticə kartı verir.

**Autentifikasiya**
5. Giriş və qeydiyyat sayt qabığında açılır; header-də "Daxil ol" düyməsi görünmür.
6. Telefon + OTP (`123456`) və e-poçt + şifrə (`Demo1234!`) ilə giriş; superadmin üçün 2FA.
7. Yanlış şifrə lokallaşdırılmış xəta göstərir; şifrə bərpası axını sona qədər gedir.

**Kabinetlər**
8. Müştəri: servis sifarişi yarat, smetanı təsdiqlə, cihaz və zəmanətlərə bax, bildirişlər ikon və rənglə qruplanır.
9. Usta: dashboard, təklifi qəbul et, işi təhvilə qədər apar, qazanc səhifəsi.
10. B2B (korporativ, partnyor, topdan): dashboard, kredit limiti, sifarişlər, sənədlər.
11. Kuryer: tapşırıqlar telefonda böyük düymələrlə, marşrut və zəng keçidləri.
12. Daxil olmuş istifadəçidə header-də bildiriş zəngi və oxunmamış sayı görünür, siyahı açılır.

**Admin (CRM)**
13. Rol əsaslı menyu: operator, anbar, maliyyə hesabları yalnız icazəli bölmələri görür; icazəsiz URL panel daxilində 403 verir.
14. Dashboard KPI-ları, sifariş siyahısı, dispetçer, anbar qəbulu.

**Keyfiyyət**
15. Klaviatura ilə naviqasiya: görünən fokus, dialoqlarda Esc və fokus qayıdışı, skip-link.
16. 200% zoom-da məzmun kəsilmir; mobil ölçüdə üfüqi sürüşmə yoxdur.
17. Şəbəkəni "Slow 4G" edib ana səhifə və məhsul detalını açın: məzmun skeleton-suz görünür, layout sürüşmür.
18. Mock paneldən gecikmə və xəta rejimi: yüklənmə, boş və xəta halları düzgün göstərilir.

## 4. Nəticənin qeydə alınması

Release qeydində test olunan commit SHA, brauzer matrisi, avtomatik qapıların nəticəsi, Lighthouse balları və açıq qalan tapıntılar göstərilir (bax [RELEASING.md](RELEASING.md)).
