import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, invitations } from "../db/schema.js";
import { comparePassword, hashPassword } from "../utils/password.js";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN!;
const isProduction = process.env.NODE_ENV === "production";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },

    async (request, reply) => {
      const { email, password } = request.body as {
        email?: string;
        password?: string;
      };

      if (!email || !password) {
        return reply
          .status(400)
          .send({ error: "Email y password son requeridos" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) {
        return reply.status(401).send({ error: "Credenciales inválidas" });
      }

      const isValid = await comparePassword(password, user.passwordHash);

      if (!isValid) {
        return reply.status(401).send({ error: "Credenciales inválidas" });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      reply.setCookie("session", token, {
        domain: COOKIE_DOMAIN,
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return reply.send({
        user: { id: user.id, email: user.email, role: user.role },
      });
    },
  );

  fastify.post("/register", async (request, reply) => {
    const { token, password } = request.body as {
      token?: string;
      password?: string;
    };

    if (!token || !password) {
      return reply
        .status(400)
        .send({ error: "Token y password son requeridos" });
    }

    if (password.length < 8) {
      return reply
        .status(400)
        .send({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));

    if (!invitation) {
      return reply.status(404).send({ error: "Invitación no encontrada" });
    }

    if (invitation.usedAt) {
      return reply
        .status(410)
        .send({ error: "Esta invitación ya fue utilizada" });
    }

    if (invitation.expiresAt < new Date()) {
      return reply.status(410).send({ error: "Esta invitación ha expirado" });
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, invitation.email));

    if (existingUser) {
      return reply
        .status(409)
        .send({ error: "Ya existe una cuenta con este email" });
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        email: invitation.email,
        passwordHash,
        role: invitation.role,
      })
      .returning();

    await db
      .update(invitations)
      .set({ usedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    const jwtToken = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    reply.setCookie("session", jwtToken, {
      domain: COOKIE_DOMAIN,
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return reply.status(201).send({
      user: { id: newUser.id, email: newUser.email, role: newUser.role },
    });
  });

  fastify.get("/me", async (request, reply) => {
    const token = request.cookies.session;

    if (!token) {
      return reply.status(401).send({ error: "No autenticado" });
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        userId: number;
        email: string;
        role: "admin" | "user";
      };
      return reply.send({ user: payload });
    } catch {
      return reply.status(401).send({ error: "Sesión inválida" });
    }
  });

  fastify.post("/logout", async (_request, reply) => {
    reply.clearCookie("session", { domain: COOKIE_DOMAIN, path: "/" });
    return reply.send({ ok: true });
  });
}
