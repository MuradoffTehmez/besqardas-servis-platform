import { db } from "../db/state";
import { route, requireAuth, requirePerm, find, validationError } from "../lib/http";
import { serviceDto, technicianDto, serviceOrderDto } from "../dto";
import { createServiceOrder } from "../engine/orders";
import { isInternal, can } from "../engine/context";
export const demoHandlers = [
  route.get("/branding", () => db.branding),
  route.get("/services/:slug", ({ params }) => {
    const s = db.services.find((s) => s.slug === params.slug);
    if (!s) throw validationError({ slug: ["validation.required"] });
    return serviceDto(s);
  }),
  route.get("/technicians", ({ ctx }) => ({
    items: db.technicians.map((t) => technicianDto(t, ctx)),
  })),
  route.get("/branches", () => ({ items: db.branches })),
  route.get("/account/devices", ({ ctx }) => {
    const u = requireAuth(ctx);
    return { items: db.devices.filter((d) => d.ownerId === u.id) };
  }),
  route.get("/service-orders", ({ ctx }) => {
    const u = requireAuth(ctx);
    const internal = isInternal(ctx) && can(ctx, "service_orders:view");
    return {
      items: db.serviceOrders
        .filter((o) =>
          internal
            ? ctx.scopes.service_orders === "BRANCH"
              ? o.branchId === u.branchId
              : true
            : o.customerId === u.id,
        )
        .map((o) => serviceOrderDto(o, ctx)),
    };
  }),
  route.post("/service-orders", async ({ ctx, body }) => {
    const u = requireAuth(ctx);
    const b = await body<{
      serviceId: string;
      executionForm: "ON_SITE" | "CARRY_IN" | "PICKUP_DELIVERY";
      description: string;
      addressId: string;
      scheduledAt: string;
    }>();
    const s = find(db.services, b.serviceId);
    const a = db.addresses.find((a) => a.id === b.addressId && a.ownerId === u.id);
    if (!a || !b.description?.trim() || !b.scheduledAt || new Date(b.scheduledAt) <= new Date())
      throw validationError({ description: ["validation.required"] });
    const order = createServiceOrder({
      serviceId: s.id,
      customerId: u.id,
      executionForm: b.executionForm,
      description: b.description,
      address: a,
      scheduledAt: b.scheduledAt,
    });
    return serviceOrderDto(order, ctx);
  }),
];
