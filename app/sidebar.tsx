"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { BookOpen, User, LogOut, Computer } from "lucide-react";
import { useAuth, signOut } from "@/lib/auth";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const hiddenRoutes = ["/", "/auth"];
  if (hiddenRoutes.includes(pathname)) return null;

  // Mengambil data dari profile atau fallback ke email user
  const activeProfile = profile || { 
    full_name: user?.email?.split('@')[0] || "User", 
    email: user?.email || "", 
  };

  const navItems = [
    { id: "Dashboard", label: "Dashboard", path: "/dashboard", icon: <Computer size={15}/> },
    { id: "Book List", label: "Book List", path: "/katalog", icon: <BookOpen size={15}/> },
  ];

  return (
    <aside style={{
      width: 220, flexShrink: 0, background: "rgba(255,255,255,0.02)",
      borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", 
      flexDirection: "column", padding: "0 0 24px", position: "sticky", 
      top: 0, height: "100vh", zIndex: 50
    }}>
      
      {/* BAGAN LOGO */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 12px" }}>
        <a href="/" style={{ display: "block" }}>
          <Image 
            src="/logo.svg"
            alt="Libraria Logo" 
            width={120}
            height={40}
            style={{ objectFit: "contain", display: "block" }} 
            priority
          />
        </a>
      </div>

      {/* BAGAN USER PROFILE (BARU) */}
      <div style={{ 
        padding: "0 12px 24px", 
        margin: "0 12px 16px", 
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        gap: 12
      }}>
        <div style={{ 
          width: 36, 
          height: 36, 
          borderRadius: 8, 
          background: "rgba(94,234,212,0.1)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          flexShrink: 0
        }}>
          <User size={18} color="#5eead4" />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ 
            color: "white", 
            fontSize: 13, 
            fontWeight: 500, 
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {activeProfile.full_name}
          </p>
          <p style={{ 
            color: "rgba(255,255,255,0.4)", 
            fontSize: 11, 
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {activeProfile.email}
          </p>
        </div>
      </div>

      {/* NAVIGASI */}
      <nav style={{ flex: 1, padding: "0 12px" }}>
        {navItems.map((item) => {
          const active = pathname === item.path;
          return (
            <button key={item.id} onClick={() => router.push(item.path)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 9, border: "none",
                cursor: "pointer", marginBottom: 4,
                background: active ? "rgba(94,234,212,0.12)" : "transparent",
                color: active ? "#5eead4" : "rgba(255,255,255,0.5)",
                fontSize: 13, textAlign: "left",
              }}>
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* TOMBOL KELUAR */}
      <div style={{ padding: "0 12px" }}>
        <button onClick={async () => { await signOut(); router.push("/"); }}
          style={{ 
            width: "100%", display: "flex", alignItems: "center", gap: 10, 
            padding: "10px 12px", borderRadius: 9, border: "none", 
            background: "rgba(239,68,68,0.06)", color: "rgba(239,68,68,0.7)", 
            cursor: "pointer", fontSize: 13 
          }}>
          <LogOut size={15}/> Keluar
        </button>
      </div>
    </aside>
  );
}