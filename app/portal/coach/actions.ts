"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { HOMEWORK_BUCKET } from "@/lib/homework-files";

type CreateHomeworkInput = {
  classId: string;
  title: string;
  instructions?: string;
  dueDate?: string;
  attachmentUrl?: string;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
};

export async function createHomework(input: CreateHomeworkInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "coach" || !profile.approved) return { ok: false, error: "Coach access is required." };

  const class_id = String(input.classId || "").trim();
  const title = String(input.title || "").trim();
  const instructions = String(input.instructions || "").trim() || null;
  const attachment_url = String(input.attachmentUrl || "").trim() || null;
  const due_date = String(input.dueDate || "").trim() || null;
  const attachment_path = String(input.attachmentPath || "").trim() || null;
  const attachment_name = String(input.attachmentName || "").trim() || null;
  const attachment_mime_type = String(input.attachmentMimeType || "").trim() || null;

  if (!class_id || !title) return { ok: false, error: "Class and title are required." };

  const { data: assignment } = await supabase
    .from("coach_class_assignments")
    .select("class_id")
    .eq("coach_id", user.id)
    .eq("class_id", class_id)
    .maybeSingle();

  if (!assignment) return { ok: false, error: "You are not assigned to this class." };

  if (attachment_path && !attachment_path.startsWith(`assignments/${class_id}/`)) {
    return { ok: false, error: "Invalid homework file path." };
  }

  const { error } = await supabase.from("homework").insert({
    class_id,
    created_by: user.id,
    title,
    instructions,
    attachment_url,
    attachment_path,
    attachment_name,
    attachment_mime_type,
    due_date,
    published: true,
  });

  if (error) {
    if (attachment_path) await supabase.storage.from(HOMEWORK_BUCKET).remove([attachment_path]);
    return { ok: false, error: error.message };
  }

  revalidatePath("/portal");
  revalidatePath("/portal/admin/homework");
  return { ok: true };
}
