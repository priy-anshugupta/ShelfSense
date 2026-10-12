import type { Metadata } from "next";
import { AppProvider } from "@/components/provider";
import { Shell } from "@/components/shell";
import "./globals.css";
import "./upgrades.css";
export const metadata: Metadata = {
  title: {
    default: "ShelfSense — A world of books, a little guidance",
    template: "%s · ShelfSense",
  },
  description:
    "Find your next good read with a personal library assistant. Discover, refine, understand, and find books in your library.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
