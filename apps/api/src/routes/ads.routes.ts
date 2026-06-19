import { Router } from "express";
import { z } from "zod";
import { AdPlacement } from "@rabbit/database";
import { prisma } from "../lib/prisma";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth";
import { badRequest, notFound } from "../lib/errors";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const placement = z.nativeEnum(AdPlacement).parse(req.query.placement);
    const now = new Date();

    const ads = await prisma.ad.findMany({
      where: {
        placement,
        isActive: true,
        startDate: { lte: now },
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          { OR: [{ shopId: null }, { shop: { isActive: true } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    if (ads.length > 0) {
      await prisma.ad.updateMany({
        where: { id: { in: ads.map((a) => a.id) } },
        data: { impressions: { increment: 1 } },
      });
    }

    res.json({ success: true, data: ads });
  } catch (e) {
    next(e);
  }
});

router.post("/", authenticate, requireRoles("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().min(1),
        imageUrl: z.string().url(),
        linkUrl: z.string().optional(),
        placement: z.nativeEnum(AdPlacement),
        isActive: z.boolean().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().nullable().optional(),
      })
      .parse(req.body);

    const ad = await prisma.ad.create({
      data: {
        title: body.title,
        imageUrl: body.imageUrl,
        linkUrl: body.linkUrl ?? null,
        placement: body.placement,
        isActive: body.isActive ?? true,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    res.status(201).json({ success: true, data: ad });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", authenticate, requireRoles("ADMIN"), async (req, res, next) => {
  try {
    const body = z
      .object({
        title: z.string().optional(),
        imageUrl: z.string().url().optional(),
        linkUrl: z.string().nullable().optional(),
        placement: z.nativeEnum(AdPlacement).optional(),
        isActive: z.boolean().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().nullable().optional(),
      })
      .parse(req.body);

    const ad = await prisma.ad.update({
      where: { id: String(req.params.id) },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.linkUrl !== undefined ? { linkUrl: body.linkUrl } : {}),
        ...(body.placement !== undefined ? { placement: body.placement } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.startDate !== undefined ? { startDate: new Date(body.startDate) } : {}),
        ...(body.endDate !== undefined
          ? { endDate: body.endDate ? new Date(body.endDate) : null }
          : {}),
      },
    });

    res.json({ success: true, data: ad });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", authenticate, requireRoles("ADMIN"), async (req, res, next) => {
  try {
    await prisma.ad.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/click", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) throw notFound("Ad not found");

    await prisma.ad.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
