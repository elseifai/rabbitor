import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function jwtSecret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error(
      "JWT_SECRET is not set. Generate one with: openssl rand -base64 32",
    );
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: jwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(","),
  isDev: (process.env.NODE_ENV ?? "development") === "development",
  internalApiSecret: process.env.INTERNAL_API_SECRET ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT ?? "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  msg91AuthKey: process.env.MSG91_AUTH_KEY ?? "",
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID ?? "",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? "",
};

const PRODUCTION_REQUIRED = [
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "CORS_ORIGINS",
  "INTERNAL_API_SECRET",
] as const;

const PRODUCTION_OPTIONAL = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "MSG91_AUTH_KEY",
  "MSG91_TEMPLATE_ID",
  "FIREBASE_SERVICE_ACCOUNT",
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
] as const;

export function validateConfig(): void {
  if (config.nodeEnv !== "production") return;

  for (const key of PRODUCTION_REQUIRED) {
    required(key);
  }

  if (!config.internalApiSecret) {
    throw new Error("INTERNAL_API_SECRET must be set in production");
  }

  for (const key of PRODUCTION_OPTIONAL) {
    if (!process.env[key]) {
      console.warn(`[config] Optional integration not configured: ${key}`);
    }
  }

  if (config.firebaseServiceAccount) {
    try {
      JSON.parse(config.firebaseServiceAccount);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT must be valid JSON when set");
    }
  }
}
