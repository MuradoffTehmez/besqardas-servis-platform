# Layihəyə töhfə

Əvvəl [PRD](docs/PRD.md) və [demo əhatəsini](docs/DEMO.md) oxuyun.

## İş axını

1. Konkret iş üçün issue açın, PRD bölməsini və qəbul meyarlarını yazın.
2. `main`-dən `feat/`, `fix/` və ya `chore/` prefiksli branch yaradın.
3. Bir məntiqli dəyişiklik üçün bir commit yazın: `feat(web): ...`, `fix(mocks): ...`.
4. Typecheck, test və build yoxlamalarını icra edin.
5. PR açın, bağlı issue-ları və yoxlama nəticələrini qeyd edin. Natamam iş draft qalır.
6. Review və CI uğurlu olduqdan sonra merge edin.

## Lokal mühit

Node.js 22 və `package.json`-dakı pnpm versiyasından istifadə edin.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm build
```

Pul, stok, qiymət və icazə hesablamaları mock/backend qatında qalır. UI data üçün HTTP API istifadə edir. Müştəri məlumatları, tokenlər və `.env` faylları commit edilmir. Demo məlumatlarını real biznes məlumatları kimi təqdim etməyin.

Kodun açıq repoda olması lisenziya vermir. Açıq mənbə lisenziyası məhsul sahibi tərəfindən ayrıca müəyyən ediləcək.
