"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {Search, ArrowRight, Menu, X, Zap, Shield, Layers } from "lucide-react";
import Image from "next/image";

// Dynamic import untuk shader — mencegah error SSR karena WebGL butuh browser
const WarpShaderBackground = dynamic(
  () => import("@/components/ui/warp-shader"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, #020817 0%, #0c1a2e 50%, #071a2e 100%)",
        }}
      />
    ),
  }
);

// ─── DATA ───────────────────────────────────────────────────────────────────

// ─── KOMPONEN UTAMA ──────────────────────────────────────────────────────────

export default function LibrariaHeroPage() {
  const [menuOpen, setMenuOpen]         = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");

  function handleSearch() {
    if (!searchQuery.trim()) return;
    // TODO: ganti dengan router.push(`/katalog?q=${encodeURIComponent(searchQuery)}`)
    alert("Mencari: " + searchQuery);
  }

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // when user already logged in, we won't show login link
  function handleCTA() {
    if (user) router.push(user ? "/dashboard" : "/auth");
    else router.push("/auth");
  }

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        backgroundColor: "#020817",
      }}
    >
      {/* ── Layer 0: Shader WebGL ── */}
      <WarpShaderBackground />

      {/* ── Layer 1: Vignette gelap di pinggir ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(2,8,23,0.75) 100%)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      {/* ── Layer 2: Gradient bawah ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "200px",
          background: "linear-gradient(to top, rgba(2,8,23,0.9) 0%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "relative",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 48px",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <a href="/" style={{ display: "block" }}>
          <Image 
          src="/logo.svg"
          alt="Libraria Logo" 
          width={120}
          height={40}
          style={{ 
          objectFit: "contain",
          display: "block"
        }} 
        priority
        />
        </a>
        </div>

        {/* Desktop CTA */}
      </nav>

      {/* ── KONTEN UTAMA ── */}
      <section
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 90px)",
          padding: "32px 24px 96px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "900px", width: "100%" }}>

          {/* Headline */}
          <h1
            style={{
              color: "white",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(42px, 8vw, 88px)",
              fontWeight: 300,
              lineHeight: 1.05,
              margin: "0 0 24px",
              textShadow: "0 2px 40px rgba(0,0,0,0.5)",
            }}
          >
            Libraria{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, #5eead4 0%, #99f6e4 50%, #6ee7b7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            > Digital Library
            </span>
          </h1>

          {/* Subheadline */}
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "clamp(15px, 2.5vw, 19px)",
              fontWeight: 300,
              lineHeight: 1.7,
              maxWidth: "600px",
              margin: "0 auto 40px",
            }}
          >
            Find your next favorite read in our collection.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "48px",
            }}
          >
            <button
              onClick={handleCTA}
              disabled={authLoading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 32px",
                backgroundColor: "#14b8a6",
                borderRadius: "999px",
                color: "white",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s",
                cursor: authLoading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "#0d9488";
                (e.currentTarget as HTMLElement).style.transform =
                  "scale(1.03)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "#14b8a6";
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              }}
            >
              {user ? "Dashboard" : "Login"}<ArrowRight size={15} />
            </button>
            <a
              href="/auth"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 32px",
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "999px",
                color: "rgba(255,255,255,0.85)",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 500,
                backdropFilter: "blur(8px)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "rgba(255,255,255,0.12)";
                (e.currentTarget as HTMLElement).style.color = "white";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLElement).style.color =
                  "rgba(255,255,255,0.85)";
              }}
            >
            Register
                  </a>
                </div>
              </div>
            </section>
          </main>
        );
      }

