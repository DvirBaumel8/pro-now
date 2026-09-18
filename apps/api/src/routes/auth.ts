import type { FastifyInstance } from "fastify";
import { otpRequestSchema, otpVerifySchema } from "@pro-now/validation";
import { issueOtp, verifyOtp, signSession } from "../lib/auth";

/**
 * See /docs/06-API-SPEC.md §Key endpoints and /docs/02-UX-FLOWS.md C02/P02.
 * Rate limiting on OTP endpoints is required before production
 * (/docs/11-SECURITY.md) — not yet wired in this delivery, tracked in
 * /docs/EPIC-0-REPORT.md as a hardening-epic item.
 */
export default async function authRoutes(app: FastifyInstance) {
  app.post("/v1/auth/otp/request", async (req, reply) => {
    const body = otpRequestSchema.parse(req.body);
    const code = issueOtp(body.phone);
    app.log.info({ phone: body.phone, sandboxCode: code }, "OTP issued (sandbox)");
    return reply.send({ ok: true, sandboxHint: app.config.NODE_ENV === "local" ? code : undefined });
  });

  app.post("/v1/auth/otp/verify", async (req, reply) => {
    const body = otpVerifySchema.parse(req.body);
    const valid = verifyOtp(body.phone, body.code);
    if (!valid) {
      return reply.status(400).send({ code: "OTP_INVALID", message: "Invalid or expired code" });
    }

    const user = await app.prisma.user.upsert({
      where: { phone: body.phone },
      update: {},
      create: { phone: body.phone },
    });

    const token = signSession({ userId: user.id, phone: user.phone }, app.config.JWT_SECRET);
    return reply.send({ token, userId: user.id });
  });
}
