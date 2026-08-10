import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shamieh Chess",
  description: "Shamieh Chess Academy platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
