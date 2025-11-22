export const metadata = {
  title: "Agentic Researcher",
  description: "Autonomous web research and reporting agent",
};

import "./globals.css";
import React from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </body>
    </html>
  );
}

