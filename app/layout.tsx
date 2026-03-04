// root layout - wraps every page in the app
// sidebar is rendered here so it persist across navigation

import { DM_Sans, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import Sidebar from "@/app/sidebar";

// main font - clean and readable
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// secondary font, used for headlines on the hero page
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  variable: "--font-libre-baskerville",
  weight: ["400", "700"],
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${dmSans.variable} ${libreBaskerville.variable}`}>
      <body
        style={{
          fontFamily: "var(--font-dm-sans), sans-serif",
          backgroundColor: "#152432",
          margin: 0,
          color: "white",
          overflowX: "hidden",
        }}
      >
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* sidebar handles its own visibility (hidden on / and /auth) */}
          <Sidebar />
          <main style={{
            flex: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            minWidth: 0, // prevents flex overflow
          }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}