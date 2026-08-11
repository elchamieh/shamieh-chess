"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateStudentProfile(input: { dateOfBirth: string; fideId?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const dateOfBirth = String(input.dateOfBirth || "").trim();
  const fideId = String(input.fideId || "").trim();
  const today = new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || dateOfBirth < "1900-01-01" || dateOfBirth > today) {
    return { ok: false, error: "Please enter a valid date of birth." };
  }

  if (fideId.length > 32) return { ok: false, error: "FIDE ID is too long." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, frozen")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student" || profile.approved !== true || profile.frozen === true) {
    return { ok: false, error: "Your student profile cannot be edited right now." };
  }

  const { data: enrollment } = await supabase
    .from("student_enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!enrollment) return { ok: false, error: "Class placement is required before editing your profile." };

  const { error } = await supabase
    .from("profiles")
    .update({ date_of_birth: dateOfBirth, fide_id: fideId || null })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal");
  revalidatePath("/portal/admin/students");
  return { ok: true };
}
