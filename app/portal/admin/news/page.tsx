import Link from "next/link";
import { redirect } from "next/navigation";
import PortalShell from "@/components/PortalShell";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/access";
import { NEWS_CATEGORIES, NewsPost, formatNewsDate, newsImageUrl } from "@/lib/news";
import { createNewsPost, deleteNewsPost, updateNewsPost } from "./actions";

function dateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved, frozen, is_admin")
    .eq("id", user.id)
    .single();
  if (!hasAdminAccess(profile)) redirect("/portal");

  const { data } = await supabase
    .from("news_posts")
    .select("*")
    .order("featured", { ascending: false })
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });
  const posts = (data || []) as NewsPost[];

  return (
    <PortalShell title="News & Highlights" role="Admin">
      <div style={{ marginBottom: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="btn secondary" href="/portal">← Admin dashboard</Link>
        <Link className="btn secondary" href="https://www.shamiehchess.com/news" target="_blank">View public news ↗</Link>
      </div>

      {params.saved ? <div className="card" style={{ marginBottom: 18 }}><b>News post {params.saved} successfully.</b></div> : null}
      {params.error ? <div className="card" style={{ marginBottom: 18 }}><b>Could not save:</b> {params.error}</div> : null}

      <div className="grid">
        <div className="card span5">
          <span className="pill">New story</span>
          <h2 style={{ marginTop: 12 }}>Publish a highlight</h2>
          <p className="small">Use this for international participation, achievements, academy events, tournament news, or special posts. Published stories can appear on the homepage and in the News archive.</p>

          <form action={createNewsPost} style={{ marginTop: 18 }}>
            <label className="field"><span>Title</span><input className="input" name="title" required maxLength={180} placeholder="Shamieh Chess in Cappadocia 2026" /></label>
            <label className="field"><span>Short summary</span><textarea className="input" name="summary" required maxLength={500} rows={3} placeholder="A short introduction shown on the homepage and news cards." /></label>
            <label className="field"><span>Full story / post text</span><textarea className="input" name="body" rows={8} placeholder="Write the full story here. Line breaks will be preserved." /></label>
            <label className="field"><span>Category</span><select className="input" name="category" defaultValue="Academy News">{NEWS_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="field"><span>Main image</span><input className="input" type="file" name="image" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG or WebP · maximum 8 MB</small></label>
            <label className="field"><span>Image description (optional)</span><input className="input" name="image_alt" maxLength={240} placeholder="Players and coach representing Shamieh Chess in Turkey" /></label>
            <label className="field"><span>External link (optional)</span><input className="input" type="url" name="external_url" placeholder="https://www.facebook.com/..." /><small>Useful for Facebook, Instagram, Chess-Results, or another official source.</small></label>
            <div className="grid" style={{ gap: 12 }}>
              <label className="field span6"><span>Event date (optional)</span><input className="input" type="date" name="event_date" /></label>
              <label className="field span6"><span>Expiry date (optional)</span><input className="input" type="date" name="expires_on" /><small>After this date it automatically disappears from the public site.</small></label>
            </div>
            <label className="field" style={{ maxWidth: 180 }}><span>Priority</span><input className="input" type="number" name="display_order" defaultValue="0" min="-1000" max="1000" /><small>Higher numbers appear first.</small></label>
            <label style={{ display: "flex", gap: 9, alignItems: "center", margin: "14px 0" }}><input type="checkbox" name="featured" /> <b>Featured on homepage</b></label>
            <label style={{ display: "flex", gap: 9, alignItems: "center", margin: "14px 0 18px" }}><input type="checkbox" name="published" /> <b>Publish now</b></label>
            <button className="btn" type="submit">Create news post</button>
          </form>
        </div>

        <div className="card span7">
          <div className="row" style={{ alignItems: "flex-start" }}>
            <div><h2>Manage stories</h2><p className="small">Edit content, replace images, feature important stories, save drafts, or remove old posts.</p></div>
            <span className="pill">{posts.length} post{posts.length === 1 ? "" : "s"}</span>
          </div>

          {!posts.length ? <p className="small">No news posts yet. Create your first story using the form.</p> : (
            <div className="list" style={{ marginTop: 14 }}>
              {posts.map((post) => {
                const imageUrl = newsImageUrl(supabase, post.image_path);
                return (
                  <div className="card" key={post.id} style={{ boxShadow: "none" }}>
                    <div className="row" style={{ alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 7 }}>
                          <span className="pill">{post.category}</span>
                          <span className="pill">{post.published ? "Published" : "Draft"}</span>
                          {post.featured ? <span className="pill">Featured</span> : null}
                        </div>
                        <b>{post.title}</b>
                        <div className="small" style={{ marginTop: 4 }}>{formatNewsDate(post)} · priority {post.display_order}</div>
                      </div>
                      {post.published ? <Link className="btn secondary" href={`https://www.shamiehchess.com/news/${post.slug}`} target="_blank">Open ↗</Link> : null}
                    </div>

                    {imageUrl ? <img src={imageUrl} alt={post.image_alt || post.title} style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 14, marginTop: 14 }} /> : null}

                    <form action={updateNewsPost} style={{ marginTop: 16 }}>
                      <input type="hidden" name="id" value={post.id} />
                      <label className="field"><span>Title</span><input className="input" name="title" defaultValue={post.title} required maxLength={180} /></label>
                      <label className="field"><span>Short summary</span><textarea className="input" name="summary" defaultValue={post.summary} required maxLength={500} rows={3} /></label>
                      <label className="field"><span>Full story / post text</span><textarea className="input" name="body" defaultValue={post.body} rows={7} /></label>
                      <label className="field"><span>Category</span><select className="input" name="category" defaultValue={post.category}>{NEWS_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                      <label className="field"><span>Replace image</span><input className="input" type="file" name="image" accept="image/jpeg,image/png,image/webp" /></label>
                      {post.image_path ? <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "0 0 12px" }}><input type="checkbox" name="remove_image" /> Remove current image</label> : null}
                      <label className="field"><span>Image description</span><input className="input" name="image_alt" defaultValue={post.image_alt} maxLength={240} /></label>
                      <label className="field"><span>External link</span><input className="input" type="url" name="external_url" defaultValue={post.external_url || ""} /></label>
                      <div className="grid" style={{ gap: 12 }}>
                        <label className="field span6"><span>Event date</span><input className="input" type="date" name="event_date" defaultValue={dateInput(post.event_date)} /></label>
                        <label className="field span6"><span>Expiry date</span><input className="input" type="date" name="expires_on" defaultValue={dateInput(post.expires_at)} /></label>
                      </div>
                      <label className="field" style={{ maxWidth: 180 }}><span>Priority</span><input className="input" type="number" name="display_order" defaultValue={post.display_order} min="-1000" max="1000" /></label>
                      <label style={{ display: "flex", gap: 9, alignItems: "center", margin: "14px 0" }}><input type="checkbox" name="featured" defaultChecked={post.featured} /> <b>Featured on homepage</b></label>
                      <label style={{ display: "flex", gap: 9, alignItems: "center", margin: "14px 0 18px" }}><input type="checkbox" name="published" defaultChecked={post.published} /> <b>Published</b></label>
                      <button className="btn" type="submit">Save changes</button>
                    </form>

                    <form action={deleteNewsPost} style={{ marginTop: 10 }}>
                      <input type="hidden" name="id" value={post.id} />
                      <button className="btn secondary" type="submit">Delete post</button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
