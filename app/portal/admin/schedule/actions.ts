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
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || profile?.approved !== true) redirect("/portal");
  return { supabase, user };
}

function refreshSchedulePages() {
  revalidatePath("/");
  revalidatePath("/portal");
  revalidatePath("/portal/schedule");
  revalidatePath("/portal/admin/schedule");
}

export async function createTrainingSessions(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const classId = String(formData.get("class_id") || "").trim();
  const deliveryMode = String(formData.get("delivery_mode") || "").trim();
  const startTime = String(formData.get("start_time") || "").trim();
  const endTime = String(formData.get("end_time") || "").trim();
  const dates = [...new Set(formData.getAll("dates").map((value) => String(value).trim()).filter(Boolean))];

  if (!classId || !["live", "online"].includes(deliveryMode) || !startTime || !endTime || !dates.length) {
    redirect("/portal/admin/schedule?error=Class%2C%20mode%2C%20time%20and%20at%20least%20one%20date%20are%20required");
  }

  if (endTime <= startTime) {
    redirect("/portal/admin/schedule?error=End%20time%20must%20be%20after%20start%20time");
  }

  if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    redirect("/portal/admin/schedule?error=One%20or%20more%20training%20dates%20are%20invalid");
  }

  const { data: classRow } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("active", true)
    .maybeSingle();

  if (!classRow) redirect("/portal/admin/schedule?error=Please%20choose%20an%20active%20class");

  const rows = dates.map((sessionDate) => ({
    class_id: classId,
    delivery_mode: deliveryMode,
    session_date: sessionDate,
    start_time: startTime,
    end_time: endTime,
    active: true,
    created_by: user.id,
  }));

  const { error } = await supabase
    .from("training_sessions")
    .upsert(rows, {
      onConflict: "class_id,delivery_mode,session_date,start_time,end_time",
      ignoreDuplicates: true,
    });

  if (error) redirect(`/portal/admin/schedule?error=${encodeURIComponent(error.message)}`);

  refreshSchedulePages();
  redirect(`/portal/admin/schedule?created=${dates.length}`);
}

export async function deleteTrainingSession(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  const { error } = await supabase.from("training_sessions").delete().eq("id", id);
  if (error) redirect(`/portal/admin/schedule?error=${encodeURIComponent(error.message)}`);

  refreshSchedulePages();
  redirect("/portal/admin/schedule?deleted=1");
}
