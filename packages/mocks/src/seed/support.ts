import type { Role } from "@sp/types";
import { db } from "../db/state";
import type { TicketCategoryRec, TicketRec } from "../db/types";
import { uid } from "../data/people";
import type { Ctx } from "../engine/context";
import { addMessage, openTicket, runAgentAction, runCustomerAction } from "../engine/support";
import { L } from "../lib/i18n";
import { idFor } from "../lib/rng";
import { atTime, hoursFromNow } from "../lib/time";

/** Help Desk: kateqoriyalar, hazır cavablar və müxtəlif SLA vəziyyətlərində müraciətlər. */

const STANDARD: TicketCategoryRec["sla"] = {
  LOW: { firstResponseMinutes: 480, resolutionMinutes: 4320 },
  NORMAL: { firstResponseMinutes: 240, resolutionMinutes: 2880 },
  HIGH: { firstResponseMinutes: 60, resolutionMinutes: 1440 },
  URGENT: { firstResponseMinutes: 30, resolutionMinutes: 480 },
};

const FAST: TicketCategoryRec["sla"] = {
  LOW: { firstResponseMinutes: 240, resolutionMinutes: 2880 },
  NORMAL: { firstResponseMinutes: 120, resolutionMinutes: 1440 },
  HIGH: { firstResponseMinutes: 60, resolutionMinutes: 720 },
  URGENT: { firstResponseMinutes: 15, resolutionMinutes: 240 },
};

const cat = (code: string, order: number, queue: TicketCategoryRec["queue"], defaultPriority: TicketCategoryRec["defaultPriority"], sla: TicketCategoryRec["sla"], name: ReturnType<typeof L>, description: ReturnType<typeof L>, customerVisible = true): TicketCategoryRec => ({
  id: idFor(`ticket-category:${code}`),
  code,
  name,
  description,
  queue,
  defaultPriority,
  sla,
  customerVisible,
  order,
  active: true,
});

/** Seed üçün minimal sorğu konteksti. */
function actor(key: string, role: Role): Ctx {
  const user = db.users.find((u) => u.id === uid(key))!;
  return { locale: "az", session: null, user, role, permissions: ["*"], scopes: {}, plan: null, entitlements: {}, priceType: "RETAIL", company: null, technician: null, guestKey: null };
}

const CATEGORY = (code: string) => idFor(`ticket-category:${code}`);

export function seedSupport() {
  db.ticketCategories = [
    cat("SERVICE_ISSUE", 1, "SERVICE", "NORMAL", FAST, L("Servis sifarişi üzrə problem", "Проблема с сервисным заказом", "Service order issue"), L("Usta gecikməsi, təmir keyfiyyəti, vaxtın dəyişdirilməsi", "Опоздание мастера, качество ремонта, перенос", "Technician delay, repair quality, rescheduling")),
    cat("ORDER_DELIVERY", 2, "SALES", "NORMAL", STANDARD, L("Sifariş və çatdırılma", "Заказ и доставка", "Orders & delivery"), L("Məhsul sifarişinin statusu, çatdırılma, quraşdırma", "Статус заказа, доставка, установка", "Order status, delivery, installation")),
    cat("BILLING", 3, "BILLING", "NORMAL", STANDARD, L("Ödəniş və sənədlər", "Оплата и документы", "Payments & documents"), L("Ödəniş, geri qaytarma, faktura, fiskal çek", "Оплата, возврат, счёт, чек", "Payments, refunds, invoices, receipts")),
    cat("WARRANTY", 4, "WARRANTY", "NORMAL", FAST, L("Zəmanət", "Гарантия", "Warranty"), L("Zəmanət şərtləri və zəmanət təmiri", "Условия и гарантийный ремонт", "Warranty terms and warranty repairs")),
    cat("TECHNICAL_ADVICE", 5, "TECHNICAL", "LOW", STANDARD, L("Texniki məsləhət", "Техническая консультация", "Technical advice"), L("Cihaz seçimi, istifadə qaydaları, xəta kodları", "Выбор техники, эксплуатация, коды ошибок", "Choosing equipment, usage, error codes")),
    cat("ACCOUNT_ACCESS", 6, "GENERAL", "HIGH", STANDARD, L("Hesab və giriş", "Аккаунт и вход", "Account & sign-in"), L("Şifrə, SMS kodu, profil məlumatları", "Пароль, SMS-код, данные профиля", "Password, SMS code, profile data")),
    cat("B2B_SALES", 7, "SALES", "NORMAL", STANDARD, L("Korporativ və partnyor sorğuları", "Корпоративные и партнёрские запросы", "Corporate & partner requests"), L("Müqavilə, komissiya, topdan qiymət", "Договор, комиссия, оптовые цены", "Contracts, commissions, wholesale prices")),
    cat("FEEDBACK", 8, "GENERAL", "LOW", STANDARD, L("Təklif və şikayət", "Предложения и жалобы", "Feedback & complaints"), L("Xidmət haqqında rəyiniz", "Ваш отзыв о сервисе", "Your feedback about the service")),
    cat("GENERAL", 9, "GENERAL", "NORMAL", STANDARD, L("Digər suallar", "Другие вопросы", "Other questions"), L("Filiallar, iş saatları və digər mövzular", "Филиалы, часы работы и другое", "Branches, working hours and more")),
  ];

  const canned = (shortcut: string, title: ReturnType<typeof L>, body: ReturnType<typeof L>, categoryCode: string | null, usageCount: number) =>
    db.cannedResponses.push({ id: idFor(`canned:${shortcut}`), shortcut, title, body, categoryId: categoryCode ? CATEGORY(categoryCode) : null, usageCount, active: true });
  canned("/salam", L("Salamlama"), L("Salam! Müraciətiniz üçün təşəkkür edirik. Məsələni araşdırıram və qısa müddətdə geri dönəcəyəm.", "Здравствуйте! Спасибо за обращение. Я изучаю вопрос и скоро вернусь с ответом.", "Hello! Thank you for reaching out. I'm looking into this and will get back to you shortly."), null, 148);
  canned("/usta-yolda", L("Usta yoldadır"), L("Usta artıq yoldadır, təxminən 30 dəqiqəyə ünvanda olacaq. Kabinetinizdən mərhələləri canlı izləyə bilərsiniz.", "Мастер уже в пути и прибудет примерно через 30 минут. Этапы можно отслеживать в кабинете.", "The technician is on the way and should arrive in about 30 minutes. You can track progress in your account."), "SERVICE_ISSUE", 64);
  canned("/smeta", L("Smeta izahı"), L("Smetada diaqnostika, işçilik və ehtiyat hissələri ayrıca göstərilib. Smetanı qəbul etmədikdə diaqnostika haqqı tutulmur.", "В смете отдельно указаны диагностика, работа и запчасти. При отказе плата за диагностику не взимается.", "The estimate lists diagnostics, labour and parts separately. No diagnostics fee applies if you decline."), "SERVICE_ISSUE", 37);
  canned("/zemanet", L("Zəmanət şərtləri"), L("Zəmanət müddətində eyni nasazlıq pulsuz aradan qaldırılır. Zəmanət talonunu kabinetdə və QR kodla yoxlaya bilərsiniz.", "В гарантийный период та же неисправность устраняется бесплатно. Талон доступен в кабинете и по QR-коду.", "During the warranty period the same fault is fixed free of charge. The warranty card is in your account and verifiable by QR."), "WARRANTY", 29);
  canned("/qaytarma", L("Geri ödəniş müddəti"), L("Geri ödəniş təsdiqləndi. Vəsait bankınızdan asılı olaraq 3–5 iş günü ərzində kartınıza qaytarılacaq.", "Возврат подтверждён. Средства поступят на карту в течение 3–5 рабочих дней.", "The refund is approved. Funds will reach your card within 3–5 business days."), "BILLING", 41);
  canned("/baglama", L("Həll və bağlanma"), L("Məsələ həll olundu. Əlavə sualınız olarsa, bu müraciətə cavab yazmağınız kifayətdir — yenidən açılacaq.", "Вопрос решён. Если появятся вопросы, просто ответьте на это обращение — оно откроется снова.", "This is resolved. If anything else comes up, just reply to this ticket and it will reopen."), null, 112);

  const operator = actor("operator", "OPERATOR");
  const dispatcher = actor("dispatcher", "DISPATCHER");
  const sales = actor("sales", "SALES_EMPLOYEE");
  const accountant = actor("accountant", "ACCOUNTANT");
  const customer = (key: string, role: Role = "CUSTOMER") => actor(key, role);
  const requester = (key: string) => {
    const u = db.users.find((x) => x.id === uid(key))!;
    return { id: u.id, name: `${u.firstName} ${u.lastName}`, phone: u.phone, email: u.email, companyId: u.companyId };
  };
  const at = <T>(hoursAgo: number, fn: () => T) => atTime(hoursFromNow(-hoursAgo), fn);
  const orderOf = (key: string) => db.serviceOrders.find((o) => o.customerId === uid(key));
  const salesOf = (key: string) => db.salesOrders.find((o) => o.customerId === uid(key));
  const make = (hoursAgo: number, input: Omit<Parameters<typeof openTicket>[0], "createdAt">): TicketRec => at(hoursAgo, () => openTicket({ ...input, createdAt: hoursFromNow(-hoursAgo) }, null));

  // 1. Premium müştəri, cavabsız — SLA pozulub
  const aysel = orderOf("aysel");
  make(3, { categoryId: CATEGORY("SERVICE_ISSUE"), subject: "Kondisioner təmirdən sonra yenə su damcılayır", body: "Salam. Dünən usta kondisioneri təmir etdi, amma bu səhər daxili blokdan yenə su damcılamağa başladı. Divar və parket islanır, təcili baxılmasını xahiş edirəm.", channel: "PORTAL", requester: requester("aysel"), related: aysel ? { type: "SERVICE_ORDER", id: aysel.id } : null });

  // 2. İkiqat ödəniş — ilk cavab müddəti bitmək üzrədir
  const rashadPay = db.payments.find((p) => p.payerId === uid("rashad"));
  make(0.8, { categoryId: CATEGORY("BILLING"), subject: "Ödəniş kartımdan iki dəfə çıxılıb", body: "Onlayn ödəniş edərkən səhifə donub qaldı, yenidən ödədim. İndi bank çıxarışında eyni məbləğ iki dəfə görünür. Birini geri qaytarmağınızı xahiş edirəm.", channel: "PORTAL", priority: "HIGH", requester: requester("rashad"), related: rashadPay ? { type: "PAYMENT", id: rashadPay.id } : null });

  // 3. Rus dilli müştəri — müştərinin cavabı gözlənilir (SLA pauzada)
  const gunelSale = salesOf("gunel");
  const t3 = make(26, { categoryId: CATEGORY("ORDER_DELIVERY"), subject: "Когда доставят мой заказ?", body: "Добрый день! Заказ оплачен три дня назад, но статус не меняется. Подскажите, пожалуйста, когда ожидать доставку?", channel: "PORTAL", requester: requester("gunel"), related: gunelSale ? { type: "SALES_ORDER", id: gunelSale.id } : null });
  at(24, () => runAgentAction(t3, sales, { code: "take" }));
  at(23.5, () => addMessage(t3, sales, { body: "Здравствуйте, Гюнель! Заказ собран на складе. Курьер может доставить завтра с 10:00 до 14:00 или с 15:00 до 19:00 — какое окно вам удобнее?", internal: false, statusAfter: "PENDING_CUSTOMER", asCustomer: false }));

  // 4. Zəmanət — müştəri son mesajı yazıb, əməkdaşın cavabı gözlənilir
  const t4 = make(20, { categoryId: CATEGORY("WARRANTY"), subject: "Kombi zəmanət müddətində yenə xəta verir", body: "Kombi 4 ay əvvəl quraşdırılıb, ekranda E03 xətası çıxır və isti su kəsilir. Zəmanət çərçivəsində baxıla bilərmi?", channel: "WHATSAPP", requester: requester("murad") });
  at(19, () => runAgentAction(t4, operator, { code: "take" }));
  at(18.5, () => addMessage(t4, operator, { body: "Salam, Murad bəy! Bəli, zəmanət çərçivəsindədir. Zəhmət olmasa cihazın arxasındakı seriya nömrəsinin şəklini göndərin.", internal: false, statusAfter: "PENDING_CUSTOMER", asCustomer: false }));
  at(2, () => addMessage(t4, customer("murad"), { body: "Şəkli əlavə etdim. Seriya nömrəsi: BX-2291-77.", internal: false, asCustomer: true, attachments: [{ name: "seriya-nomresi.jpg", url: null }] }));

  // 5. Texniki məsləhət — həll olunub, qiymətləndirmə gözlənilir
  const t5 = make(30, { categoryId: CATEGORY("TECHNICAL_ADVICE"), subject: "120 m² mənzil üçün hansı kombi uyğundur?", body: "Yeni mənzilə kombi almaq istəyirəm, 120 kv.m-dir, 3 otaq. 24 kVt kifayət edərmi, yoxsa daha güclü götürüm?", channel: "PORTAL", requester: requester("leyla") });
  at(29, () => addMessage(t5, dispatcher, { body: "Salam! 120 m² və standart tavan hündürlüyü üçün 24 kVt ikikonturlu kombi kifayətdir. İsti su istifadəsi çoxdursa 28 kVt tövsiyə edirik. Kataloqda Baxi və Vaillant modellərinə baxa bilərsiniz.", internal: false, asCustomer: false }));
  at(6, () => runAgentAction(t5, dispatcher, { code: "resolve" }));

  // 6. İngilis dilli müştəri — bağlanıb, 5 ulduz
  const t6 = make(140, { categoryId: CATEGORY("BILLING"), subject: "Invoice in English for my company", body: "Hello, could you please issue the invoice for my last order in English? I need it for my company's expense report.", channel: "EMAIL", requester: requester("john") });
  at(138, () => addMessage(t6, accountant, { body: "Hello John! The English invoice is now available in your Documents section.", internal: false, statusAfter: "RESOLVED", asCustomer: false }));
  at(130, () => runCustomerAction(t6, customer("john"), { code: "rate", rating: 5, comment: "Very quick, thank you!" }));
  at(100, () => runAgentAction(t6, accountant, { code: "close" }));

  // 7. Korporativ müştəri — təcili, daxili qeyd ilə
  const t7 = make(1.5, { categoryId: CATEGORY("SERVICE_ISSUE"), subject: "Baş ofisdə 3 kondisioner eyni anda işləmir", body: "Azər Holding baş ofisi, 5-ci mərtəbə: server otağı daxil 3 kondisioner söndü. Server otağında temperatur qalxır, təcili briqada lazımdır.", channel: "PHONE", priority: "URGENT", requester: requester("corporate") });
  at(1.4, () => runAgentAction(t7, dispatcher, { code: "take" }));
  at(1.3, () => addMessage(t7, dispatcher, { body: "Korporativ SLA: 4 saat ərzində gəliş. Kamran və Ramil növbəti işdən sonra yönləndirilir, elektrik şəbəkəsini də yoxlamaq lazımdır.", internal: true, asCustomer: false }));
  at(1.2, () => addMessage(t7, dispatcher, { body: "Müraciətiniz qəbul olundu. İki nəfərlik briqada təxminən 1 saat ərzində ünvanda olacaq. Zəhmət olmasa elektrik lövhəsinə girişi təmin edin.", internal: false, asCustomer: false }));

  // 8. Partnyor — komissiya sualı
  const t8 = make(9, { categoryId: CATEGORY("B2B_SALES"), subject: "Avqust komissiya hesabatında SO-5013 görünmür", body: "Avqust ayı üzrə komissiya çıxarışında SO-5013 sifarişi yoxdur, halbuki müştəri ödənişi tam edib. Yoxlamağınızı xahiş edirik.", channel: "PORTAL", requester: requester("partner") });
  at(8, () => runAgentAction(t8, sales, { code: "take" }));
  at(7.5, () => addMessage(t8, sales, { body: "Mühasibatlıqla yoxlayıram — sifarişin ödənişi ayın son günü daxil olduğu üçün sentyabr dövrünə düşmüş ola bilər.", internal: false, asCustomer: false }));

  // 9. Usta — balans uyğunsuzluğu, gözləmədə
  const t9 = make(28, { categoryId: CATEGORY("BILLING"), subject: "Hesablaşmada bir iş üçün ödəniş əksikdir", body: "Keçən həftəki SV sifarişlərindən biri üçün hesablaşmada məbləğ göstərilməyib. Zəhmət olmasa yoxlayın.", channel: "PORTAL", requester: requester("elvin") });
  at(27, () => runAgentAction(t9, accountant, { code: "take" }));
  at(26, () => addMessage(t9, accountant, { body: "Sifariş üzrə zəmanət iddiası araşdırılır, nəticədən sonra hesablaşmaya əlavə olunacaq.", internal: false, asCustomer: false }));
  at(25.5, () => runAgentAction(t9, accountant, { code: "hold", reasonCode: "WAIT_CUSTOMER_DOCS", note: "Zəmanət iddiasının nəticəsi gözlənilir" }));

  // 10. Qonaq — saytın əlaqə formasından
  make(5, { categoryId: CATEGORY("GENERAL"), subject: "Gəncə filialı bazar günü işləyir?", body: "Salam, Gəncə filialı bazar günləri açıqdır? Cihazı özüm gətirmək istəyirəm.", channel: "WEB_FORM", priority: "LOW", requester: { id: null, name: "Samirə Həsənli", phone: "+994506123456", email: null, companyId: null } });

  // 11. Telefon zəngi — operator adından açılıb
  const t11 = make(4, { categoryId: CATEGORY("SERVICE_ISSUE"), subject: "Soyuducu soyutmur — ustanın çağırılması", body: "Müştəri zəng etdi: soyuducu iki gündür soyutmur, kompressor işləyir amma içəri isti qalır. Evdə yaşlı ailə üzvü var, tez bir zamanda baxılması xahiş olunur.", channel: "PHONE", requester: requester("sevda"), author: { id: uid("operator"), name: "Nərmin Səfərova", role: "OPERATOR", fromCustomer: false }, assigneeId: uid("operator") });
  at(3.9, () => addMessage(t11, operator, { body: "Müştəri axşam 18:00-dan sonra evdə olacaq. Ünvanı yoxladım, profil ünvanı aktualdır.", internal: true, asCustomer: false }));

  // 12. Şikayət — bağlanıb, aşağı qiymət
  const t12 = make(96, { categoryId: CATEGORY("FEEDBACK"), subject: "Usta təyin olunan vaxtdan 2 saat gec gəldi", body: "Usta 10:00-a təyin olunmuşdu, 12:00-da gəldi və heç kim xəbərdarlıq etmədi. İş yaxşı görüldü, amma bu hal qəbuledilməzdir.", channel: "PORTAL", requester: requester("orkhan-c") });
  at(94, () => addMessage(t12, operator, { body: "Orxan bəy, üzr istəyirik. Hadisə dispetçer rəhbərliyinə ötürüldü; növbəti sifarişinizdə diaqnostika pulsuz olacaq.", internal: false, statusAfter: "RESOLVED", asCustomer: false }));
  at(90, () => runCustomerAction(t12, customer("orkhan-c"), { code: "rate", rating: 2, comment: "Kompensasiya yaxşıdır, amma xəbərdarlıq edilməli idi." }));

  // 13. Köhnə müraciət — həll olunub, avtomatik bağlanacaq
  const t13 = make(260, { categoryId: CATEGORY("WARRANTY"), subject: "Zəmanət talonunu tapa bilmirəm", body: "Keçən il alınan LG kondisioner üçün zəmanət talonu itib. Elektron variantı varmı?", channel: "PORTAL", requester: requester("aysel") });
  at(258, () => addMessage(t13, operator, { body: "Salam! Elektron zəmanət talonu kabinetinizdə 'Zəmanətlər' bölməsindədir, QR kodla da yoxlanılır.", internal: false, statusAfter: "RESOLVED", asCustomer: false }));
  at(250, () => runCustomerAction(t13, customer("aysel"), { code: "rate", rating: 4 }));

  // 14. Hesaba giriş — tez həll
  const t14 = make(50, { categoryId: CATEGORY("ACCOUNT_ACCESS"), subject: "SMS təsdiq kodu gəlmir", body: "Girişdə SMS kodu tələb olunur, amma 10 dəqiqədir heç bir mesaj gəlmir. Nömrəm düzgündür.", channel: "PORTAL", requester: requester("rashad") });
  at(49.7, () => addMessage(t14, operator, { body: "Operatorunuzda qısa gecikmə olub, kod yenidən göndərildi. Girişi yoxlaya bilərsinizmi?", internal: false, statusAfter: "PENDING_CUSTOMER", asCustomer: false }));
  at(49.5, () => addMessage(t14, customer("rashad"), { body: "Kod gəldi, daxil oldum. Təşəkkürlər!", internal: false, asCustomer: true }));
  at(49.4, () => runAgentAction(t14, operator, { code: "resolve" }));
  at(49, () => runCustomerAction(t14, customer("rashad"), { code: "rate", rating: 5 }));

  // 15. Topdan alıcı — təyin olunmayıb, normal
  make(2.5, { categoryId: CATEGORY("B2B_SALES"), subject: "Mis boru üçün 500 metrdən yuxarı qiymət", body: "TexnoTopdan olaraq ayda 500–800 metr mis boru almağı planlaşdırırıq. Bu həcm üçün xüsusi qiymət təklifi mümkündürmü?", channel: "EMAIL", requester: requester("wholesale") });

  // Keçmiş hadisələrin bildirişləri oxunmuş sayılır
  for (const n of db.notifications) if (n.event.startsWith("TICKET_") && Date.now() - new Date(n.createdAt).getTime() > 6 * 3600_000) n.read = true;
}
