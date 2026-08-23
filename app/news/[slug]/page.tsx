import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShamiehLogo from "@/components/ShamiehLogo";
import { createClient } from "@/lib/supabase/server";
import { NewsPost, formatNewsDate, newsImageUrl } from "@/lib/news";
import "../news.css";

async function getPost(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("news_posts").select("*").eq("slug", slug).maybeSingle();
  return { supabase, post: data as NewsPost | null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { supabase, post } = await getPost(slug);
  if (!post) return { title: "News | Shamieh Chess Academy" };
  const imageUrl = newsImageUrl(supabase, post.image_path);
  return {
    title: `${post.title} | Shamieh Chess Academy`,
    description: post.summary,
    alternates: { canonical: `https://www.shamiehchess.com/news/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      url: `https://www.shamiehchess.com/news/${post.slug}`,
      images: imageUrl ? [{ url: imageUrl, alt: post.image_alt || post.title }] : undefined,
    },
  };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, post } = await getPost(slug);
  if (!post) notFound();
  const imageUrl = newsImageUrl(supabase, post.image_path);

  return (
    <main className="news-site">
      <header className="news-header">
        <Link href="/" aria-label="Shamieh Chess home"><ShamiehLogo /></Link>
        <nav className="news-nav" aria-label="News navigation">
          <Link href="/">Home</Link>
          <Link href="/news">All News</Link>
          <Link href="/tournaments">Tournaments</Link>
          <Link className="btn secondary" href="/login">Student Login</Link>
        </nav>
      </header>

      <article className="news-article">
        <Link className="news-article-back" href="/news">← All News & Highlights</Link>
        <div className="news-meta"><span className="news-category">{post.category}</span><span>{formatNewsDate(post)}</span>{post.featured ? <span>Featured</span> : null}</div>
        <h1>{post.title}</h1>
        <p className="news-article-summary">{post.summary}</p>
        {imageUrl ? <img className="news-article-image" src={imageUrl} alt={post.image_alt || post.title} /> : null}
        {post.body ? <div className="news-article-body">{post.body}</div> : null}
        <div className="news-article-actions">
          {post.external_url ? <a className="btn" href={post.external_url} target="_blank" rel="noopener noreferrer">Open related post ↗</a> : null}
          <Link className="btn secondary" href="/news">More news</Link>
        </div>
      </article>

      <footer className="news-footer">
        <div>Shamieh Chess Academy · Saida & Beirut</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}><Link href="/">Home</Link><Link href="/news">News</Link><Link href="/tournaments">Tournaments</Link></div>
      </footer>
    </main>
  );
}
