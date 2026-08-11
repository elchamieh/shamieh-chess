import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.shamiehchess.com"),
  applicationName: "Shamieh Chess Academy",
  title: {
    default: "Shamieh Chess Academy | Chess Training in Saida & Beirut",
    template: "%s | Shamieh Chess Academy",
  },
  description:
    "Structured chess training in Saida and Beirut for starters, beginners, intermediate and advanced players, plus public tournament registration.",
  keywords: [
    "Shamieh Chess Academy",
    "chess academy Lebanon",
    "chess training Saida",
    "chess training Beirut",
    "chess tournaments Lebanon",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Shamieh Chess Academy",
    title: "Shamieh Chess Academy | Saida & Beirut",
    description:
      "Structured chess training, academy classes and public tournaments in Saida and Beirut.",
    images: [
      {
        url: "/images/shamieh-community.webp",
        alt: "Shamieh Chess Academy students and coaches",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shamieh Chess Academy | Saida & Beirut",
    description: "Structured chess training and tournaments in Saida and Beirut.",
    images: ["/images/shamieh-community.webp"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
