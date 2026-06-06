import { Router } from "express";
import { z } from "zod";
import * as productService from "../services/product.service";
import { authenticate, requireRoles, type AuthRequest } from "../middleware/auth";

type StoreParams = { storeId: string };

const router = Router({ mergeParams: true });

router.get("/", async (req, res, next) => {
  try {
    const { storeId } = req.params as StoreParams;
    const availableOnly = req.query.availableOnly !== "false";
    const products = await productService.listProductsByStore(storeId, availableOnly);
    res.json({ success: true, data: products });
  } catch (e) {
    next(e);
  }
});

router.post("/", authenticate, requireRoles("VENDOR"), async (req: AuthRequest, res, next) => {
  try {
    const { storeId } = req.params as StoreParams;
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().positive(),
      unit: z.string().optional(),
      images: z.array(z.string().url()).optional(),
      stock: z.number().int().nonnegative().optional(),
    });
    const body = schema.parse(req.body);
    const product = await productService.createProduct(req.user!.sub, storeId, body);
    res.status(201).json({ success: true, data: product });
  } catch (e) {
    next(e);
  }
});

router.patch("/:productId/availability", authenticate, requireRoles("VENDOR"), async (req: AuthRequest, res, next) => {
  try {
    const { isAvailable } = z.object({ isAvailable: z.boolean() }).parse(req.body);
    const product = await productService.toggleProductAvailability(
      req.user!.sub,
      req.params.productId as string,
      isAvailable
    );
    res.json({ success: true, data: product });
  } catch (e) {
    next(e);
  }
});

export default router;
