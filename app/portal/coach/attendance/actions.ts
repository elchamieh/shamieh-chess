"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBeirutIsoDate } from "@/lib/training-schedule";

const VALID_STATUSES = new Set(["present", "absent", "excused"]);

export async function saveAttendance(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, approved, frozen")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "coach" || profile?.approved !== true || profile?.frozen === true) {
    redirect("/portal");
  }

  const trainingSessionId = String(formData.get("training_session_id") || "");
  if (!trainingSessionId) redirect("/portal/coach/attendance?error=missing-session");

  const { data: session } = await supabase
    .from("training_sessions")
    .select("id, class_id, session_date, active")
    .eq("id", trainingSessionId)
    .single();

  if (!session?.active || session.session_date > getBeirutIsoDate()) {
    redirect("/portal/coach/attendance?error=invalid-session");
  }

  const { data: assignment } = await supabase
    .from("coach_class_assignments")
    .select("class_id")
    .eq("coach_id", user.id)
    .eq("class_id", session.class_id)
    .maybeSingle();

  if (!assignment) redirect("/portal/coach/attendance?error=not-assigned");

  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("student_id, student:profiles(id, approved, frozen)")
    .eq("class_id", session.class_id)
    .eq("active", true);

  const activeStudentIds = (enrollments || [])
    .filter((item: any) => item.student?.approved === true && item.student?.frozen !== true)
    .map((item: any) => item.student_id);

  if (!activeStudentIds.length) {
    redirect(`/portal/coach/attendance?session=${encodeURIComponent(trainingSessionId)}&error=no-students`);
  }

  const markedAt = new Date().toISOString();
  const rows = activeStudentIds.map((studentId: string) => {
    const status = String(formData.get(`status_${studentId}`) || "");
    if (!VALID_STATUSES.has(status)) return null;
    return {
      training_session_id: trainingSessionId,
      student_id: studentId,
      status,
      marked_by: user.id,
      marked_at: markedAt,
    };
  }).filter(Boolean);

  if (rows.length !== activeStudentIds.length) {
    redirect(`/portal/coach/attendance?session=${encodeURIComponent(trainingSessionId)}&error=incomplete`);
  }

  const { error } = await supabase
    .from("attendance_records")
    .upsert(rows as any[], { onConflict: "training_session_id,student_id" });

  if (error) {
    console.error("Attendance save failed", error);
    redirect(`/portal/coach/attendance?session=${encodeURIComponent(trainingSessionId)}&error=save-failed`);
  }

  revalidatePath("/portal/coach/attendance");
  revalidatePath("/portal/admin/attendance");
  redirect(`/portal/coach/attendance?session=${encodeURIComponent(trainingSessionId)}&saved=1`);
}
