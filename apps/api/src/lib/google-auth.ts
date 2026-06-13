import type { UserRole } from "@rabbit/database";

const PRIVILEGED_ROLES: UserRole[] = ["VENDOR", "RABBITOR", "ADMIN"];

export class GoogleAuthRoleMismatchError extends Error {
  readonly expectedRole: UserRole;
  readonly actualRole: string;

  constructor(expectedRole: UserRole, actualRole: string) {
    super("ROLE_MISMATCH");
    this.name = "GoogleAuthRoleMismatchError";
    this.expectedRole = expectedRole;
    this.actualRole = actualRole;
  }
}

/** Allowed redirect URIs for mobile expo-auth-session code exchange. */
export function isAllowedMobileRedirectUri(uri: string): boolean {
  if (!uri) return false;
  if (uri.startsWith("rabbit://")) return true;
  if (uri.startsWith("rabbit-delivery://")) return true;
  if (uri.startsWith("https://auth.expo.io/")) return true;
  return false;
}

export function isPrivilegedRole(role: UserRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

export { PRIVILEGED_ROLES };
