import { authHandlers } from "./auth";
import { catalogHandlers } from "./catalog";
import { commerceHandlers } from "./commerce";
import { demoHandlers } from "./presentation";
import { accountHandlers } from "./account";
import { technicianHandlers } from "./technician";
import { courierHandlers } from "./courier";
import { b2bHandlers } from "./b2b";
import { adminOpsHandlers } from "./adminOps";
import { adminConfigHandlers } from "./adminConfig";
import { warehouseHandlers } from "./warehouse";
import { supportHandlers } from "./support";
import { loyaltyHandlers } from "./loyalty";
import { crmHandlers } from "./crm";

/** Bütün MSW handler-ləri — mock server və testlər eyni siyahıdan istifadə edir (PRD §65.3). */
export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...commerceHandlers,
  ...demoHandlers,
  ...accountHandlers,
  ...technicianHandlers,
  ...courierHandlers,
  ...b2bHandlers,
  ...adminOpsHandlers,
  ...warehouseHandlers,
  ...supportHandlers,
  ...loyaltyHandlers,
  ...crmHandlers,
  ...adminConfigHandlers,
];
