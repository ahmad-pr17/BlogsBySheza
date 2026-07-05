import { cookies } from "next/headers";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}
