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

export async function deleteHomework(input: { homeworkId: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (!profile?.approved || (profile.role !== "coach" && profile.role !== "admin")) {
    return { ok: false, error: "Coach or admin access is required." };
  }

  const homeworkId = String(input.homeworkId || "").trim();
  if (!homeworkId) return { ok: false, error: "Homework is required." };

  const { data: item, error: itemError } = await supabase
    .from("homework")
    .select("id, class_id, created_by, attachment_path")
    .eq("id", homeworkId)
    .maybeSingle();

  if (itemError) return { ok: false, error: itemError.message };
  if (!item) return { ok: false, error: "Homework was not found." };

  if (profile.role === "coach") {
    if (item.created_by !== user.id) {
      return { ok: false, error: "You can only delete homework that you created." };
    }

    const { data: assignment } = await supabase
      .from("coach_class_assignments")
      .select("class_id")
      .eq("coach_id", user.id)
      .eq("class_id", item.class_id)
      .maybeSingle();

    if (!assignment) return { ok: false, error: "You no longer have access to this class." };
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from("homework_submissions")
    .select("file_path")
    .eq("homework_id", homeworkId);

  if (submissionsError) return { ok: false, error: submissionsError.message };

  const paths = [
    item.attachment_path,
    ...(submissions || []).map((submission: any) => submission.file_path),
  ].filter((path): path is string => Boolean(path));

  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(HOMEWORK_BUCKET).remove(paths);
    if (storageError) return { ok: false, error: `Could not remove homework files: ${storageError.message}` };
  }

  const { error: deleteError } = await supabase
    .from("homework")
    .delete()
    .eq("id", homeworkId);

  if (deleteError) return { ok: false, error: deleteError.message };

  revalidatePath("/portal");
  revalidatePath("/portal/admin/homework");
  return { ok: true };
}
