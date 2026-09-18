import type { FastifyInstance } from "fastify";

/**
 * Private, authorized-per-job WebSocket channel — see
 * /docs/06-API-SPEC.md §WebSocket channels. This delivery wires the
 * connection/auth/room shape; broadcasting real dispatch/job events onto
 * connected sockets is Epic 7 work tracked in /docs/EPIC-0-REPORT.md.
 * Push (FCM/APNs) remains a wake/fallback signal only — clients must
 * resync from REST on reconnect, never trust buffered socket state.
 */
export function registerJobSocket(app: FastifyInstance) {
  app.get("/v1/ws/jobs/:id", { websocket: true }, (connection, req) => {
    const { id: jobId } = req.params as { id: string };

    if (!req.user) {
      connection.socket.close(4401, "UNAUTHENTICATED");
      return;
    }

    app.log.info({ jobId, userId: req.user.userId }, "Job socket connected");

    connection.socket.on("message", (raw) => {
      // Placeholder echo/ack — real event fan-out (offer/state/quote/
      // location) lands in Epic 7 per /docs/18-ROADMAP.md.
      connection.socket.send(JSON.stringify({ type: "ACK", jobId, receivedAt: new Date().toISOString() }));
      void raw;
    });

    connection.socket.on("close", () => {
      app.log.info({ jobId, userId: req.user?.userId }, "Job socket disconnected");
    });
  });
}
