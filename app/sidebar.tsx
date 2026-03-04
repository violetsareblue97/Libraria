"use client";

import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { BookOpen, User, LogOut, Computer } from "lucide-react";
import { useAuth, signOut } from "@/lib/auth";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();

  // dont show sidebar on landing page or auth page
  const hiddenRoutes = ["/", "/auth"];
  if (hiddenRoutes.includes(pathname)) return null;

  // if profile hasnt loaded yet, use email as fallback name
  const activeProfile = profile || { 
    full_name: user?.email?.split('@')[0] || "User", 
    email: user?.email || "", 
  };

  const navItems = [
    { id: "Dashboard", label: "Dashboard", path: "/dashboard", icon: <Computer size={20}/> },
    { id: "Book List", label: "Book List", path: "/katalog", icon: <BookOpen size={20}/> },
  ];

  return (
    <aside style={{
      width: 220, flexShrink: 0, background: "#081021",
      borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", 
      flexDirection: "column", padding: "0 0 24px", position: "sticky", 
      top: 0, height: "100vh", zIndex: 50
    }}>
      
      {/* logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 16px" }}>
        <a style={{ display: "block" }}>
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

      {/* user info section */}
      <div style={{ 
        padding: "10px 0px 10px", 
        margin: "0 12px 16px", 
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        gap: 12
      }}>
        {/* avatar placeholder */}
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
          <User size={20} color="#5eead4" />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ 
            color: "white", 
            fontSize: 16, 
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

      {/* nav links */}
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
                fontSize: 14, textAlign: "left",
              }}>
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* logout at the bottom */}
      <div style={{ padding: "0 12px" }}>
        <button onClick={async () => { await signOut(); router.push("/"); }}
          style={{ 
            width: "100%", display: "flex", alignItems: "center", gap: 10, 
            padding: "10px 12px", borderRadius: 9, border: "none", 
            background: "rgba(239,68,68,0.06)", color: "rgba(239,68,68,0.7)", 
            cursor: "pointer", fontSize: 14 
          }}>
          <LogOut size={20}/> Keluar
        </button>
      </div>
    </aside>
  );
}