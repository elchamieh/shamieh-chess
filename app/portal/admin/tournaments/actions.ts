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

export async function createTournament(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const title = String(formData.get("title") || "").trim();
  const branch_id = String(formData.get("branch_id") || "").trim() || null;
  const venue = String(formData.get("venue") || "").trim() || null;
  const startsAtRaw = String(formData.get("starts_at") || "").trim();
  const deadlineRaw = String(formData.get("registration_deadline") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;

  const starts_at = beirutLocalToIso(startsAtRaw);
  const registration_deadline = deadlineRaw ? beirutLocalToIso(deadlineRaw) : null;

  if (!title || !starts_at) {
    redirect("/portal/admin/tournaments?error=Title%20and%20start%20time%20are%20required");
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
    open_for_registration: true,
    created_by: user.id,
  });

  if (error) redirect(`/portal/admin/tournaments?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/portal/admin/tournaments");
  revalidatePath("/portal");
  redirect("/portal/admin/tournaments?created=1");
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

  revalidatePath("/portal/admin/tournaments");
  revalidatePath("/portal");
}
