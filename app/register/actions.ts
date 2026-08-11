"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function registerStudent(formData: FormData) {
  const supabase = await createClient();
  const full_name = String(formData.get("full_name") || "").trim();
  const date_of_birth = String(formData.get("date_of_birth") || "").trim();
  const fide_id = String(formData.get("fide_id") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const today = new Date().toISOString().slice(0, 10);

  if (!full_name || !email || password.length < 8) {
    redirect("/register?error=missing_fields");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth) || date_of_birth < "1900-01-01" || date_of_birth > today) {
    redirect("/register?error=invalid_birth_date");
  }

  if (fide_id.length > 32) redirect("/register?error=fide_too_long");
  if (phone.length > 32) redirect("/register?error=phone_too_long");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        date_of_birth,
        fide_id: fide_id || null,
        phone: phone || null,
      },
      emailRedirectTo: "https://shamieh-chess.vercel.app/login",
    },
  });

  if (error) {
    const code = String((error as { code?: string }).code || "");
    const message = error.message.toLowerCase();
    if (code === "email_exists" || message.includes("already been registered") || message.includes("already registered")) {
      redirect("/register?error=account_exists");
    }
    redirect("/register?error=registration_failed");
  }

  // Supabase can intentionally return an obfuscated success response for an
  // already-existing email. An empty identities array is the reliable signal
  // that the person should sign in/reset instead of creating another request.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    redirect("/register?error=account_exists");
  }

  // Pending applicants should never remain signed into the academy platform.
  if (data.session) await supabase.auth.signOut();

  redirect("/register?submitted=1");
}
