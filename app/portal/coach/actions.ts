"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { HOMEWORK_BUCKET } from "@/lib/homework-files";
import { applyUciMoves, normalizeSolutionMoves, parseFen } from "@/lib/chess-homework";
import { hasAdminAccess } from "@/lib/access";

type CreateHomeworkInput = {
  classId: string;
  title: string;
  instructions?: string;
  dueDate?: string;
  attachmentUrl?: string;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  interactivePositionFen?: string;
  interactiveSolutionMoves?: string[];
};

export async function createHomework(input: CreateHomeworkInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, frozen, is_admin")
    .eq("id", user.id)
    .single();

  const adminAccess = hasAdminAccess(profile);
  if (!profile?.approved || profile.frozen === true || (profile.role !== "coach" && !adminAccess)) {
    return { ok: false, error: "Coach or admin access is required." };
  }

  const class_id = String(input.classId || "").trim();
  const title = String(input.title || "").trim();
  const instructions = String(input.instructions || "").trim() || null;
  const attachment_url = String(input.attachmentUrl || "").trim() || null;
  const due_date = String(input.dueDate || "").trim() || null;
  const attachment_path = String(input.attachmentPath || "").trim() || null;
  const attachment_name = String(input.attachmentName || "").trim() || null;
  const attachment_mime_type = String(input.attachmentMimeType || "").trim() || null;
  const interactive_position_fen = String(input.interactivePositionFen || "").trim() || null;
  const interactive_solution = normalizeSolutionMoves(input.interactiveSolutionMoves || []);

  if (!class_id || !title) return { ok: false, error: "Class and title are required." };

  if (adminAccess) {
    const { data: adminClass } = await supabase
      .from("classes")
      .select("id")
      .eq("id", class_id)
      .eq("active", true)
      .maybeSingle();

    if (!adminClass) return { ok: false, error: "Please choose an active class." };
  } else {
    const { data: assignment } = await supabase
      .from("coach_class_assignments")
      .select("class_id")
      .eq("coach_id", user.id)
      .eq("class_id", class_id)
      .maybeSingle();

    if (!assignment) return { ok: false, error: "You are not assigned to this class." };
  }

  if (attachment_path && !attachment_path.startsWith(`assignments/${class_id}/`)) {
    return { ok: false, error: "Invalid homework file path." };
  }

  if (interactive_position_fen || interactive_solution.length) {
    if (!interactive_position_fen || !interactive_solution.length) {
      return { ok: false, error: "Interactive chess homework needs both a position and at least one solution move." };
    }
    try {
      parseFen(interactive_position_fen);
      applyUciMoves(interactive_position_fen, interactive_solution);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? `Chess position/solution error: ${error.message}` : "Invalid chess position or solution." };
    }
  }

  const { data: created, error } = await supabase
    .from("homework")
    .insert({
      class_id,
      created_by: user.id,
      title,
      instructions,
      attachment_url,
      attachment_path,
      attachment_name,
      attachment_mime_type,
      due_date,
      interactive_position_fen,
      published: true,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (attachment_path) await supabase.storage.from(HOMEWORK_BUCKET).remove([attachment_path]);
    return { ok: false, error: error?.message || "Could not create homework." };
  }

  if (interactive_position_fen && interactive_solution.length) {
    const { error: solutionError } = await supabase
      .from("homework_chess_solutions")
      .insert({ homework_id: created.id, moves: interactive_solution });

    if (solutionError) {
      await supabase.from("homework").delete().eq("id", created.id);
      if (attachment_path) await supabase.storage.from(HOMEWORK_BUCKET).remove([attachment_path]);
      return { ok: false, error: `Could not save the chess solution: ${solutionError.message}` };
    }
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
    .select("role, approved, frozen, is_admin")
    .eq("id", user.id)
    .single();

  const adminAccess = hasAdminAccess(profile);
  if (!profile?.approved || profile.frozen === true || (profile.role !== "coach" && !adminAccess)) {
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

  if (!adminAccess) {
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
