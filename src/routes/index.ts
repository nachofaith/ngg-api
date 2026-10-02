import type { FastifyInstance } from "fastify";
import authRoutes from "./auth.js";
import invitationRoutes from "./invitations.js";
import userRoutes from "./users.js";

export default async function registerRoutes(fastify: FastifyInstance) {
  fastify.register(authRoutes);
  fastify.register(invitationRoutes);
  fastify.register(userRoutes);
}