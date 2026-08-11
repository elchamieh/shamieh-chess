import Link from "next/link";

export default function ShamiehLogo({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={`logo-link ${className}`.trim()} aria-label="Shamieh Chess Academy home">
      <img className="shamieh-logo" src="/shamieh-logo.svg" alt="Shamieh Chess Academy" />
    </Link>
  );
}
