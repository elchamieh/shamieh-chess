"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function registerStudent(formData: FormData) {
  const supabase = await createClient();
  const full_name = String(formData.get("full_name") || "").trim();
  const date_of_birth = String(formData.get("date_of_birth") || "").trim();
  const fide_id = String(formData.get("fide_id") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const today = new Date().toISOString().slice(0, 10);

  if (!full_name || !email || password.length < 8) {
    redirect("/register?error=Please%20complete%20all%20required%20fields%20and%20use%20a%20password%20of%20at%20least%208%20characters");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth) || date_of_birth < "1900-01-01" || date_of_birth > today) {
    redirect("/register?error=Please%20enter%20a%20valid%20date%20of%20birth");
  }

  if (fide_id.length > 32) redirect("/register?error=FIDE%20ID%20is%20too%20long");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        date_of_birth,
        fide_id: fide_id || null,
      },
      emailRedirectTo: "https://shamieh-chess.vercel.app/login",
    },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  // If email confirmation is disabled and signUp created a session, do not keep
  // a pending applicant signed into the academy platform automatically.
  if (data.session) await supabase.auth.signOut();

  redirect("/register?submitted=1");
}
