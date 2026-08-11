"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const code = String((error as { code?: string }).code || "");
    const message = error.message.toLowerCase();

    if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
      redirect(`/login?error=email_not_confirmed&email=${encodeURIComponent(email)}`);
    }

    if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
      redirect("/login?error=invalid_credentials");
    }

    redirect("/login?error=login_failed");
  }

  redirect("/portal");
}
