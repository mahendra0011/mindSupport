import { registerAuthRoutes } from "./auth.routes.js";
import { registerApplicationRoutes } from "./applications.routes.js";
import { registerUserRoutes } from "./user.routes.js";
import { registerCommunicationRoutes } from "./communication.routes.js";
import { registerNotificationRoutes } from "./notifications.routes.js";
import { registerCounsellorRoutes } from "./counsellor.routes.js";
import { registerAdminRoutes } from "./admin.routes.js";
import { registerMarketplaceRoutes } from "./marketplace.routes.js";
import { registerResourceRoutes } from "./resources.routes.js";
import { registerPeerRoutes } from "./peer.routes.js";
import { registerWellnessRoutes } from "./wellness.routes.js";
import { registerAnalyticsRoutes } from "./analytics.routes.js";

export function registerRoutes(app, context) {
  registerAuthRoutes(app, context);
  registerApplicationRoutes(app, context);
  registerUserRoutes(app, context);
  registerCommunicationRoutes(app, context);
  registerNotificationRoutes(app, context);
  registerCounsellorRoutes(app, context);
  registerAdminRoutes(app, context);
  registerMarketplaceRoutes(app, context);
  registerResourceRoutes(app, context);
  registerPeerRoutes(app, context);
  registerWellnessRoutes(app, context);
  registerAnalyticsRoutes(app, context);
}
