import express, { raw } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import { config, validateConfig } from "./config";
import { connectRedis } from "./lib/redis";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./routes";
import { setupTrackingSocket } from "./socket/tracking";
import * as paymentService from "./services/payment.service";
import { expireStalePendingPaymentOrders } from "./services/order.service";

validateConfig();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: "Too many requests" });
  },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ success: false, error: "Too many requests" });
  },
});

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));

app.post(
  "/api/v1/payments/webhook",
  raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      const signature = req.headers["x-razorpay-signature"];
      if (typeof signature !== "string") {
        res.status(400).json({ success: false, error: "Missing signature" });
        return;
      }
      const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : String(req.body ?? "");
      const result = await paymentService.handleRazorpayWebhook(rawBody, signature);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },
);

app.use(express.json({ limit: "2mb" }));

if (config.nodeEnv === "production") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      console.log(
        JSON.stringify({
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          ms: Date.now() - start,
        }),
      );
    });
    next();
  });
}

app.use("/api/v1/auth", authLimiter);
app.use("/api/v1/otp", authLimiter);
app.use("/api/v1", apiLimiter);
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

  setInterval(() => {
    void expireStalePendingPaymentOrders().then((count) => {
      if (count > 0) {
        console.log(`[orders] auto-cancelled ${count} stale pending payment order(s)`);
      }
    });
  }, 5 * 60 * 1000);

  httpServer.listen(config.port, () => {
    console.log(`🐰 Rabbit API + Socket.io on http://localhost:${config.port}`);
    console.log(`   Health: http://localhost:${config.port}/api/v1/health`);
    console.log(`   WebSocket: ws://localhost:${config.port}`);
  });
}

start();
