# Yol xəritəsi — platformanın 100%-ə çatdırılması

**Tarix:** 16 sentyabr 2026 · **Baza versiya:** `0.3.3`

Bu sənəd 35 modulluq qiymətləndirmədəki boşluqların hansı ardıcıllıqla bağlanacağını təsvir edir. Qərar: **əvvəl Phase 1 (Zod müqaviləsi + MSW mock backend + UI) 100%-ə çatdırılır, sonra PRD Əlavə A üzrə real backend qurulur.** Hər modul ayrıca `feat/<modul>` branch-i və PR ilə gəlir.

## Başlanğıc vəziyyət

| Göstərici | Phase 1 (UI/Mock) | Full Production |
| --- | ---: | ---: |
| Ümumi | ~70% | ~32% |
| VAR / QİSMƏN / YOXDUR | 22 / 11 / 2 | — |

## Modulun "hazır" sayılma meyarı (Phase 1)

1. `packages/schemas` — Zod müqaviləsi və `packages/types` tipləri.
2. `packages/mocks` — in-memory kolleksiya, realist seed (AZ/RU/EN), handler-lər, `availableActions`, RBAC (`resurs:əməliyyat`), audit və bildiriş yan təsirləri.
3. `packages/ui` — admin və/və ya portal ekranları, rol əsaslı menyu, boş/xəta/yüklənmə halları, mobil görünüş.
4. `packages/i18n` — bütün mətnlər üç dildə.
5. Testlər — handler inteqrasiya testləri (`vitest`), kritik axın üçün Playwright ssenarisi.
6. `pnpm check` yaşıl, PR CI yaşıl.

## Mərhələ A — Phase 1 boşluqları

| # | Modul | İndi | Əhatə |
| ---: | --- | ---: | --- |
| A1 | **Help Desk** ✅ | 20% → 90% | Bilet növbəsi, kateqoriyalar, prioritet və SLA (ilk cavab / həll), təyinat, daxili qeydlər, hazır cavablar, müştəri kabinetindən müraciət, sifariş/zəmanətə bağlama, biletdən servis sifarişi, məmnunluq (CSAT) |
| A2 | Loyalty / Referral | 40% | Xal hesabı və qaydalar, keşbek pul kisəsi, səviyyələr, referral kodları, checkout-da xal istifadəsi |
| A3 | CRM satış qıfı | 85% | Lead-lər, pipeline mərhələləri (kanban), fəaliyyətlər, lead → müştəri/təklif çevrilməsi, zəng jurnalı (telefoniya adapteri) |
| A4 | HRM | 30% | Ştat cədvəli, növbələr, davamiyyət, məzuniyyət/xəstəlik müraciətləri və təsdiqi, əmək haqqı hesablanması (AZ vergi/DSMF/işsizlik/icbari tibbi sığorta) |
| A5 | Mühasibat (GL) | 40% / 65% | Hesablar planı, ikili yazılış jurnalı, sənədlərdən avtomatik provodka, dövr bağlanması, sınaq balansı, mənfəət-zərər, balans, e-qaimə export adapteri |
| A6 | DMS | 45% | Sənəd reyestri, versiyalar, təsdiq marşrutları, imza adapteri (Asan İmza), saxlanma müddəti |
| A7 | Retail POS | 25% | Kassir ekranı (sensor), barkod, növbə açma/bağlama, X/Z hesabat, qaytarma, e-kassa adapteri |
| A8 | SCM / Satınalma / Təchizatçı | 35% / 70% / 75% | Tələbat planlaması (min/max, yenidən sifariş nöqtəsi), RFQ/tender, təklif müqayisəsi, təchizatçı reytinqi, müqavilələr |
| A9 | WMS | 80% | Rəf/hücrə (bin) strukturu, yerləşdirmə, yığma siyahısı və marşrutu, dalğa (wave) yığımı |
| A10 | BI + Forecasting | 50% / 0% | Hesabat konstruktoru, saxlanılan panellər, tələbat/qalıq/gəlir proqnozu (mövsümi model) |
| A11 | AI Automation | 0% | Ağıllı təyinat skoru, bilet təsnifatı, anomaliya aşkarlanması, LLM köməkçi adapteri (provayder söndürülə bilən) |
| A12 | Mövcud modulların tamamlanması | 70–85% | SLA eskalasiya mühərriki, GPS izləmə simulyasiyası, offline rejim (PWA), təkrarlanan ödəniş simulyasiyası, bildiriş kanal marşrutlaşdırması |

## Mərhələ B — Real backend (PRD Əlavə A)

NestJS + PostgreSQL + Prisma + Redis + Docker Compose; eyni Zod müqavilələri üzərində modul-modul implementasiya, mock layer isə mərhələli söndürülür. Detal plan Mərhələ A bitəndə ayrıca sənəddə təsdiqlənir.

## Yalnız kodla bağlanmayan asılılıqlar

Bunlar üçün adapter və sandbox rejimi hazırlanır, amma istehsalata çıxış sahibkar tərəfindən təmin olunmalıdır:

- Ödəniş şlüzü müqaviləsi və açarları (Kapital Bank / PAŞA Bank / Payriff / Epoint)
- E-kassa (NKA) və e-taxes.gov.az e-qaimə qoşulması
- SMS / e-poçt / WhatsApp provayder hesabları
- Asan İmza inteqrasiya icazəsi
- Hosting, domen, TLS, monitorinq və hüquqi mətnlərin təsdiqi
