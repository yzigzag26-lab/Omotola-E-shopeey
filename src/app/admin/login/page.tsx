import { redirect } from "next/navigation";

/**
 * Legacy entry point. Sign-in is rendered directly at /admin when the visitor
 * has no session, so this route simply forwards there.
 */
export default function AdminLoginRedirect() {
  redirect("/admin");
}
