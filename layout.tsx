// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allo Inventory",
  description: "Inventory & Reservation Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav
          style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
          }}
          className="sticky top-0 z-50"
        >
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 no-underline">
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "var(--green)",
                  fontWeight: 600,
                  fontSize: "1.1rem",
                  letterSpacing: "-0.03em",
                }}
              >
                allo
              </span>
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                /inventory
              </span>
            </a>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                padding: "3px 10px",
                borderRadius: "100px",
              }}
            >
              multi-warehouse ·{" "}
              <span style={{ color: "var(--green)" }}>live</span>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
