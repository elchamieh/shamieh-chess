import type { Metadata } from "next";
import Link from "next/link";
import ShamiehLogo from "@/components/ShamiehLogo";
import { createClient } from "@/lib/supabase/server";
import { NewsPost, formatNewsDate, newsImageUrl } from "@/lib/news";
import "./news.css";

export const metadata: Metadata = {
  title: "News & Highlights | Shamieh Chess Academy",
  description: "International participation, player achievements, tournaments, academy news, and special highlights from Shamieh Chess Academy.",
  alternates: { canonical: "https://www.shamiehchess.com/news" },
};

export default async function NewsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_posts")
    .select("*")
    .order("featured", { ascending: false })
    .order("display_order", { ascending: false })
    .order("published_at", { ascending: false });
  const posts = (data || []) as NewsPost[];

  return (
    <main className="news-site">
      <header className="news-header">
        <Link href="/" aria-label="Shamieh Chess home"><ShamiehLogo /></Link>
        <nav className="news-nav" aria-label="News navigation">
          <Link href="/">Home</Link>
          <Link href="/tournaments">Tournaments</Link>
          <Link className="btn" href="/register">Join Academy</Link>
          <Link className="btn secondary" href="/login">Student Login</Link>
        </nav>
      </header>

      <section className="news-hero">
        <span className="news-eyebrow">SHAMIEH NEWS & HIGHLIGHTS</span>
        <h1>What&apos;s happening at Shamieh Chess.</h1>
        <p>Follow our international participation, academy achievements, tournaments, player milestones, and special stories from the Shamieh Chess community.</p>
      </section>

      <section className="news-grid">
        {!posts.length ? <div className="news-empty">New academy stories and highlights will be published here.</div> : posts.map((post, index) => {
          const imageUrl = newsImageUrl(supabase, post.image_path);
          const featured = index === 0 && post.featured;
          return (
            <article className={`news-card ${featured ? "featured" : ""}`} key={post.id}>
              <Link className="news-card-media" href={`/news/${post.slug}`}>
                {imageUrl ? <img src={imageUrl} alt={post.image_alt || post.title} loading={index < 2 ? "eager" : "lazy"} /> : <div className="news-card-placeholder">♞</div>}
              </Link>
              <div className="news-card-body">
                <div className="news-meta"><span className="news-category">{post.category}</span><span>{formatNewsDate(post)}</span>{post.featured ? <span>Featured</span> : null}</div>
                {featured ? <h2>{post.title}</h2> : <h3>{post.title}</h3>}
                <p>{post.summary}</p>
                <Link className="news-card-link" href={`/news/${post.slug}`}>Read story →</Link>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="news-footer">
        <div>Shamieh Chess Academy · Saida & Beirut</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}><Link href="/">Home</Link><Link href="/tournaments">Tournaments</Link><a href="https://www.facebook.com/shamieh.chess.academy" target="_blank" rel="noreferrer">Facebook</a></div>
      </footer>
    </main>
  );
}
