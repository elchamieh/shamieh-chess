"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string, tournamentId?: string): never {
  const query = new URLSearchParams({ error: message });
  if (tournamentId) query.set("tournament", tournamentId);
  redirect(`/tournaments?${query.toString()}${tournamentId ? `#tournament-${tournamentId}` : ""}`);
}

export async function registerPublicTournament(formData: FormData) {
  const supabase = await createClient();
  const tournamentId = String(formData.get("tournament_id") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const dateOfBirth = String(formData.get("date_of_birth") || "").trim();
  const fideId = String(formData.get("fide_id") || "").trim();
  const website = String(formData.get("website") || "").trim();

  if (!tournamentId) fail("Tournament is required.");

  // Honeypot: bots that fill this hidden field receive a harmless success redirect.
  if (website) redirect(`/tournaments?registered=${encodeURIComponent(tournamentId)}#tournament-${tournamentId}`);

  if (fullName.length < 2 || fullName.length > 120) fail("Please enter the participant's full name.", tournamentId);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail("Please enter a valid email address.", tournamentId);
  if (phone.length < 5 || phone.length > 32) fail("Please enter a valid phone number.", tournamentId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || dateOfBirth < "1900-01-01" || dateOfBirth > new Date().toISOString().slice(0, 10)) {
    fail("Please enter a valid date of birth.", tournamentId);
  }
  if (fideId.length > 32) fail("FIDE ID is too long.", tournamentId);

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, starts_at, registration_deadline, open_for_registration")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) fail("Tournament not found.", tournamentId);
  if (!tournament.open_for_registration) fail("Registration is closed for this tournament.", tournamentId);
  if (new Date(tournament.starts_at) < new Date()) fail("This tournament has already started.", tournamentId);
  if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
    fail("The registration deadline has passed.", tournamentId);
  }

  const { error } = await supabase.from("tournament_registrations").insert({
    tournament_id: tournamentId,
    student_id: null,
    registrant_name: fullName,
    registrant_email: email,
    registrant_phone: phone,
    date_of_birth: dateOfBirth,
    fide_id: fideId || null,
    status: "registered",
  });

  if (error) {
    if (error.code === "23505") fail("This email is already registered for this tournament.", tournamentId);
    fail("Could not complete the registration. Please try again.", tournamentId);
  }

  revalidatePath("/tournaments");
  revalidatePath("/portal/admin/tournaments");
  redirect(`/tournaments?registered=${encodeURIComponent(tournamentId)}#tournament-${tournamentId}`);
}
