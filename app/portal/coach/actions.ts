"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createHomework(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "coach" || !profile.approved) redirect("/portal");

  const class_id = String(formData.get("class_id") || "");
  const title = String(formData.get("title") || "").trim();
  const instructions = String(formData.get("instructions") || "").trim() || null;
  const attachment_url = String(formData.get("attachment_url") || "").trim() || null;
  const due_date = String(formData.get("due_date") || "").trim() || null;

  if (!class_id || !title) redirect("/portal?homework_error=Missing%20class%20or%20title");

  const { error } = await supabase.from("homework").insert({
    class_id,
    created_by: user.id,
    title,
    instructions,
    attachment_url,
    due_date,
    published: true,
  });

  if (error) redirect(`/portal?homework_error=${encodeURIComponent(error.message)}`);

  revalidatePath("/portal");
  redirect("/portal?homework_created=1");
}
