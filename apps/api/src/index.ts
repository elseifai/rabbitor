import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import { config, validateConfig } from "./config";
import { connectRedis } from "./lib/redis";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./routes";
import { setupTrackingSocket } from "./socket/tracking";

validateConfig();

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/v1", routes);

app.use(errorHandler);

async function start() {
  try {
    await connectRedis();
  } catch (err) {
    console.warn("Redis unavailable — order status cache disabled:", (err as Error).message);
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true },
  });

  setupTrackingSocket(io);

  httpServer.listen(config.port, () => {
    console.log(`🐰 Rabbit API + Socket.io on http://localhost:${config.port}`);
    console.log(`   Health: http://localhost:${config.port}/api/v1/health`);
    console.log(`   WebSocket: ws://localhost:${config.port}`);
  });
}

start();
