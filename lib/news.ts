export const NEWS_CATEGORIES = [
  "International Participation",
  "Tournament",
  "Achievement",
  "Academy News",
  "Special Post",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type NewsPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: NewsCategory;
  image_path: string | null;
  image_alt: string;
  external_url: string | null;
  featured: boolean;
  published: boolean;
  published_at: string | null;
  event_date: string | null;
  expires_at: string | null;
  display_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function formatNewsDate(post: Pick<NewsPost, "event_date" | "published_at" | "created_at">) {
  const value = post.event_date || post.published_at || post.created_at;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    dateStyle: "medium",
  }).format(new Date(value));
}

export function newsImageUrl(supabase: any, path: string | null) {
  if (!path) return null;
  return supabase.storage.from("news-images").getPublicUrl(path).data.publicUrl as string;
}
