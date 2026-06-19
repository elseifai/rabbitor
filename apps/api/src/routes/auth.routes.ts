import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@rabbit/database";
import * as authService from "../services/auth.service";
import * as analyticsService from "../services/analytics.service";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth";

export const otpRouter = Router();

const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().length(6),
});

otpRouter.post("/send", async (req, res, next) => {
  try {
    const body = sendOtpSchema.parse(req.body);
    const result = await authService.sendOtp(body.phone);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

otpRouter.post("/verify", async (req, res, next) => {
  try {
    const body = verifyOtpSchema.parse(req.body);
    const result = await authService.verifyOtp(body.phone, body.code);
    void analyticsService.recordUserEvent({
      userId: result.user.id,
      eventType: "LOGIN",
      metadata: { method: "otp" },
    });
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

const router = Router();

const registerSchema = z.object({
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
  role: z.enum([UserRole.VENDOR, UserRole.RABBITOR]),
  displayName: z.string().optional(),
  businessName: z.string().optional(),
});

const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(1),
});

router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.registerUser(body);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.loginUser(body.phone, body.password);
    void analyticsService.recordUserEvent({
      userId: result.user.id,
      eventType: "LOGIN",
      metadata: { method: "password" },
    });
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

const googleSignInSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().min(1),
  role: z.enum([UserRole.CUSTOMER, UserRole.RABBITOR]).optional(),
});

router.post("/google", async (req, res, next) => {
  try {
    const body = googleSignInSchema.parse(req.body);
    const result = await authService.googleSignIn(body);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

const fcmTokenSchema = z.object({
  token: z.string().min(1),
});

router.post("/fcm-token", authenticate, requireRoles("CUSTOMER"), async (req: AuthRequest, res, next) => {
  try {
    const body = fcmTokenSchema.parse(req.body);
    const result = await authService.saveFcmToken(req.user!.sub, body.token);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

export default router;
