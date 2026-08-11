"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function registerStudent(formData: FormData) {
  const supabase = await createClient();
  const full_name = String(formData.get("full_name") || "").trim();
  const date_of_birth = String(formData.get("date_of_birth") || "").trim();
  const preferred_branch_id = String(formData.get("preferred_branch_id") || "").trim();
  const fide_id = String(formData.get("fide_id") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const today = new Date().toISOString().slice(0, 10);

  if (!full_name || !preferred_branch_id || !email || password.length < 8) {
    redirect("/register?error=missing_fields");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth) || date_of_birth < "1900-01-01" || date_of_birth > today) {
    redirect("/register?error=invalid_birth_date");
  }

  if (fide_id.length > 32) redirect("/register?error=fide_too_long");
  if (phone.length > 32) redirect("/register?error=phone_too_long");

  const { data: preferredBranch, error: branchError } = await supabase
    .from("branches")
    .select("id")
    .eq("id", preferred_branch_id)
    .eq("active", true)
    .maybeSingle();

  if (branchError || !preferredBranch) {
    redirect("/register?error=invalid_branch");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        date_of_birth,
        preferred_branch_id,
        fide_id: fide_id || null,
        phone: phone || null,
      },
      emailRedirectTo: "https://app.shamiehchess.com/login",
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

  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    redirect("/register?error=account_exists");
  }

  if (data.session) await supabase.auth.signOut();

  redirect("/register?submitted=1");
}
