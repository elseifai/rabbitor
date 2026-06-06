import type {
  DeliveryMethod,
  KycStatus,
  OrderStatus,
  StoreType,
  SubscriptionTier,
  UserRole,
} from "./enums";

/** Public store card — no vendor PII */
export interface StorePublic {
  id: string;
  name: string;
  storeType: StoreType;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  minOrderValue: number;
  deliveryFee: number;
  deliveryRadiusKm: number;
  subscriptionTier: SubscriptionTier;
  distanceKm?: number;
}

/** Product listing for customers */
export interface ProductPublic {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  images: string[];
  isAvailable: boolean;
}

/** Order summary for tracking */
export interface OrderPublic {
  id: string;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  totalAmount: number;
  storeId: string;
  createdAt: string;
  estimatedDeliveryAt: string | null;
}

/** Auth tokens returned on login/register */
export interface AuthTokens {
  accessToken: string;
  expiresIn: string;
}

export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
  displayName: string | null;
}

/** API success wrapper */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/** Vendor profile — internal; KYC fields never sent to customers */
export interface VendorProfileInternal {
  userId: string;
  businessName: string;
  kycStatus: KycStatus;
  subscriptionTier: SubscriptionTier;
}
