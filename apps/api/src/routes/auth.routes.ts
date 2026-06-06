import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import * as authService from "../services/auth.service";

const router = Router();

const registerSchema = z.object({
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
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
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

export default router;
