import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shamieh Chess Academy | Saida & Beirut",
  description: "Shamieh Chess Academy in Saida and Beirut — structured chess training, academy classes, and public tournament registration."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
