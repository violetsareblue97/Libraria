import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/app/sidebar"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Libraria",
  description: "Find your next favorite read in our collection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body 
        className={`${geistSans.variable} ${geistMono.variable}`} 
        style={{ 
          backgroundColor: "#020817", 
          margin: 0, 
          color: "white",
          overflowX: "hidden" 
        }}
      >
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* Sidebar dipanggil di sini agar persisten. 
              Logika penyembunyian di halaman '/' atau '/auth' 
              sudah ditangani di dalam komponen Sidebar itu sendiri.
          */}
          <Sidebar />
          
          {/* Konten halaman utama */}
          <main style={{ 
            flex: 1, 
            position: "relative",
            display: "flex",
            flexDirection: "column",
            minWidth: 0 // Mencegah konten flex meluap
          }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}