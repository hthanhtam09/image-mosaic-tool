import axios from "axios";

/** Invalidates the server-side session cookie. Fire-and-forget — always catches. */
export async function logoutSession(): Promise<void> {
  await axios.post("/api/auth/logout").catch(() => {});
}
