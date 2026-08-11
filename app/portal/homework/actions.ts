"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SubmissionInput = {
  homeworkId: string;
  classId: string;
  filePath: string;
  fileName: string;
  mimeType?: string;
};

export async function recordHomeworkSubmission(input: SubmissionInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student" || !profile.approved) return { ok: false, error: "Student access is required." };

  const homeworkId = String(input.homeworkId || "").trim();
  const classId = String(input.classId || "").trim();
  const filePath = String(input.filePath || "").trim();
  const fileName = String(input.fileName || "").trim();
  const mimeType = String(input.mimeType || "").trim() || null;

  if (!homeworkId || !classId || !filePath || !fileName) return { ok: false, error: "Missing submission information." };

  const expectedPrefix = `submissions/${classId}/${homeworkId}/${user.id}/`;
  if (!filePath.startsWith(expectedPrefix)) return { ok: false, error: "Invalid submission file path." };

  const [{ data: enrollment }, { data: homework }] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("class_id")
      .eq("student_id", user.id)
      .eq("class_id", classId)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("homework")
      .select("id, class_id, published")
      .eq("id", homeworkId)
      .eq("class_id", classId)
      .maybeSingle(),
  ]);

  if (!enrollment || !homework?.published) return { ok: false, error: "This homework is not available for your class." };

  const { error } = await supabase
    .from("homework_submissions")
    .upsert({
      homework_id: homeworkId,
      student_id: user.id,
      file_path: filePath,
      file_name: fileName,
      mime_type: mimeType,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "homework_id,student_id" });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal");
  revalidatePath("/portal/admin/homework");
  return { ok: true };
}
