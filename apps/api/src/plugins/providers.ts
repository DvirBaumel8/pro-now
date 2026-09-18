import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import type {
  PaymentProvider,
  IdentityVerificationProvider,
  MapsRoutingProvider,
  ExternalReputationProvider,
} from "@pro-now/types";
import { SandboxPaymentProvider } from "../infra/payments/sandbox-payment-provider";
import { SandboxIdentityProvider } from "../infra/identity/sandbox-identity-provider";
import { SandboxMapsProvider } from "../infra/maps/sandbox-maps-provider";
import { SandboxExternalReputationProvider } from "../infra/reputation/sandbox-reputation-provider";

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
    };
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorate("providers", {
    payment: new SandboxPaymentProvider(),
    identity: new SandboxIdentityProvider(),
    maps: new SandboxMapsProvider(),
    reputation: new SandboxExternalReputationProvider(),
  });
  app.log.warn(
    "PRO NOW API is running with SANDBOX providers (payment/identity/maps/reputation). Not for production — see /docs/18-ROADMAP.md."
  );
});
