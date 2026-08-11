"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";
  return host ? `${protocol}://${host}` : "https://shamieh-chess.vercel.app";
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=invalid_email");

  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    const code = String((error as { code?: string }).code || "");
    if (code === "over_email_send_rate_limit" || error.message.toLowerCase().includes("rate limit")) {
      redirect("/forgot-password?error=rate_limit");
    }
    redirect("/forgot-password?error=send_failed");
  }

  redirect("/forgot-password?sent=1");
}
