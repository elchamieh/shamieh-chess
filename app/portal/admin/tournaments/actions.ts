"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || profile?.approved !== true) redirect("/portal");
  return { supabase, user };
}

function beirutLocalToIso(value: string) {
  if (!value) return null;
  const local = value.length === 16 ? `${value}:00` : value;
  const probe = new Date(`${local}Z`);
  const offsetPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Beirut",
    timeZoneName: "longOffset",
  }).formatToParts(probe).find((part) => part.type === "timeZoneName")?.value;

  const match = offsetPart?.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offset = match ? `${match[1]}${match[2]}:${match[3]}` : "+03:00";
  return new Date(`${local}${offset}`).toISOString();
}

function parseFee(formData: FormData) {
  const raw = String(formData.get("fee_amount") || "").trim();
  const currency = String(formData.get("fee_currency") || "USD").trim();

  if (!raw) return { fee_amount: null, fee_currency: currency === "LBP" ? "LBP" : "USD" };

  const fee_amount = Number(raw);
  if (!Number.isFinite(fee_amount) || fee_amount < 0) return null;

  return {
    fee_amount,
    fee_currency: currency === "LBP" ? "LBP" : "USD",
  };
}

function parseRegistrationType(formData: FormData) {
  return String(formData.get("registration_type") || "individual") === "team" ? "team" : "individual";
}

function revalidateTournamentPages() {
  revalidatePath("/portal/admin/tournaments");
  revalidatePath("/portal");
  revalidatePath("/tournaments");
  revalidatePath("/");
}

export async function createTournament(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const title = String(formData.get("title") || "").trim();
  const branch_id = String(formData.get("branch_id") || "").trim() || null;
  const venue = String(formData.get("venue") || "").trim() || null;
  const startsAtRaw = String(formData.get("starts_at") || "").trim();
  const deadlineRaw = String(formData.get("registration_deadline") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const registration_type = parseRegistrationType(formData);
  const fee = parseFee(formData);

  const starts_at = beirutLocalToIso(startsAtRaw);
  const registration_deadline = deadlineRaw ? beirutLocalToIso(deadlineRaw) : null;

  if (!title || !starts_at) {
    redirect("/portal/admin/tournaments?error=Title%20and%20start%20time%20are%20required");
  }

  if (!fee) {
    redirect("/portal/admin/tournaments?error=Fee%20must%20be%20a%20valid%20non-negative%20number");
  }

  if (registration_deadline && registration_deadline > starts_at) {
    redirect("/portal/admin/tournaments?error=Registration%20deadline%20must%20be%20before%20the%20tournament");
  }

  const { error } = await supabase.from("tournaments").insert({
    title,
    branch_id,
    venue,
    starts_at,
    registration_deadline,
    description,
    fee_amount: fee.fee_amount,
    fee_currency: fee.fee_currency,
    registration_type,
    open_for_registration: true,
    created_by: user.id,
  });

  if (error) redirect(`/portal/admin/tournaments?error=${encodeURIComponent(error.message)}`);

  revalidateTournamentPages();
  redirect("/portal/admin/tournaments?created=1");
}

export async function updateTournament(formData: FormData) {
  const { supabase } = await requireAdmin();
  const tournament_id = String(formData.get("tournament_id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const branch_id = String(formData.get("branch_id") || "").trim() || null;
  const venue = String(formData.get("venue") || "").trim() || null;
  const startsAtRaw = String(formData.get("starts_at") || "").trim();
  const deadlineRaw = String(formData.get("registration_deadline") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const registration_type = parseRegistrationType(formData);
  const fee = parseFee(formData);

  const starts_at = beirutLocalToIso(startsAtRaw);
  const registration_deadline = deadlineRaw ? beirutLocalToIso(deadlineRaw) : null;

  if (!tournament_id || !title || !starts_at) {
    redirect("/portal/admin/tournaments?error=Tournament%2C%20title%20and%20start%20time%20are%20required");
  }

  if (!fee) {
    redirect("/portal/admin/tournaments?error=Fee%20must%20be%20a%20valid%20non-negative%20number");
  }

  if (registration_deadline && registration_deadline > starts_at) {
    redirect("/portal/admin/tournaments?error=Registration%20deadline%20must%20be%20before%20the%20tournament");
  }

  const { error } = await supabase
    .from("tournaments")
    .update({
      title,
      branch_id,
      venue,
      starts_at,
      registration_deadline,
      description,
      fee_amount: fee.fee_amount,
      fee_currency: fee.fee_currency,
      registration_type,
    })
    .eq("id", tournament_id);

  if (error) redirect(`/portal/admin/tournaments?error=${encodeURIComponent(error.message)}`);

  revalidateTournamentPages();
  redirect("/portal/admin/tournaments?updated=1");
}

export async function deleteTournament(formData: FormData) {
  const { supabase } = await requireAdmin();
  const tournament_id = String(formData.get("tournament_id") || "").trim();
  if (!tournament_id) return;

  const { error } = await supabase
    .from("tournaments")
    .delete()
    .eq("id", tournament_id);

  if (error) redirect(`/portal/admin/tournaments?error=${encodeURIComponent(error.message)}`);

  revalidateTournamentPages();
  redirect("/portal/admin/tournaments?deleted=1");
}

export async function setTournamentRegistration(formData: FormData) {
  const { supabase } = await requireAdmin();
  const tournament_id = String(formData.get("tournament_id") || "");
  const open_for_registration = String(formData.get("open_for_registration") || "") === "true";
  if (!tournament_id) return;

  const { error } = await supabase
    .from("tournaments")
    .update({ open_for_registration })
    .eq("id", tournament_id);

  if (error) redirect(`/portal/admin/tournaments?error=${encodeURIComponent(error.message)}`);

  revalidateTournamentPages();
}
