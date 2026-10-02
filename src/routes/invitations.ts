import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { invitations } from "../db/schema.js";
import { requireAdmin, type SessionPayload } from "../utils/auth-guards.js";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN!;
const INVITATION_EXPIRY_HOURS = 48;

export default async function invitationRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/invitations",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { email, role } = request.body as {
        email?: string;
        role?: "admin" | "user";
      };

      if (!email) {
        return reply.status(400).send({ error: "Email es requerido" });
      }

      const finalRole = role === "admin" ? "admin" : "user";
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(
        Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000,
      );
      const currentUser = (request as any).user as SessionPayload;

      await db.insert(invitations).values({
        email,
        token,
        role: finalRole,
        expiresAt,
        createdBy: currentUser.userId,
      });

      const inviteLink = `${FRONTEND_ORIGIN}/register?token=${token}`;

      return reply.status(201).send({ inviteLink, expiresAt });
    },
  );

  // Listar invitaciones pendientes (no usadas, no expiradas)
  fastify.get(
    "/invitations",
    { preHandler: requireAdmin },
    async (_request, reply) => {
      const allInvitations = await db
        .select({
          id: invitations.id,
          email: invitations.email,
          role: invitations.role,
          expiresAt: invitations.expiresAt,
          usedAt: invitations.usedAt,
          createdAt: invitations.createdAt,
        })
        .from(invitations)
        .where(isNull(invitations.usedAt));

      return reply.send({ invitations: allInvitations });
    },
  );

  // Revocar (eliminar) una invitación pendiente
  fastify.delete(
    "/invitations/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const invitationId = Number(id);

      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, invitationId));

      if (!invitation) {
        return reply.status(404).send({ error: "Invitación no encontrada" });
      }

      if (invitation.usedAt) {
        return reply
          .status(400)
          .send({ error: "No se puede revocar una invitación ya utilizada" });
      }

      await db.delete(invitations).where(eq(invitations.id, invitationId));

      return reply.send({ ok: true });
    },
  );
}
