import type { FastifyInstance } from "fastify";
import { createUploadSchema } from "@pro-now/validation";
import { requireRole } from "../auth/access.js";
import { detectUploadMime, validateUploadRequest } from "../domain/storage/upload-policy.js";

const PRESIGNED_PUT_SECONDS = 5 * 60;
const PRESIGNED_GET_SECONDS = 2 * 60;

export default async function uploadsRoutes(app: FastifyInstance) {
  app.post("/v1/uploads", { onRequest: requireRole("CUSTOMER", "PROFESSIONAL") }, async (req, reply) => {
    const body = createUploadSchema.parse(req.body);
    const policy = validateUploadRequest(body);
    if (!policy.ok) return reply.status(422).send({ code: policy.code, message: policy.message });

    const upload = await app.prisma.upload.create({
      data: {
        ownerId: req.user!.userId,
        kind: body.kind,
        mime: body.mime.toLowerCase(),
        bytes: body.bytes,
        storageKey: `uploads/${req.user!.userId}/${crypto.randomUUID()}`,
      },
    });

    try {
      const uploadUrl = await app.providers.storage.createPresignedPut({
        key: upload.storageKey,
        contentType: upload.mime,
        contentLength: upload.bytes,
        expiresInSeconds: PRESIGNED_PUT_SECONDS,
      });
      return reply.status(201).send({ upload, uploadUrl, expiresInSeconds: PRESIGNED_PUT_SECONDS });
    } catch (error) {
      await app.prisma.upload.delete({ where: { id: upload.id } });
      throw error;
    }
  });

  app.post("/v1/uploads/:id/complete", { onRequest: requireRole("CUSTOMER", "PROFESSIONAL") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const upload = await app.prisma.upload.findFirst({ where: { id, ownerId: req.user!.userId } });
    if (!upload) return reply.status(404).send({ code: "UPLOAD_NOT_FOUND", message: "Upload not found" });
    if (upload.status === "READY") return reply.send({ upload });

    const head = await app.providers.storage.head(upload.storageKey);
    if (!head) return reply.status(409).send({ code: "UPLOAD_INCOMPLETE", message: "Upload has not reached storage" });
    const detectedMime = detectUploadMime(await app.providers.storage.readPrefix(upload.storageKey, 1024));
    if (head.bytes !== upload.bytes || head.mime !== upload.mime || detectedMime !== upload.mime) {
      await app.providers.storage.delete(upload.storageKey);
      await app.prisma.upload.update({ where: { id: upload.id }, data: { status: "FAILED" } });
      return reply.status(422).send({ code: "UPLOAD_CONTENT_MISMATCH", message: "Uploaded content does not match its declaration" });
    }

    const ready = await app.prisma.upload.update({ where: { id: upload.id }, data: { status: "READY" } });
    return reply.send({ upload: ready });
  });

  app.get("/v1/media/:id", { onRequest: requireRole("CUSTOMER", "PROFESSIONAL") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const upload = await app.prisma.upload.findUnique({
      where: { id },
      include: {
        jobMedia: { include: { job: { include: { customer: true, assignedProfessional: true } } } },
        professionalDocuments: { include: { professional: true } },
      },
    });
    if (!upload) return reply.status(404).send({ code: "MEDIA_NOT_FOUND", message: "Media not found" });
    if (upload.status !== "READY") return reply.status(404).send({ code: "MEDIA_NOT_FOUND", message: "Media not found" });

    const userId = req.user!.userId;
    const allowed =
      upload.ownerId === userId ||
      upload.jobMedia.some(
        ({ job }) => job.customer.userId === userId || job.assignedProfessional?.userId === userId
      ) ||
      upload.professionalDocuments.some(({ professional }) => professional.userId === userId);
    if (!allowed) return reply.status(403).send({ code: "FORBIDDEN", message: "This account cannot read that media" });

    const mediaUrl = await app.providers.storage.createPresignedGet({
      key: upload.storageKey,
      expiresInSeconds: PRESIGNED_GET_SECONDS,
    });
    return reply.redirect(mediaUrl);
  });
}
