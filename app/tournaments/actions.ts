"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string, tournamentId?: string): never {
  const query = new URLSearchParams({ error: message });
  if (tournamentId) query.set("tournament", tournamentId);
  redirect(`/tournaments?${query.toString()}${tournamentId ? `#tournament-${tournamentId}` : ""}`);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function validFideId(value: string) {
  return /^\d{4,12}$/.test(value);
}

async function getOpenTournament(supabase: any, tournamentId: string) {
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, starts_at, registration_deadline, open_for_registration, registration_type")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) fail("Tournament not found.", tournamentId);
  if (!tournament.open_for_registration) fail("Registration is closed for this tournament.", tournamentId);
  if (new Date(tournament.starts_at) < new Date()) fail("This tournament has already started.", tournamentId);
  if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
    fail("The registration deadline has passed.", tournamentId);
  }
  return tournament;
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
  if (website) redirect(`/tournaments?registered=${encodeURIComponent(tournamentId)}#tournament-${tournamentId}`);

  if (fullName.length < 2 || fullName.length > 120) fail("Please enter the participant's full name.", tournamentId);
  if (!validEmail(email)) fail("Please enter a valid email address.", tournamentId);
  if (phone.length < 5 || phone.length > 32) fail("Please enter a valid phone number.", tournamentId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || dateOfBirth < "1900-01-01" || dateOfBirth > new Date().toISOString().slice(0, 10)) {
    fail("Please enter a valid date of birth.", tournamentId);
  }
  if (fideId.length > 32) fail("FIDE ID is too long.", tournamentId);

  const tournament = await getOpenTournament(supabase, tournamentId);
  if (tournament.registration_type === "team") fail("This event requires team registration.", tournamentId);

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

export async function registerPublicTeamTournament(formData: FormData) {
  const supabase = await createClient();
  const tournamentId = String(formData.get("tournament_id") || "").trim();
  const website = String(formData.get("website") || "").trim();
  const teamName = String(formData.get("team_name") || "").trim();
  const contactPhone = String(formData.get("contact_phone") || "").trim();
  const contactEmail = String(formData.get("contact_email") || "").trim().toLowerCase();
  const captainBoard = Number(String(formData.get("captain_board") || ""));

  const players = [1, 2, 3, 4].map((board) => ({
    board,
    name: String(formData.get(`player_${board}_name`) || "").trim(),
    fideId: String(formData.get(`player_${board}_fide_id`) || "").trim(),
  }));

  if (!tournamentId) fail("Tournament is required.");
  if (website) redirect(`/tournaments?registered=${encodeURIComponent(tournamentId)}#tournament-${tournamentId}`);

  if (teamName.length < 2 || teamName.length > 120) fail("Please enter a valid team name.", tournamentId);
  if (contactPhone.length < 5 || contactPhone.length > 32) fail("Please enter a valid contact phone number.", tournamentId);
  if (contactEmail && !validEmail(contactEmail)) fail("Please enter a valid contact email, or leave it blank.", tournamentId);

  for (const player of players.slice(0, 3)) {
    if (player.name.length < 2 || player.name.length > 120) fail(`Please enter the full name of Player ${player.board}.`, tournamentId);
    if (!validFideId(player.fideId)) fail(`Please enter a valid numeric FIDE ID for Player ${player.board}.`, tournamentId);
  }

  const fourth = players[3];
  if ((fourth.name && !fourth.fideId) || (!fourth.name && fourth.fideId)) {
    fail("For Player 4, please enter both the name and FIDE ID, or leave both blank.", tournamentId);
  }
  if (fourth.name && (fourth.name.length < 2 || fourth.name.length > 120 || !validFideId(fourth.fideId))) {
    fail("Please enter a valid name and numeric FIDE ID for Player 4.", tournamentId);
  }
  if (![1, 2, 3, 4].includes(captainBoard)) fail("Please choose the team captain.", tournamentId);
  if (captainBoard === 4 && !fourth.name) fail("Player 4 cannot be captain unless Player 4 is included.", tournamentId);

  const tournament = await getOpenTournament(supabase, tournamentId);
  if (tournament.registration_type !== "team") fail("This tournament uses individual registration.", tournamentId);

  const { error } = await supabase.from("team_tournament_registrations").insert({
    tournament_id: tournamentId,
    team_name: teamName,
    contact_phone: contactPhone,
    contact_email: contactEmail || null,
    captain_board: captainBoard,
    player_1_name: players[0].name,
    player_1_fide_id: players[0].fideId,
    player_2_name: players[1].name,
    player_2_fide_id: players[1].fideId,
    player_3_name: players[2].name,
    player_3_fide_id: players[2].fideId,
    player_4_name: fourth.name || null,
    player_4_fide_id: fourth.fideId || null,
    status: "registered",
  });

  if (error) {
    if (error.code === "23505") fail("A team with this name is already registered for the tournament.", tournamentId);
    fail("Could not complete the team registration. Please try again.", tournamentId);
  }

  revalidatePath("/tournaments");
  revalidatePath("/portal/admin/tournaments");
  redirect(`/tournaments?registered=${encodeURIComponent(tournamentId)}#tournament-${tournamentId}`);
}
