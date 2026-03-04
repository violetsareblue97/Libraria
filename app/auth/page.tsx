"use client";

// app/auth/page.tsx
// Halaman Login & Register Libraria menggunakan Supabase Auth.
// Toggle antara mode Login dan Register dalam satu halaman.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (!error && data.user) {
    await supabase.from("profiles").insert([{ id: data.user.id, full_name: fullName, email }]);
  }
  return { data, error: error?.message };
};

// ─── TIPE ─────────────────────────────────────────────────────────────────────

type AuthMode = "login" | "register";

interface FormState {
  fullName: string;
  email:    string;
  password: string;
  confirm:  string;
}

// ─── HELPER ───────────────────────────────────────────────────────────────────

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password minimal 8 karakter.";
  if (!/[A-Z]/.test(pw)) return "Password harus mengandung huruf kapital.";
  if (!/[0-9]/.test(pw)) return "Password harus mengandung angka.";
  return null;
}

// ─── KOMPONEN ────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [mode,      setMode]    = useState<AuthMode>("login");
  const [form,      setForm]    = useState<FormState>({ fullName:"", email:"", password:"", confirm:"" });
  const [showPw,    setShowPw]  = useState(false);
  const [loading,   setLoading] = useState(false);
  const [error,     setError]   = useState<string | null>(null);
  const [success,   setSuccess] = useState<string | null>(null);

  // Redirect jika sudah login
  useEffect(() => {
    if (!authLoading && user && profile) {
      router.push(profile.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, profile, authLoading, router]);

  function setField(k: keyof FormState, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
    setError(null);
  }

  // ── Submit Login ────────────────────────────────────────────────────────────
// ── Submit Login ────────────────────────────────────────────────────────────
async function handleLogin() {
  setLoading(true);
  setError(null);
  
  try {
    const { error: err, data } = await signIn(form.email, form.password);

    if (err) {
      setError("Email atau password salah.");
      setLoading(false);
      return;
    }

    if (data?.user) {
      // CARA PALING AMPUH:
      // Langsung pindah ke dashboard dan segarkan seluruh halaman
      window.location.assign("/dashboard");
    }
  } catch (e) {
    setError("Terjadi kesalahan sistem.");
    setLoading(false);
  }
}
  // ── Submit Register ─────────────────────────────────────────────────────────
  async function handleRegister() {
    if (!form.fullName.trim()) { setError("Nama lengkap wajib diisi."); return; }
    if (!form.email)           { setError("Email wajib diisi."); return; }
    const pwErr = validatePassword(form.password);
    if (pwErr) { setError(pwErr); return; }
    if (form.password !== form.confirm) { setError("Konfirmasi password tidak cocok."); return; }

    setLoading(true); setError(null);
    const { error: err } = await signUp(form.email, form.password, form.fullName);
    setLoading(false);

    if (err) {
      setError(
        err.includes("already registered") ? "Email ini sudah terdaftar. Silakan login." : err
      );
    } else {
      setSuccess("Akun berhasil dibuat! Cek email kamu untuk konfirmasi, lalu login.");
    }
  }

  // ── Style helpers ───────────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
    color: "white", fontSize: 14, padding: "12px 14px", outline: "none",
    transition: "border-color 0.2s",
  };

if (authLoading) {
  return (
    <div style={{ minHeight:"100vh", backgroundColor:"#020817", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color: "#5eead4" }}>Sedang memuat data...</div>
    </div>
  );
}

// JIKA PROFILE MASIH NULL, JANGAN TAMPILKAN LOADING, TAPI TAMPILKAN DATA DEFAULT
const activeProfile = profile || { 
  full_name: user?.email?.split('@')[0] || "User", 
  email: user?.email || "", 
  role: "member" 
};

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", backgroundColor:"#020817",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:24, position:"relative" }}>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        input::placeholder{color:rgba(255,255,255,0.25);}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      `}</style>

      

      {/* Back to home */}
      <a href="/" style={{ position:"absolute", top:24, left:24, display:"flex",
        alignItems:"center", gap:6, color:"rgba(255,255,255,0.4)", textDecoration:"none",
        fontSize:13, zIndex:10, transition:"color 0.2s" }}
        onMouseEnter={e=>((e.currentTarget as HTMLElement).style.color="white")}
        onMouseLeave={e=>((e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.4)")}>
        <ArrowLeft size={14}/> Beranda
      </a>

  
      {/* Card */}
      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:420,
        animation:"fadeUp 0.4s ease" }}>

        {/* Logo */}
        <div style={{ display: "ce", alignItems: "center", gap: "10px" }}>
          <a href="/" style={{ display: "block" }}>
          <Image 
          src="/logo.svg"
          alt="Libraria Logo" 
          width={250}
          height={80}
          style={{ 
          objectFit: "contain",
          display: "block"
        }} 
        priority
        />
        </a>
        </div>

        {/* Card body */}
        <div style={{ background:"rgba(255,255,255,0.03)",
          border:"1px solid rgba(255,255,255,0.09)", borderRadius:20,
          padding:32, backdropFilter:"blur(8px)" }}>

          {/* Tab toggle */}
          <div style={{ display:"flex", gap:0, background:"rgba(255,255,255,0.05)",
            borderRadius:12, padding:4, marginBottom:28 }}>
            {(["login","register"] as AuthMode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                style={{ flex:1, padding:"9px 0", border:"none", borderRadius:9,
                  fontSize:13, cursor:"pointer", transition:"all 0.2s", fontWeight:500,
                  background: mode===m ? "rgba(94,234,212,0.15)" : "transparent",
                  color: mode===m ? "#5eead4" : "rgba(255,255,255,0.4)" }}>
                {m === "login" ? "Masuk" : "Daftar"}
              </button>
            ))}
          </div>

          {/* Success state */}
          {success ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
              gap:14, padding:"24px 0", textAlign:"center" }}>
              <CheckCircle size={44} color="#22c55e"/>
              <p style={{ color:"white", fontSize:16, fontFamily:"Georgia,serif" }}>Pendaftaran Berhasil!</p>
              <p style={{ color:"rgba(255,255,255,0.5)", fontSize:13, lineHeight:1.6 }}>{success}</p>
              <button onClick={() => { setMode("login"); setSuccess(null); }}
                style={{ marginTop:8, padding:"10px 24px",
                  background:"rgba(94,234,212,0.15)", border:"1px solid rgba(94,234,212,0.3)",
                  borderRadius:999, color:"#5eead4", fontSize:13, cursor:"pointer" }}>
                Login Sekarang
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

              {/* Register: nama */}
              {mode === "register" && (
                <div>
                  <label style={{ color:"rgba(255,255,255,0.45)", fontSize:12,
                    display:"block", marginBottom:7 }}>Nama Lengkap</label>
                  <input value={form.fullName}
                    onChange={e => setField("fullName", e.target.value)}
                    placeholder="Nama lengkap kamu" style={inp}
                    onFocus={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(94,234,212,0.5)")}
                    onBlur={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)")} />
                </div>
              )}

              {/* Email */}
              <div>
                <label style={{ color:"rgba(255,255,255,0.45)", fontSize:12,
                  display:"block", marginBottom:7 }}>Email</label>
                <input type="email" value={form.email}
                  onChange={e => setField("email", e.target.value)}
                  placeholder="email@kamu.com" style={inp}
                  onFocus={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(94,234,212,0.5)")}
                  onBlur={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)")} />
              </div>

              {/* Password */}
              <div>
                <label style={{ color:"rgba(255,255,255,0.45)", fontSize:12,
                  display:"block", marginBottom:7 }}>Password</label>
                <div style={{ position:"relative" }}>
                  <input type={showPw ? "text" : "password"} value={form.password}
                    onChange={e => setField("password", e.target.value)}
                    onKeyDown={e => mode==="login" && e.key==="Enter" && handleLogin()}
                    placeholder={mode==="register" ? "Min. 8 karakter, huruf kapital, angka" : "Password"}
                    style={{ ...inp, paddingRight:44 }}
                    onFocus={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(94,234,212,0.5)")}
                    onBlur={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)")} />
                  <button onClick={() => setShowPw(v => !v)} style={{
                    position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer",
                    color:"rgba(255,255,255,0.35)", display:"flex", alignItems:"center" }}>
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>

              {/* Konfirmasi password */}
              {mode === "register" && (
                <div>
                  <label style={{ color:"rgba(255,255,255,0.45)", fontSize:12,
                    display:"block", marginBottom:7 }}>Konfirmasi Password</label>
                  <input type={showPw ? "text" : "password"} value={form.confirm}
                    onChange={e => setField("confirm", e.target.value)}
                    placeholder="Ulangi password" style={inp}
                    onFocus={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(94,234,212,0.5)")}
                    onBlur={e => ((e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)")} />
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 13px",
                  background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)",
                  borderRadius:9 }}>
                  <AlertTriangle size={14} color="#ef4444" style={{ marginTop:1, flexShrink:0 }}/>
                  <span style={{ color:"#fca5a5", fontSize:12.5, lineHeight:1.5 }}>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={mode === "login" ? handleLogin : handleRegister}
                disabled={loading}
                style={{ marginTop:4, padding:"13px 0",
                  background: loading ? "rgba(20,184,166,0.5)" : "#14b8a6",
                  border:"none", borderRadius:10, color:"white",
                  fontSize:14, fontWeight:600, cursor: loading ? "not-allowed" : "pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  transition:"background 0.2s", letterSpacing:"0.03em" }}>
                {loading
                  ? <><Loader2 size={15} style={{ animation:"spin 1s linear infinite"}}/> Memproses...</>
                  : mode === "login" ? "Masuk ke Libraria" : "Buat Akun"}
              </button>

              {/* Lupa password */}
              {/*{mode === "login" && (
                <button
                  onClick={async () => {
                    if (!form.email) { setError("Masukkan email terlebih dahulu."); return; }
                    setLoading(true);
                    const { error: e } = await import("@/lib/supabase").then(m =>
                      m.supabase.auth.resetPasswordForEmail(form.email)
                    );
                    setLoading(false);
                    if (e) setError(e.message);
                    else setSuccess("Link reset password sudah dikirim ke email kamu.");
                  }}
                  style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)",
                    fontSize:12, cursor:"pointer", textAlign:"center", padding:"4px 0",
                    transition:"color 0.2s" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#5eead4")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)")}>
                  Forget your Password?
                </button>
              )}*/}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}