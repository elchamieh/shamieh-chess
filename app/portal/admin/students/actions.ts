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

export async function createStudent(formData: FormData) {
  const supabase = await requireAdmin();
  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const class_id = String(formData.get("class_id") || "");

  const { data, error } = await supabase.functions.invoke("admin-create-student", {
    body: { full_name, email, password, class_id },
  });

  if (error || data?.error) {
    const message = encodeURIComponent(data?.error || error?.message || "Could not create student");
    redirect(`/portal/admin/students?error=${message}`);
  }

  revalidatePath("/portal/admin/students");
  revalidatePath("/portal");
  redirect("/portal/admin/students?created=1");
}

export async function moveStudent(formData: FormData) {
  const supabase = await requireAdmin();
  const student_id = String(formData.get("student_id") || "");
  const class_id = String(formData.get("class_id") || "");
  if (!student_id || !class_id) return;

  const [{ data: student }, { data: targetClass }] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", student_id).eq("role", "student").single(),
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

  if (current?.class_id === class_id) {
    redirect("/portal/admin/students");
  }

  if (current) {
    const { error: deactivateError } = await supabase
      .from("student_enrollments")
      .update({ active: false })
      .eq("id", current.id);

    if (deactivateError) {
      redirect(`/portal/admin/students?error=${encodeURIComponent(deactivateError.message)}`);
    }
  }

  const { error: insertError } = await supabase
    .from("student_enrollments")
    .insert({ student_id, class_id, active: true });

  if (insertError) {
    if (current) {
      await supabase.from("student_enrollments").update({ active: true }).eq("id", current.id);
    }
    redirect(`/portal/admin/students?error=${encodeURIComponent(insertError.message)}`);
  }

  revalidatePath("/portal/admin/students");
  revalidatePath("/portal");
  redirect("/portal/admin/students?moved=1");
}
