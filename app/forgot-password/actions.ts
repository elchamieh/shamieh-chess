"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=invalid_email");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://shamieh-chess.vercel.app/auth/callback?next=/reset-password",
  });

  if (error) {
    const code = String((error as { code?: string }).code || "");
    if (code === "over_email_send_rate_limit" || error.message.toLowerCase().includes("rate limit")) {
      redirect("/forgot-password?error=rate_limit");
    }
    redirect("/forgot-password?error=send_failed");
  }

  // Keep the response generic so the page does not reveal whether an email is registered.
  redirect("/forgot-password?sent=1");
}
