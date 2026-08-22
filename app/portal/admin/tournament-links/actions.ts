"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/access";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, frozen, is_admin")
    .eq("id", user.id)
    .single();

  if (!hasAdminAccess(profile)) redirect("/portal");
  return supabase;
}

function isAllowedChessResultsUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "chess-results.com" || url.hostname.endsWith(".chess-results.com"));
  } catch {
    return false;
  }
}

export async function updateChessResultsLink(formData: FormData) {
  const supabase = await requireAdmin();
  const tournamentId = String(formData.get("tournament_id") || "").trim();
  const chessResultsUrl = String(formData.get("chess_results_url") || "").trim();

  if (!tournamentId) redirect("/portal/admin/tournament-links?error=Tournament%20is%20required");
  if (!isAllowedChessResultsUrl(chessResultsUrl)) {
    redirect("/portal/admin/tournament-links?error=Please%20enter%20a%20valid%20Chess-Results.com%20HTTPS%20link");
  }

  const { error } = await supabase
    .from("tournaments")
    .update({ chess_results_url: chessResultsUrl || null })
    .eq("id", tournamentId);

  if (error) redirect(`/portal/admin/tournament-links?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/tournaments");
  revalidatePath("/portal/admin/tournament-links");
  redirect("/portal/admin/tournament-links?saved=1");
}
