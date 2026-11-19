import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** For pages: returns the logged-in athlete id or redirects to /login. */
export async function requireAthlete(): Promise<number> {
  const id = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) redirect("/login");
  return id;
}

/** For route handlers and server actions: null if not logged in. */
export async function currentAthlete(): Promise<number | null> {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}
