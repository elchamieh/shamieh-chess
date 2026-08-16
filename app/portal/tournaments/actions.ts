"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function registerForTournament(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const tournament_id = String(formData.get("tournament_id") || "");
  if (!tournament_id) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, frozen")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student" || profile?.approved !== true || profile?.frozen === true) return;

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, open_for_registration, registration_deadline, registration_type")
    .eq("id", tournament_id)
    .single();

  if (!tournament?.open_for_registration) return;
  if (tournament.registration_type === "team") return;
  if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) return;

  const { data: existing } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournament_id)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) return;

  await supabase.from("tournament_registrations").insert({
    tournament_id,
    student_id: user.id,
    status: "registered",
  });

  revalidatePath("/portal");
}
