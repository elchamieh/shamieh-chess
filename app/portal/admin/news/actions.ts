"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/access";
import { NEWS_CATEGORIES } from "@/lib/news";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, frozen, is_admin")
    .eq("id", user.id)
    .single();

  if (!hasAdminAccess(profile)) redirect("/portal");
  return { supabase, user };
}

function fail(message: string): never {
  redirect(`/portal/admin/news?error=${encodeURIComponent(message)}`);
}

function cleanText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function isHttpsUrl(value: string) {
  if (!value) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isManagedImagePath(value: string) {
  return /^posts\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(value);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "news";
}

function parseOrder(value: string) {
  const parsed = Number(value || 0);
  if (!Number.isInteger(parsed)) return 0;
  return Math.max(-1000, Math.min(1000, parsed));
}

function expiryValue(value: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value}T23:59:59Z`;
}

async function uploadImage(supabase: any, entry: FormDataEntryValue | null) {
  if (!(entry instanceof File) || entry.size === 0) return null;
  if (entry.size > 8 * 1024 * 1024) throw new Error("Image must be 8 MB or smaller.");

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByType[entry.type];
  if (!extension) throw new Error("Please upload a JPG, PNG, or WebP image.");

  const path = `posts/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("news-images").upload(path, entry, {
    contentType: entry.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message || "Could not upload the news image.");
  return path;
}

async function resolveUploadedImage(supabase: any, formData: FormData) {
  const directPath = cleanText(formData.get("uploaded_image_path"));
  if (directPath) {
    if (!isManagedImagePath(directPath)) throw new Error("Invalid uploaded image path.");
    return directPath;
  }
  return uploadImage(supabase, formData.get("image"));
}

async function makeUniqueSlug(supabase: any, title: string) {
  const base = slugify(title);
  const { data } = await supabase.from("news_posts").select("id").eq("slug", base).maybeSingle();
  if (!data) return base;
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

function revalidateNews(slug?: string) {
  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/portal/admin/news");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/news/${slug}`);
}

export async function createNewsPost(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const title = cleanText(formData.get("title"));
  const summary = cleanText(formData.get("summary"));
  const body = cleanText(formData.get("body"));
  const category = cleanText(formData.get("category"));
  const externalUrl = cleanText(formData.get("external_url"));
  const imageAlt = cleanText(formData.get("image_alt"));
  const eventDate = cleanText(formData.get("event_date"));
  const expiresOn = cleanText(formData.get("expires_on"));
  const featured = formData.get("featured") === "on";
  const published = formData.get("published") === "on";
  const displayOrder = parseOrder(cleanText(formData.get("display_order")));

  if (title.length < 3) fail("Please enter a title.");
  if (!summary) fail("Please enter a short summary.");
  if (summary.length > 500) fail("Summary must be 500 characters or fewer.");
  if (!NEWS_CATEGORIES.includes(category as any)) fail("Please choose a valid category.");
  if (!isHttpsUrl(externalUrl)) fail("External links must use HTTPS.");

  let imagePath: string | null = null;
  try {
    imagePath = await resolveUploadedImage(supabase, formData);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not upload image.");
  }

  const slug = await makeUniqueSlug(supabase, title);
  const { error } = await supabase.from("news_posts").insert({
    slug,
    title,
    summary,
    body,
    category,
    image_path: imagePath,
    image_alt: imageAlt || title,
    external_url: externalUrl || null,
    featured,
    published,
    published_at: published ? new Date().toISOString() : null,
    event_date: eventDate || null,
    expires_at: expiryValue(expiresOn),
    display_order: displayOrder,
    created_by: user.id,
  });

  if (error) {
    if (imagePath) await supabase.storage.from("news-images").remove([imagePath]);
    fail(error.message);
  }

  revalidateNews(slug);
  redirect("/portal/admin/news?saved=created");
}

export async function updateNewsPost(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = cleanText(formData.get("id"));
  if (!id) fail("News post is required.");

  const { data: existing, error: existingError } = await supabase
    .from("news_posts")
    .select("id, slug, image_path, published_at")
    .eq("id", id)
    .single();
  if (existingError || !existing) fail("News post was not found.");

  const title = cleanText(formData.get("title"));
  const summary = cleanText(formData.get("summary"));
  const body = cleanText(formData.get("body"));
  const category = cleanText(formData.get("category"));
  const externalUrl = cleanText(formData.get("external_url"));
  const imageAlt = cleanText(formData.get("image_alt"));
  const eventDate = cleanText(formData.get("event_date"));
  const expiresOn = cleanText(formData.get("expires_on"));
  const featured = formData.get("featured") === "on";
  const published = formData.get("published") === "on";
  const removeImage = formData.get("remove_image") === "on";
  const displayOrder = parseOrder(cleanText(formData.get("display_order")));

  if (title.length < 3) fail("Please enter a title.");
  if (!summary) fail("Please enter a short summary.");
  if (summary.length > 500) fail("Summary must be 500 characters or fewer.");
  if (!NEWS_CATEGORIES.includes(category as any)) fail("Please choose a valid category.");
  if (!isHttpsUrl(externalUrl)) fail("External links must use HTTPS.");

  let nextImagePath: string | null = removeImage ? null : existing.image_path;
  let uploadedPath: string | null = null;
  try {
    uploadedPath = await resolveUploadedImage(supabase, formData);
    if (uploadedPath) nextImagePath = uploadedPath;
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not upload image.");
  }

  const { error } = await supabase.from("news_posts").update({
    title,
    summary,
    body,
    category,
    image_path: nextImagePath,
    image_alt: imageAlt || title,
    external_url: externalUrl || null,
    featured,
    published,
    published_at: published ? (existing.published_at || new Date().toISOString()) : null,
    event_date: eventDate || null,
    expires_at: expiryValue(expiresOn),
    display_order: displayOrder,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) {
    if (uploadedPath) await supabase.storage.from("news-images").remove([uploadedPath]);
    fail(error.message);
  }

  if (existing.image_path && existing.image_path !== nextImagePath) {
    await supabase.storage.from("news-images").remove([existing.image_path]);
  }

  revalidateNews(existing.slug);
  redirect("/portal/admin/news?saved=updated");
}

export async function deleteNewsPost(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = cleanText(formData.get("id"));
  if (!id) fail("News post is required.");

  const { data: existing } = await supabase.from("news_posts").select("slug, image_path").eq("id", id).single();
  if (!existing) fail("News post was not found.");

  const { error } = await supabase.from("news_posts").delete().eq("id", id);
  if (error) fail(error.message);

  if (existing.image_path) await supabase.storage.from("news-images").remove([existing.image_path]);
  revalidateNews(existing.slug);
  redirect("/portal/admin/news?saved=deleted");
}
