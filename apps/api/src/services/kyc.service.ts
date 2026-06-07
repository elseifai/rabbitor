import type { KycDocType, KycStatus } from "@rabbit/database";
import { prisma } from "../lib/prisma";
import { uploadImage, isCloudinaryConfigured } from "../lib/cloudinary";
import { badRequest, forbidden, notFound } from "../lib/errors";

async function getVendorProfileForUser(userId: string) {
  const profile = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!profile) throw forbidden("Vendor profile not found");
  return profile;
}

export async function uploadKycDocument(
  userId: string,
  docType: KycDocType,
  fileBuffer: Buffer
) {
  if (!isCloudinaryConfigured()) {
    throw badRequest("File upload is not configured");
  }

  const profile = await getVendorProfileForUser(userId);
  const fileUrl = await uploadImage(fileBuffer, "rabbit/kyc");

  const doc = await prisma.kycDocument.create({
    data: {
      vendorProfileId: profile.id,
      docType,
      fileUrl,
      status: "PENDING",
    },
  });

  await prisma.vendorProfile.update({
    where: { id: profile.id },
    data: { kycStatus: "PENDING" },
  });

  return doc;
}

export async function listPendingKycVendors() {
  const vendors = await prisma.vendorProfile.findMany({
    where: {
      kycDocuments: { some: { status: "PENDING" } },
    },
    include: {
      user: { select: { id: true, phone: true, displayName: true, name: true } },
      kycDocuments: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" } },
      shops: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return vendors.map((v) => ({
    vendorId: v.id,
    userId: v.userId,
    businessName: v.businessName,
    kycStatus: v.kycStatus,
    user: v.user,
    shops: v.shops,
    documents: v.kycDocuments,
  }));
}

export async function reviewVendorKyc(
  vendorId: string,
  status: Extract<KycStatus, "VERIFIED" | "REJECTED">,
  note?: string
) {
  const profile = await prisma.vendorProfile.findUnique({
    where: { id: vendorId },
    include: { kycDocuments: true },
  });
  if (!profile) throw notFound("Vendor not found");

  await prisma.$transaction([
    prisma.vendorProfile.update({
      where: { id: vendorId },
      data: { kycStatus: status },
    }),
    prisma.kycDocument.updateMany({
      where: { vendorProfileId: vendorId },
      data: {
        status,
        reviewNote: note ?? null,
      },
    }),
  ]);

  return { vendorId, kycStatus: status };
}

export async function getVendorKycStatus(userId: string) {
  const profile = await prisma.vendorProfile.findUnique({
    where: { userId },
    include: {
      kycDocuments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!profile) return null;

  return {
    kycStatus: profile.kycStatus,
    documents: profile.kycDocuments,
  };
}
