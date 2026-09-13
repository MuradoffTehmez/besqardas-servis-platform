import { db } from "../db/state";
import type { ServiceRec } from "../data/services";
import type { Ctx } from "./context";
import { bakuAt } from "../lib/time";

/** Boş vaxt slotlarının hesablanması (PRD §16). Müştəri yalnız boş slotları görür. */

export function matchingTechnicians(service: ServiceRec, city: string | null) {
  return db.technicians.filter(
    (t) =>
      t.status === "ACTIVE" &&
      (!city || t.city === city) &&
      service.specializationIds.every((sid) => t.specializations.some((s) => s.specializationId === sid && s.status === "ACTIVE")) &&
      (t.employmentType === "STAFF"
        ? db.staffLicenses.some((l) => l.technicianId === t.id && l.status === "ACTIVE")
        : db.subscriptions.some((s) => s.subscriberId === t.userId && ["ACTIVE", "TRIAL", "PAST_DUE", "GRACE_PERIOD"].includes(s.status))),
  );
}

function busy(techId: string, start: number, end: number) {
  return db.serviceOrders.some((o) => {
    if (o.technicianId !== techId || !o.scheduledAt || ["CLOSED", "CANCELLED", "REJECTED", "COMPLETED"].includes(o.status)) return false;
    const s = new Date(o.scheduledAt).getTime();
    const e = s + 2 * 3600_000;
    return s < end && e > start;
  });
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function computeSlots(service: ServiceRec, opts: { city: string | null; days: number; technicianId?: string | null; ctx: Ctx; form: string }) {
  const techs = matchingTechnicians(service, opts.city).filter((t) => !opts.technicianId || t.id === opts.technicianId);
  const step = Math.max(1, Math.round(service.slotMinutes / 60));
  const now = Date.now();
  const out: { date: string; slots: { start: string; end: string; available: boolean; technicianIds: string[]; urgent?: boolean }[] }[] = [];
  if (opts.ctx.entitlements.urgent_service && opts.form === "ON_SITE") {
    const start = new Date(Math.ceil((now + 90 * 60_000) / 1800_000) * 1800_000).toISOString();
    const end = new Date(new Date(start).getTime() + service.slotMinutes * 60_000).toISOString();
    out.push({ date: "URGENT", slots: [{ start, end, available: techs.length > 0, technicianIds: techs.slice(0, 3).map((t) => t.id), urgent: true }] });
  }
  for (let d = 0; d < opts.days; d++) {
    const slots = [];
    for (let h = 9; h + step <= 19; h += step) {
      const start = bakuAt(d, h);
      const end = bakuAt(d, h + step);
      const s = new Date(start).getTime();
      if (s < now + 60 * 60_000) continue;
      const free = techs.filter((t) => {
        const wh = t.workingHours.find((x) => x.day === new Date(s + 4 * 3600_000).getUTCDay());
        if (!wh || wh.off) return false;
        if (h < Number(wh.from.slice(0, 2)) || h + step > Number(wh.to.slice(0, 2))) return false;
        if (busy(t.id, s, new Date(end).getTime() + service.travelBufferMinutes * 60_000)) return false;
        return hash(`${t.id}${start}`) % 5 !== 0;
      });
      slots.push({ start, end, available: free.length > 0, technicianIds: free.map((t) => t.id) });
    }
    if (slots.length) out.push({ date: bakuAt(d, 12).slice(0, 10), slots });
  }
  return out;
}
