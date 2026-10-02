import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface SessionPayload {
  userId: number;
  email: string;
  role: "admin" | "user";
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token = request.cookies.session;

  if (!token) {
    return reply.status(401).send({ error: "No autenticado" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionPayload;

    if (payload.role !== "admin") {
      return reply.status(403).send({ error: "Acceso denegado" });
    }

    // Adjuntamos el payload al request para usarlo en el handler si hace falta
    (request as any).user = payload;
  } catch {
    return reply.status(401).send({ error: "Sesión inválida" });
  }
}