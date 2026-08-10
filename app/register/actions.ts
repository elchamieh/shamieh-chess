"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function registerStudent(formData: FormData) {
  const supabase = await createClient();
  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!full_name || !email || password.length < 8) {
    redirect("/register?error=Please%20complete%20all%20fields%20and%20use%20a%20password%20of%20at%20least%208%20characters");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  // If email confirmation is disabled and signUp created a session, do not keep
  // a pending applicant signed into the academy platform automatically.
  if (data.session) await supabase.auth.signOut();

  redirect("/register?submitted=1");
}
