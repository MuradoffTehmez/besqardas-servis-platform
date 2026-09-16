import { z } from "zod";
import { Id, Address } from "./common";
import { CustomerSegment, EmploymentType, Locale, PermissionScope, Role } from "./enums";

/** Autentifikasiya (PRD §9). Validasiya mesajları UI-da həll olunan i18n açarlarıdır (`validation.*`). */

const phone = z
  .string()
  .regex(/^\+994(10|12|50|51|55|60|70|77|99)\d{7}$/, { message: "validation.phone" });
const password = z
  .string()
  .min(8, { message: "validation.passwordMin" })
  .regex(/[A-Za-z]/, { message: "validation.passwordLetters" })
  .regex(/\d/, { message: "validation.passwordDigits" });

export const PhoneSchema = phone;
export const PasswordSchema = password;

export const LoginEmailRequest = z.object({
  email: z.email({ message: "validation.email" }),
  password: z.string().min(1, { message: "validation.required" }),
});

export const OtpRequest = z.object({
  phone,
  purpose: z.enum(["LOGIN", "REGISTER", "VERIFY_PHONE", "ESTIMATE_APPROVAL"]).default("LOGIN"),
});

export const OtpVerifyRequest = z.object({
  phone,
  code: z.string().regex(/^\d{6}$/, { message: "validation.otp" }),
});

export const TwoFactorRequest = z.object({
  challengeId: z.string(),
  code: z.string().regex(/^\d{6}$/, { message: "validation.otp" }),
});

export const RegisterCustomerRequest = z
  .object({
    method: z.enum(["PHONE", "EMAIL"]),
    firstName: z.string().min(2, { message: "validation.required" }),
    lastName: z.string().min(2, { message: "validation.required" }),
    phone: phone.optional(),
    email: z.email({ message: "validation.email" }).optional(),
    password: password.optional(),
    locale: Locale.default("az"),
    acceptTerms: z.literal(true, { message: "validation.acceptTerms" }),
    marketingConsent: z.boolean().default(false),
    /** Dəvət kodu — referral proqramı. */
    referralCode: z.string().trim().max(16).optional(),
  })
  .refine((v) => (v.method === "PHONE" ? !!v.phone : !!v.email && !!v.password), {
    message: "validation.required",
    path: ["method"],
  });

export const ForgotPasswordRequest = z.object({ email: z.email({ message: "validation.email" }) });
export const ResetPasswordRequest = z
  .object({ token: z.string(), password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { message: "validation.passwordMatch", path: ["confirmPassword"] });

export const TechnicianApplicationRequest = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone,
  email: z.email({ message: "validation.email" }),
  city: z.string().min(2),
  specializationIds: z.array(z.string()).min(1, { message: "validation.selectAtLeastOne" }),
  skillIds: z.array(z.string()).default([]),
  zoneIds: z.array(z.string()).min(1, { message: "validation.selectAtLeastOne" }),
  workDays: z.array(z.number().int().min(0).max(6)).min(1),
  workFrom: z.string(),
  workTo: z.string(),
  documents: z.array(z.object({ kind: z.string(), name: z.string() })).min(1, { message: "validation.uploadDocuments" }),
  planId: z.string().min(1, { message: "validation.required" }),
  billingPeriod: z.string().default("MONTH_1"),
});

export const B2BApplicationRequest = z.object({
  companyName: z.string().min(2),
  voen: z.string().regex(/^\d{10}$/, { message: "validation.voen" }),
  legalAddress: z.string().min(5),
  contactName: z.string().min(2),
  contactPhone: phone,
  contactEmail: z.email({ message: "validation.email" }),
  segment: CustomerSegment.exclude(["RETAIL"]),
  note: z.string().optional(),
  documents: z.array(z.object({ kind: z.string(), name: z.string() })).default([]),
});

export const Permission = z.object({
  code: z.string(), // "resource:action"
  scope: PermissionScope,
});

export const Entitlements = z.record(z.string(), z.union([z.boolean(), z.number(), z.string()]));

export const SessionUser = z.object({
  id: Id,
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  avatarUrl: z.string().nullable(),
  locale: Locale,
  roles: z.array(Role),
  activeRole: Role,
  segment: CustomerSegment.nullable(),
  employmentType: EmploymentType.nullable(),
  branchId: z.string().nullable(),
  branchName: z.string().nullable(),
  companyId: z.string().nullable(),
  companyName: z.string().nullable(),
  twoFactorEnabled: z.boolean(),
});

export const Session = z.object({
  authenticated: z.boolean(),
  user: SessionUser.nullable(),
  permissions: z.array(z.string()),
  scopes: z.record(z.string(), PermissionScope),
  entitlements: Entitlements,
  plan: z.object({ code: z.string(), name: z.string() }).nullable(),
  tenant: z.object({ id: Id, name: z.string() }),
  cartCount: z.number(),
  unreadNotifications: z.number(),
  addresses: z.array(Address).optional(),
});

export const LoginResult = z.discriminatedUnion("status", [
  z.object({ status: z.literal("OK"), session: Session, redirectTo: z.string() }),
  z.object({ status: z.literal("TWO_FACTOR_REQUIRED"), challengeId: z.string(), maskedTarget: z.string() }),
  z.object({ status: z.literal("SELECT_MODE"), session: Session, roles: z.array(Role) }),
]);
