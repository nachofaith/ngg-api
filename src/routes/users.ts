import type { FastifyInstance } from "fastify";
import { eq, ne, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { requireAdmin, type SessionPayload } from "../utils/auth-guards.js";

export default async function userRoutes(fastify: FastifyInstance) {
  // Listar todos los usuarios
  fastify.get(
    "/users",
    { preHandler: requireAdmin },
    async (_request, reply) => {
      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users);

      return reply.send({ users: allUsers });
    }
  );

  // Cambiar el rol de un usuario
  fastify.patch(
    "/users/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { role } = request.body as { role?: "admin" | "user" };
      const currentUser = (request as any).user as SessionPayload;
      const targetId = Number(id);

      if (!role || (role !== "admin" && role !== "user")) {
        return reply.status(400).send({ error: "Rol inválido" });
      }

      if (targetId === currentUser.userId) {
        return reply.status(400).send({ error: "No puedes cambiar tu propio rol" });
      }

      const [targetUser] = await db.select().from(users).where(eq(users.id, targetId));

      if (!targetUser) {
        return reply.status(404).send({ error: "Usuario no encontrado" });
      }

      // Si se le va a quitar el admin a alguien, verificar que quede al menos otro admin
      if (targetUser.role === "admin" && role === "user") {
        const adminCount = await db
          .select()
          .from(users)
          .where(and(eq(users.role, "admin"), ne(users.id, targetId)));

        if (adminCount.length === 0) {
          return reply.status(400).send({ error: "Debe quedar al menos un administrador" });
        }
      }

      const [updated] = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, targetId))
        .returning({ id: users.id, email: users.email, role: users.role });

      return reply.send({ user: updated });
    }
  );

  // Eliminar un usuario
  fastify.delete(
    "/users/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const currentUser = (request as any).user as SessionPayload;
      const targetId = Number(id);

      if (targetId === currentUser.userId) {
        return reply.status(400).send({ error: "No puedes eliminar tu propia cuenta" });
      }

      const [targetUser] = await db.select().from(users).where(eq(users.id, targetId));

      if (!targetUser) {
        return reply.status(404).send({ error: "Usuario no encontrado" });
      }

      if (targetUser.role === "admin") {
        const adminCount = await db
          .select()
          .from(users)
          .where(and(eq(users.role, "admin"), ne(users.id, targetId)));

        if (adminCount.length === 0) {
          return reply.status(400).send({ error: "No puedes eliminar al último administrador" });
        }
      }

      await db.delete(users).where(eq(users.id, targetId));

      return reply.send({ ok: true });
    }
  );
}