import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import registerRoutes from "./routes/index.js";

const fastify = Fastify({
  logger: true,
  trustProxy: true,
});

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN!;
const PORT = Number(process.env.PORT) || 4000;

async function main() {
  await fastify.register(cors, {
    origin: FRONTEND_ORIGIN,
    credentials: true,
  });

  await fastify.register(cookie);

  await fastify.register(registerRoutes);

  await fastify.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});