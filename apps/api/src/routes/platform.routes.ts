import { Router } from "express";
import { z } from "zod";
import { DiscountType, KycDocType, AdPlacement, OrderStatus } from "@rabbit/database";
import * as couponService from "../services/coupon.service";
import * as kycService from "../services/kyc.service";
import { prisma } from "../lib/prisma";
import { getRedis } from "../lib/redis";
import { uploadImage, isCloudinaryConfigured } from "../lib/cloudinary";
import { imageUpload } from "../lib/upload";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth";
import { badRequest } from "../lib/errors";
import * as analyticsService from "../services/analytics.service";
import { runGlobalCatalogSeed } from "../lib/global-catalog-seed";
import * as AdminCatalogController from "../controllers/admin-catalog.controller";

const router = Router();

router.post(
  "/upload-image",
  authenticate,
  requireRoles("VENDOR"),
  imageUpload.single("image"),
  async (req: AuthRequest, res, next) => {
    try {
      if (!isCloudinaryConfigured()) {
        throw badRequest("Image upload is not configured");
      }
      if (!req.file) {
        throw badRequest("Image file is required");
      }

      const url = await uploadImage(req.file.buffer, "rabbit/products");
      res.json({ success: true, data: { url } });
    } catch (e) {
      next(e);
    }
  }
);

export default router;

export const couponsRouter = Router();

couponsRouter.post(
  "/validate",
  authenticate,
  requireRoles("CUSTOMER"),
  async (req: AuthRequest, res, next) => {
    try {
      const body = z
        .object({
          code: z.string().min(1),
          cartTotal: z.number().nonnegative(),
        })
        .parse(req.body);
      const result = await couponService.validateCoupon(body.code, body.cartTotal);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  }
);

export const vendorRouter = Router();

vendorRouter.post(
  "/kyc/upload",
  authenticate,
  requireRoles("VENDOR"),
  imageUpload.single("file"),
  async (req: AuthRequest, res, next) => {
    try {
      const body = z
        .object({
          docType: z.nativeEnum(KycDocType),
        })
        .parse(req.body);

      if (!req.file) {
        throw badRequest("Document file is required");
      }

      const doc = await kycService.uploadKycDocument(
        req.user!.sub,
        body.docType,
        req.file.buffer
      );
      res.status(201).json({ success: true, data: doc });
    } catch (e) {
      next(e);
    }
  }
);

export const adminRouter = Router();

adminRouter.get("/kyc", authenticate, requireRoles("ADMIN"), async (_req, res, next) => {
  try {
    const vendors = await kycService.listPendingKycVendors();
    res.json({ success: true, data: vendors });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch(
  "/kyc/:vendorId",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const body = z
        .object({
          status: z.enum(["VERIFIED", "REJECTED"]),
          note: z.string().optional(),
        })
        .parse(req.body);
      const result = await kycService.reviewVendorKyc(
        String(req.params.vendorId),
        body.status,
        body.note
      );
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  }
);

adminRouter.post("/coupons", authenticate, requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const body = z
      .object({
        code: z.string().min(3),
        discountType: z.nativeEnum(DiscountType),
        discountValue: z.number().positive(),
        minOrderValue: z.number().nonnegative().optional(),
        maxUses: z.number().int().positive().optional(),
        expiresAt: z.string().datetime().nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    const coupon = await couponService.createCoupon(body);
    res.status(201).json({ success: true, data: coupon });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/coupons", authenticate, requireRoles("ADMIN"), async (_req, res, next) => {
  try {
    const coupons = await couponService.listCoupons();
    res.json({ success: true, data: coupons });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/customers", authenticate, requireRoles("ADMIN"), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      include: { orders: { select: { totalPrice: true, deliveryFee: true, riderTip: true, discountAmount: true } } },
    });
    res.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.displayName ?? u.name,
        phone: u.phone,
        totalOrders: u.orders.length,
        totalSpent: u.orders.reduce(
          (s, o) => s + o.totalPrice + o.deliveryFee + o.riderTip - o.discountAmount,
          0
        ),
        joinedAt: u.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/riders", authenticate, requireRoles("ADMIN"), async (_req, res, next) => {
  try {
    const riders = await prisma.user.findMany({
      where: { role: "RABBITOR" },
      include: {
        rabbitorProfile: true,
        deliveries: {
          where: { status: { in: ["OUT_FOR_DELIVERY", "PREPARING", "ACCEPTED_BY_SHOP"] } },
        },
        _count: { select: { deliveries: true } },
      },
    });
    res.json({
      success: true,
      data: riders.map((r) => ({
        id: r.id,
        name: r.displayName ?? r.name,
        phone: r.phone,
        isVerified: r.rabbitorProfile?.isVerified ?? false,
        isAvailable: r.rabbitorProfile?.isAvailable ?? false,
        activeOrders: r.deliveries.length,
        totalDeliveries: r._count.deliveries,
      })),
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/orders", authenticate, requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(50, parseInt(String(req.query.limit ?? "20"), 10));
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const activeStatuses: OrderStatus[] = [
      "PENDING",
      "ACCEPTED_BY_SHOP",
      "PREPARING",
      "OUT_FOR_DELIVERY",
    ];

    const where =
      status && status !== "ALL"
        ? status === "ACTIVE"
          ? { status: { in: activeStatuses } }
          : { status: status as OrderStatus }
        : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          shop: { select: { name: true } },
          customer: { select: { name: true, phone: true } },
          items: { select: { id: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        shopName: o.shop.name,
        customerName: o.customer.name,
        itemCount: o.items.length,
        amount: o.totalPrice + o.deliveryFee + o.riderTip - o.discountAmount,
        status: o.status,
        createdAt: o.createdAt,
      })),
      pagination: { page, limit, total },
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/revenue", authenticate, requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const range = String(req.query.range ?? "week");
    const cacheKey = `admin:revenue:${range}`;

    try {
      const cached = await getRedis().get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    } catch {
      // Redis optional — compute live
    }

    const now = new Date();
    const start =
      range === "month"
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getTime() - 7 * 86400000);

    const delivered = await prisma.order.findMany({
      where: { status: "DELIVERED", deliveredAt: { gte: start } },
      include: { shop: { select: { id: true, name: true } } },
    });

    const gmv = delivered.reduce(
      (s, o) => s + o.totalPrice + o.deliveryFee + o.riderTip - o.discountAmount,
      0
    );
    const deliveryFees = delivered.reduce((s, o) => s + o.deliveryFee, 0);

    const payload = {
      success: true,
      data: {
        gmv: Math.round(gmv),
        platformFees: Math.round(gmv * 0.05),
        deliveryFees: Math.round(deliveryFees),
        orderCount: delivered.length,
      },
    };

    try {
      await getRedis().set(cacheKey, JSON.stringify(payload), "EX", 300);
    } catch {
      // ignore cache write failures
    }

    res.json(payload);
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/analytics/funnel", authenticate, requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const from = req.query.from
      ? new Date(String(req.query.from))
      : new Date(Date.now() - 7 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const data = await analyticsService.getFunnelAnalytics(from, to);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

adminRouter.get(
  "/customers/:id/journey",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const data = await analyticsService.getCustomerJourney(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.get("/ads", authenticate, requireRoles("ADMIN"), async (_req, res, next) => {
  try {
    const ads = await prisma.ad.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ success: true, data: ads });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/ads", authenticate, requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(1),
        imageUrl: z.string().url(),
        linkUrl: z.string().optional(),
        placement: z.nativeEnum(AdPlacement),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const ad = await prisma.ad.create({ data: { ...body, linkUrl: body.linkUrl ?? null } });
    res.status(201).json({ success: true, data: ad });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch("/ads/:id", authenticate, requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().optional(),
        imageUrl: z.string().url().optional(),
        linkUrl: z.string().nullable().optional(),
        placement: z.nativeEnum(AdPlacement).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const ad = await prisma.ad.update({
      where: { id: String(req.params.id) },
      data: body,
    });
    res.json({ success: true, data: ad });
  } catch (e) {
    next(e);
  }
});

adminRouter.get(
  "/catalog",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try { await AdminCatalogController.getCatalogItems(req, res); } catch (e) { next(e); }
  },
);

adminRouter.get(
  "/catalog/stats",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try { await AdminCatalogController.getCatalogStats(req, res); } catch (e) { next(e); }
  },
);

adminRouter.post(
  "/catalog/seed",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try { await AdminCatalogController.seedCatalog(req, res); } catch (e) { next(e); }
  },
);

adminRouter.post(
  "/catalog/mass-seed",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try { await AdminCatalogController.massSeedCatalog(req, res); } catch (e) { next(e); }
  },
);

adminRouter.get(
  "/catalog/mass-seed/stream",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try { await AdminCatalogController.massSeedCatalogStream(req, res); } catch (e) { next(e); }
  },
);

adminRouter.post(
  "/catalog/upsert",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try { await AdminCatalogController.bulkUpsertCatalog(req, res); } catch (e) { next(e); }
  },
);

adminRouter.post(
  "/catalog/auto-promote",
  authenticate,
  requireRoles("ADMIN"),
  async (req, res, next) => {
    try { await AdminCatalogController.autoPromoteToCatalog(req, res); } catch (e) { next(e); }
  },
);
