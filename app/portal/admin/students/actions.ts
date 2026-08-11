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
    .select("role, approved, frozen")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || profile?.approved !== true || profile?.frozen === true) redirect("/portal");
  return supabase;
}

export async function createStudent(formData: FormData) {
  const supabase = await requireAdmin();
  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const class_id = String(formData.get("class_id") || "");
  const date_of_birth = String(formData.get("date_of_birth") || "").trim();
  const fide_id = String(formData.get("fide_id") || "").trim();

  const { data, error } = await supabase.functions.invoke("admin-create-student", {
    body: { full_name, email, password, class_id, date_of_birth, fide_id },
  });

  if (error || data?.error) {
    const message = encodeURIComponent(data?.error || error?.message || "Could not create student");
    redirect(`/portal/admin/students?error=${message}`);
  }

  revalidatePath("/portal/admin/students");
  revalidatePath("/portal");
  redirect("/portal/admin/students?created=1");
}

export async function approveStudent(formData: FormData) {
  const supabase = await requireAdmin();
  const student_id = String(formData.get("student_id") || "");
  const class_id = String(formData.get("class_id") || "");

  if (!student_id || !class_id) {
    redirect("/portal/admin/students?error=Student%20and%20class%20are%20required");
  }

  const [{ data: student }, { data: targetClass }] = await Promise.all([
    supabase.from("profiles").select("id, role, approved, date_of_birth").eq("id", student_id).single(),
    supabase.from("classes").select("id").eq("id", class_id).eq("active", true).single(),
  ]);

  if (!student || student.role !== "student" || student.approved || !targetClass) {
    redirect("/portal/admin/students?error=Invalid%20pending%20registration%20or%20class");
  }

  if (!student.date_of_birth) {
    redirect("/portal/admin/students?error=Date%20of%20birth%20is%20required%20before%20approval");
  }

  const { data: existingEnrollment } = await supabase
    .from("student_enrollments")
    .select("id")
    .eq("student_id", student_id)
    .eq("active", true)
    .maybeSingle();

  if (existingEnrollment) {
    redirect("/portal/admin/students?error=Pending%20student%20already%20has%20an%20active%20class");
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("student_enrollments")
    .insert({ student_id, class_id, active: true })
    .select("id")
    .single();

  if (enrollmentError || !enrollment) {
    redirect(`/portal/admin/students?error=${encodeURIComponent(enrollmentError?.message || "Could not place student")}`);
  }

  const { error: approvalError } = await supabase
    .from("profiles")
    .update({ approved: true, approved_at: new Date().toISOString(), frozen: false, frozen_at: null })
    .eq("id", student_id)
    .eq("approved", false);

  if (approvalError) {
    await supabase.from("student_enrollments").delete().eq("id", enrollment.id);
    redirect(`/portal/admin/students?error=${encodeURIComponent(approvalError.message)}`);
  }

  revalidatePath("/portal/admin/students");
  revalidatePath("/portal");
  redirect("/portal/admin/students?approved=1");
}

export async function moveStudent(formData: FormData) {
  const supabase = await requireAdmin();
  const student_id = String(formData.get("student_id") || "");
  const class_id = String(formData.get("class_id") || "");
  if (!student_id || !class_id) return;

  const [{ data: student }, { data: targetClass }] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", student_id).eq("role", "student").eq("approved", true).single(),
    supabase.from("classes").select("id").eq("id", class_id).eq("active", true).single(),
  ]);

  if (!student || !targetClass) {
    redirect("/portal/admin/students?error=Invalid%20student%20or%20class");
  }

  const { data: current } = await supabase
    .from("student_enrollments")
    .select("id, class_id")
    .eq("student_id", student_id)
    .eq("active", true)
    .maybeSingle();

  if (current?.class_id === class_id) redirect("/portal/admin/students");

  if (current) {
    const { error: deactivateError } = await supabase
      .from("student_enrollments")
      .update({ active: false })
      .eq("id", current.id);

    if (deactivateError) redirect(`/portal/admin/students?error=${encodeURIComponent(deactivateError.message)}`);
  }

  const { error: insertError } = await supabase
    .from("student_enrollments")
    .insert({ student_id, class_id, active: true });

  if (insertError) {
    if (current) await supabase.from("student_enrollments").update({ active: true }).eq("id", current.id);
    redirect(`/portal/admin/students?error=${encodeURIComponent(insertError.message)}`);
  }

  revalidatePath("/portal/admin/students");
  revalidatePath("/portal");
  redirect("/portal/admin/students?moved=1");
}

export async function manageStudentAccount(input: { studentId: string; action: "freeze" | "unfreeze" | "delete" }) {
  const supabase = await requireAdmin();
  const studentId = String(input.studentId || "").trim();
  const action = input.action;
  if (!studentId || !["freeze", "unfreeze", "delete"].includes(action)) {
    return { ok: false, error: "Invalid student account action." };
  }

  const { data, error } = await supabase.functions.invoke("admin-manage-student", {
    body: { student_id: studentId, action },
  });

  if (error || data?.error) {
    return { ok: false, error: data?.error || error?.message || "Could not update student account." };
  }

  revalidatePath("/portal/admin/students");
  revalidatePath("/portal");
  revalidatePath("/portal/admin/homework");
  return { ok: true };
}
