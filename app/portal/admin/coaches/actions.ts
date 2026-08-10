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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/portal");
  return supabase;
}

export async function createCoach(formData: FormData) {
  const supabase = await requireAdmin();
  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const class_ids = formData.getAll("class_ids").map(String);

  const { data, error } = await supabase.functions.invoke("admin-create-coach", {
    body: { full_name, email, password, class_ids },
  });

  if (error || data?.error) {
    const message = encodeURIComponent(data?.error || error?.message || "Could not create coach");
    redirect(`/portal/admin/coaches?error=${message}`);
  }

  revalidatePath("/portal/admin/coaches");
  revalidatePath("/portal");
  redirect("/portal/admin/coaches?created=1");
}

export async function assignCoach(formData: FormData) {
  const supabase = await requireAdmin();
  const coach_id = String(formData.get("coach_id") || "");
  const class_id = String(formData.get("class_id") || "");
  if (!coach_id || !class_id) return;

  await supabase
    .from("coach_class_assignments")
    .upsert({ coach_id, class_id }, { onConflict: "coach_id,class_id", ignoreDuplicates: true });

  revalidatePath("/portal/admin/coaches");
}

export async function removeCoachAssignment(formData: FormData) {
  const supabase = await requireAdmin();
  const assignment_id = String(formData.get("assignment_id") || "");
  if (!assignment_id) return;

  await supabase.from("coach_class_assignments").delete().eq("id", assignment_id);
  revalidatePath("/portal/admin/coaches");
}
