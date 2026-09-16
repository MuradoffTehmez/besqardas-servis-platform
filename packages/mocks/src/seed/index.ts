import { db, resetDb } from "../db/state";
import { seedConfig } from "./config";
import { seedStock } from "./stock";
import { seedServiceOrders } from "./orders";
import { seedCommerce } from "./commerce";
import { seedMisc } from "./misc";
import { seedSupport } from "./support";
import { seedLoyaltyExtras, seedLoyaltyProgram } from "./loyalty";

function seedAll() {
  seedConfig();
  seedLoyaltyProgram();
  seedStock();
  seedServiceOrders();
  seedCommerce();
  seedMisc();
  seedSupport();
  seedLoyaltyExtras();
  db.auditLogs.sort((a, b) => b.at.localeCompare(a.at));
  db.notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  db.payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  db.documents.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  db.movements.sort((a, b) => b.at.localeCompare(a.at));
  db.serviceOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  db.salesOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function reset() {
  resetDb(seedAll);
}

let initialized = false;
export function ensureSeeded() {
  if (!initialized) {
    reset();
    initialized = true;
  }
}
