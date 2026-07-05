import type { Metadata } from "next";
import {
  Cinzel_Decorative,
  EB_Garamond,
  Inter,
  JetBrains_Mono,
  Luckiest_Guy,
  Pixelify_Sans,
  Press_Start_2P,
} from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});
const luckiestGuy = Luckiest_Guy({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-luckiest",
});
const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixelify",
});
const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});
const cinzelDecorative = Cinzel_Decorative({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-cinzel",
});
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
});

const fontVariables = [
  inter.variable,
  jetbrainsMono.variable,
  luckiestGuy.variable,
  pixelifySans.variable,
  pressStart2P.variable,
  cinzelDecorative.variable,
  ebGaramond.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Sheza's Blogs",
  description: "Dev updates, design notes, and musings from Sheza.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
