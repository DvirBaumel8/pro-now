import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import type {
  PaymentProvider,
  IdentityVerificationProvider,
  MapsRoutingProvider,
  ExternalReputationProvider,
  GeocodingProvider,
} from "@pro-now/types";
import { SandboxPaymentProvider } from "../infra/payments/sandbox-payment-provider.js";
import { SandboxIdentityProvider } from "../infra/identity/sandbox-identity-provider.js";
import { SandboxMapsProvider } from "../infra/maps/sandbox-maps-provider.js";
import { SandboxExternalReputationProvider } from "../infra/reputation/sandbox-reputation-provider.js";
import { createGeocodingProvider } from "../infra/geocoding/create-geocoding-provider.js";

/**
 * Wires the vendor-neutral provider interfaces from /docs/18-ROADMAP.md
 * §Open decisions to their sandbox implementations. Swapping to a real
 * vendor later means adding a new adapter class and changing this file
 * only — no feature code should ever import a sandbox class directly.
 */
declare module "fastify" {
  interface FastifyInstance {
    providers: {
      payment: PaymentProvider;
      identity: IdentityVerificationProvider;
      maps: MapsRoutingProvider;
      reputation: ExternalReputationProvider;
      geocoding: GeocodingProvider;
    };
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorate("providers", {
    payment: new SandboxPaymentProvider(),
    identity: new SandboxIdentityProvider(),
    maps: new SandboxMapsProvider(),
    reputation: new SandboxExternalReputationProvider(),
    geocoding: createGeocodingProvider(app.config),
  });
  app.log.warn(
    "PRO NOW API is running with SANDBOX providers (payment/identity/maps/reputation). Not for production — see /docs/18-ROADMAP.md."
  );
});
