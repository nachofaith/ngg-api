import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
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
        Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000
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
    }
  );

  fastify.get("/invitations/:token", async (request, reply) => {
    const { token } = request.params as { token: string };

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));

    if (!invitation) {
      return reply.status(404).send({ error: "Invitación no encontrada" });
    }

    if (invitation.usedAt) {
      return reply.status(410).send({ error: "Esta invitación ya fue utilizada" });
    }

    if (invitation.expiresAt < new Date()) {
      return reply.status(410).send({ error: "Esta invitación ha expirado" });
    }

    return reply.send({ email: invitation.email });
  });
}