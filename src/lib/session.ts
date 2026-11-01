import { cookies } from "next/headers";
import {
  isValidSessionToken,
  isValidSuperToken,
  SESSION_COOKIE_NAME,
  SUPER_COOKIE_NAME,
} from "@/lib/auth";

// Owner or superadmin: may use the admin panel.
export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

// The developer's superadmin mark.
export async function isSuperAuthenticated() {
  const cookieStore = await cookies();
  return (
    isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value) &&
    isValidSuperToken(cookieStore.get(SUPER_COOKIE_NAME)?.value)
  );
}
