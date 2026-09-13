import type { CustomerSegment, EmploymentType, Locale, Role } from "@sp/types";
import { L } from "../lib/i18n";
import { createRng, idFor } from "../lib/rng";
import { daysAgo, daysFromNow } from "../lib/time";
import { BR, ZN } from "./org";
import { EQ, spec } from "./services";
import { PLAN } from "./plans";
import { BRAND, MODEL } from "./catalog";

/** İstifadəçilər, ustalar, müştərilər, ünvanlar, cihazlar, B2B hesabları (PRD §7, §12, §44, §53) */

export const DEMO_PASSWORD = "Demo1234!";
export const DEMO_OTP = "123456";

export interface UserRec {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  password: string;
  roles: Role[];
  locale: Locale;
  segment: CustomerSegment | null;
  employmentType: EmploymentType | null;
  branchId: string | null;
  companyId: string | null;
  companyRole: "OWNER" | "ORDERER" | "APPROVER" | "ACCOUNTANT" | "SITE_MANAGER" | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  planId: string | null;
  status: "ACTIVE" | "INVITED" | "BLOCKED" | "PENDING_VERIFICATION";
  createdAt: string;
  lastLoginAt: string | null;
  avatarTone: string;
  favorites: string[];
  compare: string[];
  marketingConsent: boolean;
  birthDate: string | null;
  city: string;
}

const u = (key: string, first: string, last: string, roles: Role[], extra: Partial<UserRec> = {}): UserRec => ({
  id: idFor(`user:${key}`),
  firstName: first,
  lastName: last,
  email: extra.email === undefined ? `${key}@demo.az` : extra.email,
  phone: extra.phone ?? null,
  password: DEMO_PASSWORD,
  roles,
  locale: extra.locale ?? "az",
  segment: extra.segment ?? (roles.includes("CUSTOMER") ? "RETAIL" : null),
  employmentType: extra.employmentType ?? null,
  branchId: extra.branchId ?? null,
  companyId: extra.companyId ?? null,
  companyRole: extra.companyRole ?? null,
  twoFactorEnabled: extra.twoFactorEnabled ?? roles.some((r) => ["OPERATOR", "DISPATCHER", "WAREHOUSE_EMPLOYEE", "SALES_EMPLOYEE", "ACCOUNTANT", "MANAGER", "ADMIN", "SUPER_ADMIN"].includes(r)),
  emailVerified: true,
  phoneVerified: !!extra.phone,
  planId: extra.planId ?? (roles.includes("CUSTOMER") ? PLAN.CUSTOMER_BASIC! : null),
  status: extra.status ?? "ACTIVE",
  createdAt: extra.createdAt ?? daysAgo(200),
  lastLoginAt: extra.lastLoginAt ?? daysAgo(1),
  avatarTone: extra.avatarTone ?? "sky",
  favorites: [],
  compare: [],
  marketingConsent: extra.marketingConsent ?? false,
  birthDate: null,
  city: extra.city ?? "Bakı",
});

export const COMPANY = {
  azer: idFor("company:azer-holding"),
  klima: idFor("company:klimapro"),
  texno: idFor("company:texnotopdan"),
  green: idFor("company:green-hotel"),
};

export const users: UserRec[] = [
  // Müştərilər
  u("aysel", "Aysel", "Məmmədova", ["CUSTOMER"], { phone: "+994501112233", planId: PLAN.CUSTOMER_PREMIUM, avatarTone: "rose", marketingConsent: true, createdAt: daysAgo(420) }),
  u("rashad", "Rəşad", "Kərimov", ["CUSTOMER"], { phone: "+994702223344", planId: PLAN.CUSTOMER_BASIC, avatarTone: "amber" }),
  u("gunel", "Günel", "Əliyeva", ["CUSTOMER"], { phone: "+994553330011", planId: PLAN.CUSTOMER_PRO, locale: "ru", avatarTone: "violet" }),
  u("murad", "Murad", "Hüseynov", ["CUSTOMER"], { phone: "+994516667788", avatarTone: "emerald", city: "Sumqayıt" }),
  u("leyla", "Leyla", "Quliyeva", ["CUSTOMER"], { phone: "+994509990011", planId: PLAN.CUSTOMER_PRO, avatarTone: "cyan" }),
  u("orkhan-c", "Orxan", "Babayev", ["CUSTOMER"], { phone: "+994775554433", avatarTone: "slate", city: "Gəncə" }),
  u("sevda", "Sevda", "Nəbiyeva", ["CUSTOMER"], { phone: "+994503217654", avatarTone: "pink", email: null }),
  u("john", "John", "Carter", ["CUSTOMER"], { phone: "+994555001122", locale: "en", avatarTone: "blue" }),
  // Usta + müştəri (rejim seçimi)
  u("nicat", "Nicat", "Rəhimov", ["TECHNICIAN", "CUSTOMER"], { phone: "+994507778899", employmentType: "INDEPENDENT", planId: PLAN.TECH_BASIC, avatarTone: "teal" }),
  // Ustalar
  u("elvin", "Elvin", "Həsənov", ["TECHNICIAN"], { phone: "+994502345678", employmentType: "INDEPENDENT", planId: PLAN.TECH_PRO, avatarTone: "indigo" }),
  u("kamran", "Kamran", "Əliyev", ["TECHNICIAN"], { phone: "+994503456789", employmentType: "STAFF", branchId: BR.narimanov, avatarTone: "orange" }),
  u("samir", "Samir", "Qasımov", ["TECHNICIAN"], { phone: "+994554567890", employmentType: "STAFF", branchId: BR.yasamal, avatarTone: "sky" }),
  u("vugar", "Vüqar", "Məlikov", ["TECHNICIAN"], { phone: "+994705678901", employmentType: "INDEPENDENT", planId: PLAN.TECH_PREMIUM, avatarTone: "amber" }),
  u("ramil", "Ramil", "Sadıqov", ["TECHNICIAN"], { phone: "+994506789012", employmentType: "STAFF", branchId: BR.narimanov, avatarTone: "emerald" }),
  u("tural-t", "Tural", "İsmayılov", ["TECHNICIAN"], { phone: "+994557890123", employmentType: "INDEPENDENT", planId: PLAN.TECH_BASIC, avatarTone: "rose" }),
  u("farid-t", "Fərid", "Nağıyev", ["TECHNICIAN"], { phone: "+994508901234", employmentType: "STAFF", branchId: BR.sumqayit, avatarTone: "violet" }),
  u("anar", "Anar", "Cəfərov", ["TECHNICIAN"], { phone: "+994709012345", employmentType: "STAFF", branchId: BR.ganja, avatarTone: "cyan", city: "Gəncə" }),
  u("ilkin", "İlkin", "Abdullayev", ["TECHNICIAN"], { phone: "+994551230987", employmentType: "INDEPENDENT", planId: PLAN.TECH_PRO, avatarTone: "blue" }),
  u("zaur", "Zaur", "Hacıyev", ["TECHNICIAN"], { phone: "+994502223311", employmentType: "INDEPENDENT", planId: null, status: "PENDING_VERIFICATION", avatarTone: "stone", createdAt: daysAgo(2) }),
  // Kuryerlər
  u("orxan", "Orxan", "Məmmədli", ["COURIER"], { phone: "+994553334455", email: null, branchId: BR.narimanov, twoFactorEnabled: false, avatarTone: "lime" }),
  u("elnur", "Elnur", "Paşayev", ["COURIER"], { phone: "+994554445566", email: null, branchId: BR.yasamal, twoFactorEnabled: false, avatarTone: "yellow" }),
  // Daxili rollar
  u("operator", "Nərmin", "Səfərova", ["OPERATOR"], { phone: "+994501000001", branchId: BR.narimanov, avatarTone: "pink" }),
  u("dispatcher", "Rüstəm", "Bağırov", ["DISPATCHER"], { phone: "+994501000002", branchId: BR.narimanov, avatarTone: "blue" }),
  u("warehouse", "Rauf", "Nəsirov", ["WAREHOUSE_EMPLOYEE"], { phone: "+994501000003", branchId: BR.narimanov, avatarTone: "stone" }),
  u("sales", "Kənan", "Vəliyev", ["SALES_EMPLOYEE"], { phone: "+994501000004", branchId: BR.narimanov, avatarTone: "green" }),
  u("accountant", "Səbinə", "Axundova", ["ACCOUNTANT"], { phone: "+994501000005", branchId: BR.narimanov, avatarTone: "violet" }),
  u("manager", "Fərid", "Quliyev", ["MANAGER"], { phone: "+994501000006", branchId: BR.narimanov, avatarTone: "orange" }),
  u("admin", "Admin", "İstifadəçi", ["ADMIN"], { phone: "+994501000007", branchId: BR.narimanov, avatarTone: "slate" }),
  u("superadmin", "Tahmaz", "Muradov", ["SUPER_ADMIN"], { phone: "+994501000008", branchId: BR.narimanov, avatarTone: "indigo" }),
  // B2B
  u("corporate", "Azər", "Səlimov", ["CORPORATE_CUSTOMER"], { phone: "+994124040404", segment: "CORPORATE", companyId: COMPANY.azer, companyRole: "OWNER", avatarTone: "blue" }),
  u("corporate-site", "Vüsal", "Rzayev", ["CORPORATE_CUSTOMER"], { phone: "+994124040405", segment: "CORPORATE", companyId: COMPANY.azer, companyRole: "SITE_MANAGER", avatarTone: "cyan" }),
  u("corporate-acc", "Nigar", "Əhmədova", ["CORPORATE_CUSTOMER"], { phone: "+994124040406", segment: "CORPORATE", companyId: COMPANY.azer, companyRole: "ACCOUNTANT", avatarTone: "rose" }),
  u("partner", "Emil", "Qarayev", ["PARTNER"], { phone: "+994505050505", segment: "PARTNER", companyId: COMPANY.klima, companyRole: "OWNER", avatarTone: "teal" }),
  u("wholesale", "Rövşən", "Mirzəyev", ["WHOLESALE_CUSTOMER"], { phone: "+994506060606", segment: "WHOLESALE", companyId: COMPANY.texno, companyRole: "OWNER", avatarTone: "amber" }),
];

export const U = Object.fromEntries(users.map((x) => [x.email?.split("@")[0] ?? x.phone!, x.id])) as Record<string, string>;
export const uid = (key: string) => idFor(`user:${key}`);

/* ---------------- Ustalar ---------------- */

export interface TechnicianRec {
  id: string;
  userId: string;
  bio: ReturnType<typeof L>;
  city: string;
  branchId: string | null;
  zoneIds: string[];
  employmentType: EmploymentType;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "ACTIVE" | "SUSPENDED";
  specializations: { id: string; specializationId: string; level: "BEGINNER" | "INTERMEDIATE" | "EXPERT"; status: "ACTIVE" | "PENDING_APPROVAL" | "INACTIVE_CERT_EXPIRED"; certificateExpiresAt: string | null }[];
  skillIds: string[];
  licenseStatus: "ACTIVE" | "REVOKED" | null;
  documents: { id: string; kind: "ID_CARD" | "CERTIFICATE" | "DIPLOMA" | "CRIMINAL_RECORD" | "OTHER"; name: string; status: "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED"; expiresAt: string | null; uploadedAt: string; note: string | null }[];
  workingHours: { day: number; from: string; to: string; off: boolean }[];
  rating: number;
  reviewCount: number;
  completedJobs: number;
  promoted: boolean;
  location: { lat: number; lng: number };
  experienceYears: number;
  languages: string[];
  joinedAt: string;
  warrantyClaimRate: number;
  onTimeRate: number;
  cashCents: number;
}

const wh = (from = "09:00", to = "19:00", offDays = [0]) => [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, from, to, off: offDays.includes(day) }));
const docs = (key: string, extra: TechnicianRec["documents"] = []): TechnicianRec["documents"] => [
  { id: idFor(`doc:${key}:id`), kind: "ID_CARD", name: "Şəxsiyyət vəsiqəsi.pdf", status: "VERIFIED", expiresAt: daysFromNow(900), uploadedAt: daysAgo(300), note: null },
  { id: idFor(`doc:${key}:cert`), kind: "CERTIFICATE", name: "Peşə sertifikatı.pdf", status: "VERIFIED", expiresAt: daysFromNow(200), uploadedAt: daysAgo(300), note: null },
  ...extra,
];
const sp = (key: string, cat: string, st: Parameters<typeof spec>[1], level: TechnicianRec["specializations"][number]["level"] = "INTERMEDIATE", status: TechnicianRec["specializations"][number]["status"] = "ACTIVE", cert: string | null = null) => ({
  id: idFor(`techspec:${key}:${cat}:${st}`),
  specializationId: spec(cat, st),
  level,
  status,
  certificateExpiresAt: cert,
});

export const technicians: TechnicianRec[] = [
  {
    id: uid("elvin"), userId: uid("elvin"), employmentType: "INDEPENDENT", status: "ACTIVE", city: "Bakı", branchId: null, zoneIds: [ZN.center, ZN.east],
    bio: L("12 illik təcrübə ilə kondisioner və ventilyasiya sistemləri üzrə mütəxəssis. LG və Daikin sertifikatlı.", "Специалист по кондиционерам и вентиляции с 12-летним опытом. Сертифицирован LG и Daikin.", "AC and ventilation specialist with 12 years of experience. LG and Daikin certified."),
    specializations: [sp("elvin", "AC", "DIAGNOSTICS", "EXPERT"), sp("elvin", "AC", "REPAIR", "EXPERT"), sp("elvin", "AC", "PERIODIC", "EXPERT"), sp("elvin", "AC", "INSTALLATION", "INTERMEDIATE", "PENDING_APPROVAL")],
    skillIds: [idFor("skill:gas-fill")], licenseStatus: null, documents: docs("elvin"), workingHours: wh("09:00", "20:00"),
    rating: 4.9, reviewCount: 212, completedJobs: 486, promoted: true, location: { lat: 40.41, lng: 49.87 }, experienceYears: 12, languages: ["az", "ru"], joinedAt: daysAgo(380), warrantyClaimRate: 1.2, onTimeRate: 96, cashCents: 0,
  },
  {
    id: uid("kamran"), userId: uid("kamran"), employmentType: "STAFF", status: "ACTIVE", city: "Bakı", branchId: BR.narimanov, zoneIds: [ZN.center, ZN.east, ZN.absheron],
    bio: L("Şirkətin baş kondisioner və kombi ustası. Servis maşını №1 məsulu.", "Старший мастер компании по кондиционерам и котлам. Отвечает за сервисную машину №1.", "Senior AC and boiler technician. In charge of service van #1."),
    specializations: [sp("kamran", "AC", "INSTALLATION", "EXPERT"), sp("kamran", "AC", "REPAIR", "EXPERT"), sp("kamran", "AC", "DIAGNOSTICS", "EXPERT"), sp("kamran", "BOILER", "REPAIR", "INTERMEDIATE", "ACTIVE", daysFromNow(150)), sp("kamran", "BOILER", "DIAGNOSTICS"), sp("kamran", "GENERAL", "MEASUREMENT", "EXPERT"), sp("kamran", "ELECTRIC", "INSTALLATION")],
    skillIds: [idFor("skill:gas-fill"), idFor("skill:flue")], licenseStatus: "ACTIVE", documents: docs("kamran"), workingHours: wh(),
    rating: 4.8, reviewCount: 340, completedJobs: 1210, promoted: false, location: { lat: 40.4, lng: 49.86 }, experienceYears: 15, languages: ["az", "ru", "en"], joinedAt: daysAgo(900), warrantyClaimRate: 1.8, onTimeRate: 94, cashCents: 42000,
  },
  {
    id: uid("samir"), userId: uid("samir"), employmentType: "STAFF", status: "ACTIVE", city: "Bakı", branchId: BR.yasamal, zoneIds: [ZN.west, ZN.center],
    bio: L("Kombi və istilik sistemləri ustası, qaz işləri üzrə sertifikatlı.", "Мастер по котлам и отоплению, сертификат на газовые работы.", "Boiler and heating technician, certified for gas work."),
    specializations: [sp("samir", "BOILER", "INSTALLATION", "EXPERT", "ACTIVE", daysFromNow(300)), sp("samir", "BOILER", "REPAIR", "EXPERT", "ACTIVE", daysFromNow(300)), sp("samir", "BOILER", "DIAGNOSTICS", "EXPERT"), sp("samir", "BOILER", "PERIODIC", "EXPERT"), sp("samir", "HEATING", "INSTALLATION"), sp("samir", "HEATING", "REPAIR")],
    skillIds: [idFor("skill:flue"), idFor("skill:piping")], licenseStatus: "ACTIVE", documents: docs("samir"), workingHours: wh(),
    rating: 4.7, reviewCount: 188, completedJobs: 640, promoted: false, location: { lat: 40.38, lng: 49.82 }, experienceYears: 9, languages: ["az", "ru"], joinedAt: daysAgo(600), warrantyClaimRate: 2.4, onTimeRate: 91, cashCents: 18500,
  },
  {
    id: uid("vugar"), userId: uid("vugar"), employmentType: "INDEPENDENT", status: "ACTIVE", city: "Bakı", branchId: null, zoneIds: [ZN.center, ZN.west, ZN.east, ZN.absheron],
    bio: L("Hovuz, nasos və su sistemləri üzrə müstəqil usta. Villa və otellərlə işləyirəm.", "Независимый мастер по бассейнам, насосам и водоснабжению.", "Independent pool, pump and water systems technician."),
    specializations: [sp("vugar", "POOL", "REPAIR", "EXPERT"), sp("vugar", "POOL", "PERIODIC", "EXPERT"), sp("vugar", "POOL", "INSTALLATION", "EXPERT"), sp("vugar", "PUMP", "REPAIR", "EXPERT"), sp("vugar", "PUMP", "INSTALLATION"), sp("vugar", "PUMP", "DIAGNOSTICS")],
    skillIds: [idFor("skill:pool-pump"), idFor("skill:filtration"), idFor("skill:automation")], licenseStatus: null, documents: docs("vugar"), workingHours: wh("08:00", "18:00"),
    rating: 4.9, reviewCount: 97, completedJobs: 301, promoted: true, location: { lat: 40.43, lng: 49.95 }, experienceYears: 10, languages: ["az", "ru", "en"], joinedAt: daysAgo(250), warrantyClaimRate: 0.8, onTimeRate: 97, cashCents: 0,
  },
  {
    id: uid("ramil"), userId: uid("ramil"), employmentType: "STAFF", status: "ACTIVE", city: "Bakı", branchId: BR.narimanov, zoneIds: [ZN.center, ZN.east],
    bio: L("Elektrik quraşdırma və kondisioner quraşdırma üzrə usta.", "Мастер по электромонтажу и установке кондиционеров.", "Electrical and AC installation technician."),
    specializations: [sp("ramil", "ELECTRIC", "INSTALLATION", "EXPERT"), sp("ramil", "ELECTRIC", "REPAIR", "EXPERT"), sp("ramil", "ELECTRIC", "DIAGNOSTICS"), sp("ramil", "AC", "INSTALLATION"), sp("ramil", "AC", "REMOVAL")],
    skillIds: [], licenseStatus: "ACTIVE", documents: docs("ramil"), workingHours: wh(),
    rating: 4.6, reviewCount: 120, completedJobs: 530, promoted: false, location: { lat: 40.42, lng: 49.89 }, experienceYears: 7, languages: ["az"], joinedAt: daysAgo(500), warrantyClaimRate: 2.9, onTimeRate: 89, cashCents: 9000,
  },
  {
    id: uid("tural-t"), userId: uid("tural-t"), employmentType: "INDEPENDENT", status: "ACTIVE", city: "Bakı", branchId: null, zoneIds: [ZN.west],
    bio: L("Kondisioner təmizlənməsi və periodik servis.", "Чистка и обслуживание кондиционеров.", "AC cleaning and periodic service."),
    specializations: [sp("tural", "AC", "PERIODIC"), sp("tural", "AC", "DIAGNOSTICS", "BEGINNER")],
    skillIds: [], licenseStatus: null, documents: docs("tural"), workingHours: wh("10:00", "19:00", [0, 6]),
    rating: 4.5, reviewCount: 34, completedJobs: 78, promoted: false, location: { lat: 40.39, lng: 49.8 }, experienceYears: 3, languages: ["az", "ru"], joinedAt: daysAgo(120), warrantyClaimRate: 3.1, onTimeRate: 88, cashCents: 0,
  },
  {
    id: uid("farid-t"), userId: uid("farid-t"), employmentType: "STAFF", status: "ACTIVE", city: "Sumqayıt", branchId: BR.sumqayit, zoneIds: [ZN.sumqayit],
    bio: L("Sumqayıt filialının universal ustası.", "Универсальный мастер филиала Сумгаит.", "Sumgait branch all-round technician."),
    specializations: [sp("farid", "AC", "REPAIR"), sp("farid", "AC", "INSTALLATION"), sp("farid", "BOILER", "REPAIR", "INTERMEDIATE", "INACTIVE_CERT_EXPIRED", daysAgo(10)), sp("farid", "GENERAL", "MEASUREMENT")],
    skillIds: [], licenseStatus: "ACTIVE", documents: docs("farid", [{ id: idFor("doc:farid:gas"), kind: "CERTIFICATE", name: "Qaz işləri sertifikatı.pdf", status: "EXPIRED", expiresAt: daysAgo(10), uploadedAt: daysAgo(400), note: "Müddəti bitib" }]), workingHours: wh("09:00", "18:00"),
    rating: 4.6, reviewCount: 76, completedJobs: 290, promoted: false, location: { lat: 40.59, lng: 49.67 }, experienceYears: 6, languages: ["az", "ru"], joinedAt: daysAgo(700), warrantyClaimRate: 2.2, onTimeRate: 90, cashCents: 6000,
  },
  {
    id: uid("anar"), userId: uid("anar"), employmentType: "STAFF", status: "ACTIVE", city: "Gəncə", branchId: BR.ganja, zoneIds: [ZN.ganja],
    bio: L("Gəncə servis mərkəzinin ustası: kombi və kondisioner təmiri.", "Мастер сервисного центра Гянджи.", "Ganja service center technician."),
    specializations: [sp("anar", "BOILER", "REPAIR", "EXPERT", "ACTIVE", daysFromNow(120)), sp("anar", "BOILER", "DIAGNOSTICS"), sp("anar", "AC", "REPAIR"), sp("anar", "AC", "DIAGNOSTICS")],
    skillIds: [], licenseStatus: "ACTIVE", documents: docs("anar"), workingHours: wh("09:00", "18:00", [0, 6]),
    rating: 4.7, reviewCount: 64, completedJobs: 350, promoted: false, location: { lat: 40.68, lng: 46.36 }, experienceYears: 8, languages: ["az"], joinedAt: daysAgo(800), warrantyClaimRate: 1.9, onTimeRate: 93, cashCents: 0,
  },
  {
    id: uid("ilkin"), userId: uid("ilkin"), employmentType: "INDEPENDENT", status: "ACTIVE", city: "Bakı", branchId: null, zoneIds: [ZN.center, ZN.west],
    bio: L("Kombi və istilik sistemləri üzrə müstəqil mütəxəssis.", "Независимый специалист по котлам и отоплению.", "Independent boiler & heating specialist."),
    specializations: [sp("ilkin", "BOILER", "DIAGNOSTICS", "EXPERT"), sp("ilkin", "BOILER", "PERIODIC", "EXPERT"), sp("ilkin", "BOILER", "REPAIR", "EXPERT", "ACTIVE", daysFromNow(400)), sp("ilkin", "HEATING", "DIAGNOSTICS")],
    skillIds: [idFor("skill:flue")], licenseStatus: null, documents: docs("ilkin"), workingHours: wh("09:00", "19:00"),
    rating: 4.8, reviewCount: 143, completedJobs: 410, promoted: false, location: { lat: 40.37, lng: 49.84 }, experienceYears: 11, languages: ["az", "ru", "en"], joinedAt: daysAgo(330), warrantyClaimRate: 1.4, onTimeRate: 95, cashCents: 0,
  },
  {
    id: uid("nicat"), userId: uid("nicat"), employmentType: "INDEPENDENT", status: "ACTIVE", city: "Bakı", branchId: null, zoneIds: [ZN.east],
    bio: L("Elektrik və nasos işləri.", "Электрика и насосы.", "Electrical and pump work."),
    specializations: [sp("nicat", "ELECTRIC", "INSTALLATION"), sp("nicat", "PUMP", "REPAIR", "BEGINNER")],
    skillIds: [], licenseStatus: null, documents: docs("nicat"), workingHours: wh("10:00", "18:00", [0]),
    rating: 4.4, reviewCount: 21, completedJobs: 44, promoted: false, location: { lat: 40.38, lng: 49.94 }, experienceYears: 2, languages: ["az"], joinedAt: daysAgo(90), warrantyClaimRate: 4.0, onTimeRate: 86, cashCents: 0,
  },
  {
    id: uid("zaur"), userId: uid("zaur"), employmentType: "INDEPENDENT", status: "PENDING_VERIFICATION", city: "Bakı", branchId: null, zoneIds: [ZN.center],
    bio: L("Yeni müraciət: kondisioner ustası.", "Новая заявка: мастер по кондиционерам.", "New application: AC technician."),
    specializations: [sp("zaur", "AC", "REPAIR", "INTERMEDIATE", "PENDING_APPROVAL"), sp("zaur", "AC", "PERIODIC", "INTERMEDIATE", "PENDING_APPROVAL")],
    skillIds: [], licenseStatus: null,
    documents: [
      { id: idFor("doc:zaur:id"), kind: "ID_CARD", name: "Şəxsiyyət vəsiqəsi.jpg", status: "PENDING", expiresAt: daysFromNow(1500), uploadedAt: daysAgo(2), note: null },
      { id: idFor("doc:zaur:cert"), kind: "CERTIFICATE", name: "Kurs sertifikatı.pdf", status: "PENDING", expiresAt: null, uploadedAt: daysAgo(2), note: null },
    ],
    workingHours: wh(), rating: 0, reviewCount: 0, completedJobs: 0, promoted: false, location: { lat: 40.4, lng: 49.85 }, experienceYears: 4, languages: ["az", "ru"], joinedAt: daysAgo(2), warrantyClaimRate: 0, onTimeRate: 0, cashCents: 0,
  },
];

/* ---------------- Ünvanlar və cihazlar ---------------- */

export interface AddressRec {
  id: string;
  ownerId: string;
  label: string;
  city: string;
  street: string;
  building?: string;
  apartment?: string;
  floor?: string;
  entrance?: string;
  note?: string;
  location?: { lat: number; lng: number };
  isDefault: boolean;
}

const addr = (key: string, owner: string, label: string, city: string, street: string, building: string, apartment: string | undefined, lat: number, lng: number, isDefault = false): AddressRec => ({
  id: idFor(`address:${key}`),
  ownerId: owner,
  label,
  city,
  street,
  building,
  apartment,
  floor: apartment ? String((Number(apartment) % 12) + 1) : undefined,
  entrance: apartment ? "2" : undefined,
  location: { lat, lng },
  isDefault,
});

export const addresses: AddressRec[] = [
  addr("aysel-home", uid("aysel"), "Ev", "Bakı", "Nizami küç. 118", "118", "24", 40.3776, 49.8489, true),
  addr("aysel-summer", uid("aysel"), "Bağ evi (Mərdəkan)", "Bakı", "Mərdəkan qəs., S. Yesenin küç. 5", "5", undefined, 40.4926, 50.1435),
  addr("aysel-office", uid("aysel"), "Ofis", "Bakı", "Neftçilər pr. 153, Port Baku Towers", "153", "1204", 40.3719, 49.8584),
  addr("rashad-home", uid("rashad"), "Ev", "Bakı", "Əhməd Rəcəbli küç. 4", "4", "15", 40.4081, 49.8742, true),
  addr("gunel-home", uid("gunel"), "Ev", "Bakı", "Həsən bəy Zərdabi pr. 78", "78", "40", 40.3871, 49.8103, true),
  addr("murad-home", uid("murad"), "Ev", "Sumqayıt", "Nizami küç. 22", "22", "8", 40.5873, 49.6612, true),
  addr("leyla-home", uid("leyla"), "Ev", "Bakı", "Babək pr. 60", "60", "71", 40.3995, 49.9213, true),
  addr("orkhan-home", uid("orkhan-c"), "Ev", "Gəncə", "Cavadxan küç. 31", "31", undefined, 40.6798, 46.3589, true),
  addr("sevda-home", uid("sevda"), "Ev", "Bakı", "İnşaatçılar pr. 9", "9", "33", 40.3918, 49.8043, true),
  addr("john-home", uid("john"), "Home", "Bakı", "Bülbül pr. 33", "33", "7", 40.3799, 49.8561, true),
  addr("nicat-home", uid("nicat"), "Ev", "Bakı", "Qara Qarayev pr. 12", "12", "5", 40.4103, 49.9432, true),
  // Korporativ obyektlər
  addr("azer-hq", COMPANY.azer, "Baş ofis", "Bakı", "Heydər Əliyev pr. 152, Chinar Plaza", "152", undefined, 40.3995, 49.8662, true),
  addr("azer-mall", COMPANY.azer, "Ticarət mərkəzi", "Bakı", "Tbilisi pr. 3, Azər Mall", "3", undefined, 40.3903, 49.8123),
  addr("azer-warehouse", COMPANY.azer, "Logistika anbarı", "Bakı", "Bakı-Sumqayıt yolu 14 km", "14", undefined, 40.4905, 49.7811),
  addr("azer-ganja", COMPANY.azer, "Gəncə ofisi", "Gəncə", "Atatürk pr. 88", "88", undefined, 40.6851, 46.3639),
  addr("klima-office", COMPANY.klima, "Ofis", "Bakı", "Füzuli küç. 49", "49", undefined, 40.3802, 49.8471, true),
  addr("texno-warehouse", COMPANY.texno, "Anbar", "Bakı", "Zığ şossesi 20", "20", undefined, 40.3551, 49.9711, true),
];

export const ADDR = Object.fromEntries(addresses.map((a) => [a.id, a]));
export const aid = (key: string) => idFor(`address:${key}`);

export interface DeviceRec {
  id: string;
  ownerId: string;
  addressId: string | null;
  categoryId: string;
  brandId: string;
  modelId: string | null;
  modelName: string;
  nickname: string | null;
  serialNumber: string | null;
  purchasedAt: string | null;
  installedAt: string | null;
  nextServiceAt: string | null;
  source: "PURCHASE" | "MANUAL" | "SERVICE";
  location: "AT_CUSTOMER" | "IN_TRANSIT" | "SERVICE_CENTER" | "DELIVERED";
  imageTone: string;
  sharedWithFamily: boolean;
  qrCode: string;
  siteId?: string;
}

const dev = (key: string, owner: string, address: string | null, cat: string, brand: string, model: string | null, modelName: string, serial: string | null, purchasedDaysAgo: number | null, nextService: number | null, source: DeviceRec["source"], tone: string, nickname: string | null = null): DeviceRec => ({
  id: idFor(`device:${key}`),
  ownerId: owner,
  addressId: address,
  categoryId: cat,
  brandId: BRAND[brand]!,
  modelId: model ? MODEL[model]! : null,
  modelName,
  nickname,
  serialNumber: serial,
  purchasedAt: purchasedDaysAgo !== null ? daysAgo(purchasedDaysAgo) : null,
  installedAt: purchasedDaysAgo !== null ? daysAgo(Math.max(purchasedDaysAgo - 3, 0)) : null,
  nextServiceAt: nextService !== null ? daysFromNow(nextService) : null,
  source,
  location: "AT_CUSTOMER",
  imageTone: tone,
  sharedWithFamily: false,
  qrCode: `QR-${key.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}`,
});

export const devices: DeviceRec[] = [
  dev("aysel-lg", uid("aysel"), aid("aysel-home"), EQ.ac, "lg", "lg-18000", "LG DualCool 18000 BTU", "LG18DC2024A77812", 480, 14, "PURCHASE", "sky", "Qonaq otağı"),
  dev("aysel-bosch", uid("aysel"), aid("aysel-home"), EQ.boiler, "bosch", "bosch-7000", "Bosch Condens 7000", "BSC7000-99812", 700, 30, "MANUAL", "orange"),
  dev("aysel-pool", uid("aysel"), aid("aysel-summer"), EQ.pool, "grundfos", "pool-xyz", "Pool Pump XYZ", "PPXYZ-5521", 330, 60, "MANUAL", "blue"),
  dev("aysel-lg2", uid("aysel"), aid("aysel-office"), EQ.ac, "lg", "lg-x123", "LG DualCool X123", "LGX123-44120", 200, 90, "PURCHASE", "cyan", "Ofis kabineti"),
  dev("rashad-baxi", uid("rashad"), aid("rashad-home"), EQ.boiler, "baxi", "baxi-eco", "Baxi Luna Duo-tec 24", "BXL24-11209", 1100, -20, "MANUAL", "amber"),
  dev("rashad-midea", uid("rashad"), aid("rashad-home"), EQ.ac, "midea", "midea-x9", "Midea Xtreme Save 09", null, 800, null, "MANUAL", "indigo"),
  dev("gunel-samsung", uid("gunel"), aid("gunel-home"), EQ.ac, "samsung", "samsung-wf", "Samsung WindFree Comfort 12", "SMWF12-90021", 150, 40, "PURCHASE", "cyan"),
  dev("gunel-ariston", uid("gunel"), aid("gunel-home"), EQ.boiler, "ariston", "ariston-clas-one", "Ariston Clas One 24", "ARC1-77001", 400, 10, "SERVICE", "rose"),
  dev("murad-lg", uid("murad"), aid("murad-home"), EQ.ac, "lg", "lg-x124", "LG DualCool X124", "LGX124-12001", 600, null, "MANUAL", "sky"),
  dev("leyla-daikin", uid("leyla"), aid("leyla-home"), EQ.ac, "daikin", "daikin-s25", "Daikin Sensira FTXC25", "DKS25-56002", 260, 25, "PURCHASE", "teal"),
  dev("leyla-vaillant", uid("leyla"), aid("leyla-home"), EQ.boiler, "vaillant", "vaillant-plus", "Vaillant ecoTEC plus 25", "VL25-33410", 900, -5, "MANUAL", "orange"),
  dev("orkhan-bosch", uid("orkhan-c"), aid("orkhan-home"), EQ.boiler, "bosch", "bosch-2300", "Bosch Condens 2300", "BSC2300-8112", 500, 15, "MANUAL", "amber"),
  dev("sevda-gree", uid("sevda"), aid("sevda-home"), EQ.ac, "gree", "gree-bora18", "Gree Bora 18", null, 300, null, "MANUAL", "teal"),
  dev("john-lg", uid("john"), aid("john-home"), EQ.ac, "lg", "lg-a50", "LG ArtCool A50", "LGA50-12876", 90, 120, "PURCHASE", "slate"),
  dev("nicat-wilo", uid("nicat"), aid("nicat-home"), EQ.pump, "wilo", "wilo-rs", "Wilo Star-RS 25/6", null, 400, null, "MANUAL", "green"),
];

// Korporativ cihaz parkı
const corpSites = [aid("azer-hq"), aid("azer-mall"), aid("azer-warehouse"), aid("azer-ganja")];
const rng = createRng(77);
for (let i = 1; i <= 36; i++) {
  const site = corpSites[i % corpSites.length]!;
  const isAc = i % 3 !== 0;
  devices.push({
    ...dev(`azer-${i}`, COMPANY.azer, site, isAc ? EQ.ac : EQ.boiler, isAc ? (i % 2 ? "daikin" : "lg") : "bosch", isAc ? (i % 2 ? "daikin-s25" : "lg-x124") : "bosch-7000", isAc ? (i % 2 ? "Daikin Sensira FTXC25" : "LG DualCool X124") : "Bosch Condens 7000", `AZH-${1000 + i}`, rng.int(60, 900), rng.int(-10, 120), "MANUAL", isAc ? "sky" : "orange", `${isAc ? "Kondisioner" : "Kombi"} #${i}`),
    siteId: site,
  });
}

export const did = (key: string) => idFor(`device:${key}`);

export const familyMembers = [
  { id: idFor("family:1"), ownerId: uid("aysel"), name: "Tofiq Məmmədov", phone: "+994502221100", relation: "Həyat yoldaşı", status: "ACTIVE" as const, sharedDeviceIds: [did("aysel-lg"), did("aysel-bosch")], canCreateOrders: true, invitedAt: daysAgo(100) },
  { id: idFor("family:2"), ownerId: uid("aysel"), name: "Zəhra Məmmədova", phone: "+994553331100", relation: "Ana", status: "INVITED" as const, sharedDeviceIds: [did("aysel-pool")], canCreateOrders: false, invitedAt: daysAgo(3) },
];

/* ---------------- B2B ---------------- */

export const partnerTypes = [
  {
    id: idFor("ptype:dealer"), code: "DEALER", name: L("Diler", "Дилер", "Dealer"),
    capabilities: { partnerPricing: true, ordersForEndCustomer: false, notifyEndCustomer: false, invoiceRecipient: "PARTNER" as const, commission: false },
    commissionModel: null, commissionBase: "NET_OF_VAT" as const, defaultRate: null, serviceRates: [], active: true,
  },
  {
    id: idFor("ptype:installer"), code: "INSTALLER", name: L("Quraşdırıcı şirkət", "Монтажная компания", "Installer company"),
    capabilities: { partnerPricing: true, ordersForEndCustomer: true, notifyEndCustomer: true, invoiceRecipient: "END_CUSTOMER" as const, commission: true },
    commissionModel: "BY_SERVICE_TYPE" as const, commissionBase: "LABOR_ONLY" as const, defaultRate: "5",
    serviceRates: [
      { serviceTypeLabel: "Kondisioner quraşdırma", model: "PERCENT" as const, value: "7" },
      { serviceTypeLabel: "Kombi təmiri", model: "FIXED" as const, value: "15.00" },
    ],
    active: true,
  },
  {
    id: idFor("ptype:agent"), code: "AGENT", name: L("Agent", "Агент", "Agent"),
    capabilities: { partnerPricing: false, ordersForEndCustomer: true, notifyEndCustomer: false, invoiceRecipient: "END_CUSTOMER" as const, commission: true },
    commissionModel: "PERCENT" as const, commissionBase: "WHOLE_ORDER" as const, defaultRate: "3", serviceRates: [], active: true,
  },
];

export interface B2BAccountRec {
  id: string;
  legalName: string;
  voen: string;
  segment: "PARTNER" | "WHOLESALE" | "CORPORATE";
  status: "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED" | "REJECTED";
  legalAddress: string;
  actualAddress: string;
  bankDetails: { bank: string; iban: string; swift: string };
  contract: { number: string; startsAt: string; endsAt: string; fileName: string } | null;
  accountManager: string;
  priceType: "PARTNER" | "WHOLESALE" | "CORPORATE";
  discountPercent: number;
  paymentTerms: "PREPAID" | "DEFERRED";
  deferredDays: number;
  creditLimitCents: number;
  debtCents: number;
  addressLimit: number | null;
  userLimit: number | null;
  planId: string | null;
  partnerTypeId: string | null;
  commissionEnabled: boolean;
  eInvoiceRequired: boolean;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  minOrderCents: number;
}

export const b2bAccounts: B2BAccountRec[] = [
  {
    id: COMPANY.azer, legalName: "Azər Holding ASC", voen: "1700123451", segment: "CORPORATE", status: "ACTIVE",
    legalAddress: "Bakı, Heydər Əliyev pr. 152", actualAddress: "Bakı, Heydər Əliyev pr. 152, Chinar Plaza",
    bankDetails: { bank: "Kapital Bank ASC", iban: "AZ21AIIB38060019441234567890", swift: "AIIBAZ2X" },
    contract: { number: "KM-2026/014", startsAt: daysAgo(250), endsAt: daysFromNow(115), fileName: "Servis müqaviləsi KM-2026-014.pdf" },
    accountManager: "Kənan Vəliyev", priceType: "CORPORATE", discountPercent: 12, paymentTerms: "DEFERRED", deferredDays: 30,
    creditLimitCents: 5000000, debtCents: 1864000, addressLimit: 20, userLimit: 10, planId: PLAN.CORPORATE_STANDARD!, partnerTypeId: null,
    commissionEnabled: false, eInvoiceRequired: true, contactName: "Azər Səlimov", contactPhone: "+994124040404", contactEmail: "corporate@demo.az", createdAt: daysAgo(260), minOrderCents: 0,
  },
  {
    id: COMPANY.klima, legalName: "KlimaPro MMC", voen: "1500987652", segment: "PARTNER", status: "ACTIVE",
    legalAddress: "Bakı, Füzuli küç. 49", actualAddress: "Bakı, Füzuli küç. 49",
    bankDetails: { bank: "PAŞA Bank ASC", iban: "AZ55PAHA38090019441234560001", swift: "PAHAAZ22" },
    contract: { number: "PT-2026/007", startsAt: daysAgo(180), endsAt: daysFromNow(185), fileName: "Partnyorluq müqaviləsi PT-2026-007.pdf" },
    accountManager: "Kənan Vəliyev", priceType: "PARTNER", discountPercent: 0, paymentTerms: "DEFERRED", deferredDays: 14,
    creditLimitCents: 2000000, debtCents: 435000, addressLimit: null, userLimit: 5, planId: null, partnerTypeId: idFor("ptype:installer"),
    commissionEnabled: true, eInvoiceRequired: true, contactName: "Emil Qarayev", contactPhone: "+994505050505", contactEmail: "partner@demo.az", createdAt: daysAgo(190), minOrderCents: 0,
  },
  {
    id: COMPANY.texno, legalName: "TexnoTopdan MMC", voen: "1300456783", segment: "WHOLESALE", status: "ACTIVE",
    legalAddress: "Bakı, Zığ şossesi 20", actualAddress: "Bakı, Zığ şossesi 20",
    bankDetails: { bank: "ABB ASC", iban: "AZ77IBAZ38090019441234569999", swift: "IBAZAZ2X" },
    contract: { number: "TP-2026/003", startsAt: daysAgo(90), endsAt: daysFromNow(275), fileName: "Topdan satış müqaviləsi TP-2026-003.pdf" },
    accountManager: "Kənan Vəliyev", priceType: "WHOLESALE", discountPercent: 0, paymentTerms: "PREPAID", deferredDays: 0,
    creditLimitCents: 1000000, debtCents: 0, addressLimit: null, userLimit: 5, planId: null, partnerTypeId: null,
    commissionEnabled: false, eInvoiceRequired: true, contactName: "Rövşən Mirzəyev", contactPhone: "+994506060606", contactEmail: "wholesale@demo.az", createdAt: daysAgo(95), minOrderCents: 50000,
  },
  {
    id: COMPANY.green, legalName: "Green Hotel Qəbələ MMC", voen: "2100111224", segment: "CORPORATE", status: "PENDING_REVIEW",
    legalAddress: "Qəbələ, Vəndam yolu 3", actualAddress: "Qəbələ, Vəndam yolu 3",
    bankDetails: { bank: "Bank Respublika", iban: "AZ12BRES38090019440000001234", swift: "BRESAZ22" },
    contract: null, accountManager: "—", priceType: "CORPORATE", discountPercent: 0, paymentTerms: "PREPAID", deferredDays: 0,
    creditLimitCents: 0, debtCents: 0, addressLimit: null, userLimit: null, planId: null, partnerTypeId: null,
    commissionEnabled: false, eInvoiceRequired: true, contactName: "Kamilə Nuriyeva", contactPhone: "+994502001122", contactEmail: "info@greenhotel.az", createdAt: daysAgo(1), minOrderCents: 0,
  },
];

export const corporateContracts = [
  { id: idFor("contract:azer-1"), companyId: COMPANY.azer, number: "KM-2026/014", title: "Kondisioner və kombi parkının illik servisi", startsAt: daysAgo(250), endsAt: daysFromNow(115), status: "ACTIVE" as const, sla: { reactionHours: 2, urgentArrivalHours: 4, compliance: 94.5 }, coveredSites: 4, coveredDevices: 36, periodicVisitsPerYear: 4, fileName: "KM-2026-014.pdf" },
  { id: idFor("contract:azer-0"), companyId: COMPANY.azer, number: "KM-2025/031", title: "Quraşdırma müqaviləsi (Azər Mall)", startsAt: daysAgo(600), endsAt: daysAgo(250), status: "EXPIRED" as const, sla: { reactionHours: 4, urgentArrivalHours: 8, compliance: 91.2 }, coveredSites: 1, coveredDevices: 18, periodicVisitsPerYear: 2, fileName: "KM-2025-031.pdf" },
];

export const campaigns = [
  { id: idFor("campaign:partner-autumn"), title: L("Partnyorlar üçün payız bonusu", "Осенний бонус для партнёров", "Autumn partner bonus"), description: L("Oktyabr ayında 10+ kondisioner quraşdırmasına əlavə 2% komissiya", "Дополнительно 2% комиссии за 10+ установок в октябре", "Extra 2% commission for 10+ AC installations in October"), endsAt: daysFromNow(40) },
  { id: idFor("campaign:wholesale-pipe"), title: L("Mis boru rulonlarına pilləli endirim", "Ступенчатая скидка на бухты медной трубы", "Tiered discount on copper pipe rolls"), description: L("20+ rulon alışında əlavə 6% endirim", "Дополнительно 6% при покупке от 20 бухт", "Extra 6% off for 20+ rolls"), endsAt: daysFromNow(25) },
];
