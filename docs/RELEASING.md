# Release qaydası

## Versiyalar

- `v0.1.0-demo.1`: ilk frontend təqdimat namizədi (prerelease).
- `v0.1.0-demo.2` və davamı: təqdimat düzəlişləri.
- `v0.1.0`: yalnız razılaşdırılmış MVP qəbul meyarları tamamlandıqdan sonra.

## Buraxılış addımları

1. Release-ə daxil olan issue və PR-ları yoxlayın.
2. `pnpm check`, `pnpm test:e2e` və `pnpm test:visual` yoxlamalarını tamamlayın; CI, Lighthouse, CodeQL və dependency review statuslarını yoxlayın. Əl ilə yoxlama [brauzer qəbul protokolu](ACCEPTANCE.md) üzrə aparılır.
3. `CHANGELOG.md` və `docs/DEMO.md` daxilində real əhatəni yeniləyin.
4. GitHub-da konkret commit SHA üzərindən draft release yaradın. Demo versiyasında prerelease işarəsini saxlayın.
5. Release qeydində dəyişikliklər, yoxlamalar, məlum məhdudiyyətlər və demo giriş təlimatını yazın.
6. Review tamamlandıqdan sonra publish edin. Uğursuz və ya hələ yoxlanmamış build üçün draft saxlayın.

## Release qapıları

- lint, TypeScript, i18n, unit/inteqrasiya testləri və production build yaşıl olmalıdır;
- kritik auth, servis, checkout, mobil, SEO və axe E2E ssenariləri keçməlidir;
- high/critical dependency review və açıq CodeQL tapıntısı qalmamalıdır;
- `CHANGELOG.md`, `docs/DEMO.md`, README və təsirlənən Wiki səhifələri faktiki əhatəyə uyğun olmalıdır;
- yeni environment dəyişənləri `.env.example`-da sənədləşdirilməlidir;
- migration, rollback və məlum məhdudiyyətlər release qeydində göstərilməlidir.

Tag-ları force-push etməyin və dərc edilmiş release tarixçəsini yenidən yazmayın. Səhv üçün yeni patch/demo versiyası hazırlayın.
