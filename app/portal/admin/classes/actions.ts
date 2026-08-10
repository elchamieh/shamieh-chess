"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/portal");
  return supabase;
}

export async function createClass(formData: FormData) {
  const supabase = await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const branchId = String(formData.get("branch_id") || "");
  const levelId = String(formData.get("level_id") || "");

  if (!name || !branchId || !levelId) return;

  const { error } = await supabase.from("classes").insert({
    name,
    branch_id: branchId,
    level_id: levelId,
    active: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/portal/admin/classes");
  revalidatePath("/portal");
}

export async function setClassActive(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") || "");
  const active = String(formData.get("active") || "") === "true";
  if (!id) return;

  const { error } = await supabase
    .from("classes")
    .update({ active })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/portal/admin/classes");
  revalidatePath("/portal");
}
