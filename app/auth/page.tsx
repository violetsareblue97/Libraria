"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// lazy load the shader so it doesnt break on server side
// WebGL needs the browser window to exist first
const WarpShaderBackground = dynamic(
  () => import("@/components/ui/warp-shader"),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: "fixed", inset: 0,
        background: "linear-gradient(135deg, #020817 0%, #0c1a2e 50%, #071a2e 100%)",
        zIndex: 0,
      }} />
    ),
  }
);

// just wrapping supabase calls so the page code stays cleaner
const signIn = async (email: string, password: string) =>
  await supabase.auth.signInWithPassword({ email, password });

const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (!error && data.user) {
    // create profile in 'profiles' table after successful registration
    await supabase.from("profiles").insert([{ id: data.user.id, full_name: fullName, email }]);
  }
  return { data, error: error?.message };
};

type AuthMode = "login" | "register";
interface FormState { fullName: string; email: string; password: string; confirm: string; }

// basic password rules - could be more strict but this is fine for now
function validatePassword(pw: string): string | null {
  if (pw.length < 8)       return "At least 8 characters.";
  if (!/[A-Z]/.test(pw))  return "At least 1 uppercase letter.";
  if (!/[0-9]/.test(pw))  return "At least 1 number.";
  return null;
}

export default function AuthPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [mode,    setMode]    = useState<AuthMode>("login");
  const [form,    setForm]    = useState<FormState>({ fullName:"", email:"", password:"", confirm:"" });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // clear error when user starts typing again
  function setField(k: keyof FormState, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
    setError(null);
  }

  async function handleLogin() {
    setLoading(true); setError(null);
    try {
      const { error: err, data } = await signIn(form.email, form.password);
      if (err) { setError("Invalid email or password."); setLoading(false); return; }
      
      // reload to dashboard if login success
      if (data?.user) window.location.assign("/dashboard");
    } catch (err) {
      console.log("login fail", err); 
      setError("Error during login."); setLoading(false);
    }
  }

  async function handleRegister() {
    // check before submit
    if (!form.fullName.trim()) { setError("Full name is required."); return; }
    if (!form.email)           { setError("Email is required."); return; }
    
    const pwErr = validatePassword(form.password);
    if (pwErr) { setError(pwErr); return; }
    
    if (form.password !== form.confirm) { 
      setError("Password confirmation does not match."); 
      return; 
    }

    setLoading(true); setError(null);
    const { error: err } = await signUp(form.email, form.password, form.fullName);
    setLoading(false);
    
    if (err) {
      setError(err.includes("already registered") ? "Email already exists, try login." : err);
    } else {
      setSuccess("Account created! Now you can login.");
    }
  }

  // shared input style - defined here so i dont repeat it for every field
  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
    color: "white", fontSize: 14, padding: "12px 14px", outline: "none",
    transition: "border-color 0.2s",
    fontFamily: "var(--font-dm-sans), sans-serif",
  };

  // wait for session check before showing anything
  if (authLoading) return (
    <div style={{ minHeight:"100vh", backgroundColor:"#020817", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color: "#5eead4" }}>Sedang memuat...</div>
    </div>
  );

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", backgroundColor: "#020817" }}>
      
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* shader background - same one used in hero page */}
      <WarpShaderBackground />

      {/* dark overlay so the form is still readable over the shader */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2,
        background: "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(2,8,23,0.8) 100%)",
      }} />

      {/* fade out at the bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 200, pointerEvents: "none", zIndex: 3,
        background: "linear-gradient(to top, rgba(2,8,23,0.9) 0%, transparent 100%)",
      }} />

      <div style={{
        position: "relative", zIndex: 10,
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 24,
      }}>

        {/* back to home */}
        <a href="/" style={{
          position: "absolute", top: 24, left: 24,
          display: "flex", alignItems: "center", gap: 6,
          color: "rgba(255,255,255,0.4)", textDecoration: "none",
          fontSize: 16, transition: "color 0.2s",
        }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "white")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#ffffffc5")}>
          <ArrowLeft size={20} /> Back
        </a>

        <div style={{ width: "100%", maxWidth: 420}}>

          <a style={{
            display: "flex", 
            justifyContent: "center", 
            marginBottom: 8 
          }}>
            <Image 
              src="/logo.svg" 
              alt="Libraria" 
              width={150} 
              height={48}
              style={{ objectFit: "contain" }} 
              priority 
            />
          </a>

          {/* main form card */}
          <div style={{
            background: "#0a1228b3",
            border: "2px solid rgba(255,255,255,0.1)",
            borderRadius: 20, padding: 32,
            boxShadow: "50px rgba(0,0,0,0.5)",
          }}>

            {/* toggle between login and register */}
            <div style={{ display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:12, padding:4, marginBottom:28 }}>
              {(["login","register"] as AuthMode[]).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                  style={{
                    flex: 1, padding: "9px 0", border: "none", borderRadius: 9,
                    fontSize: 15, cursor: "pointer", transition: "all 0.2s", fontWeight: 500,
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    background: mode===m ? "#07ffda4f" : "transparent",
                    color: mode===m ? "#ffffff" : "rgba(255, 255, 255, 0.34)",
                  }}>
                  {m === "login" ? "Login" : "Register"}
                </button>
              ))}
            </div>

            {/* show success screen after register */}
            {success ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, padding:"24px 0", textAlign:"center" }}>
                <CheckCircle size={44} color="#22c55e" />
                <p style={{ color:"white", fontSize:16 }}>Successfully Registered!</p>
                <p style={{ color:"rgba(255,255,255,0.5)", fontSize:13, lineHeight:1.6 }}>{success}</p>
                <button onClick={() => { setMode("login"); setSuccess(null); }}
                  style={{ marginTop:8, padding:"10px 24px", background:"rgba(94,234,212,0.15)",
                    border:"1px solid rgba(94,234,212,0.3)", borderRadius:999,
                    color:"#5eead4", fontSize:13, cursor:"pointer",
                    fontFamily: "var(--font-dm-sans), sans-serif"}}>
                  Login Now
                </button>
              </div>
            ) : (

              // the actual form fields
              <div style={{ display:"flex", flexDirection:"column", gap:25}}>

                {/* only show name field when registering */}
                {mode === "register" && (
                  <div>
                    <label style={{ color:"rgb(255, 255, 255)", fontSize:12, display:"block", marginBottom:7, fontFamily: "var(--font-dm-sans), sans-serif" }}>Full Name</label>
                    <input value={form.fullName} onChange={e => setField("fullName", e.target.value)}
                      placeholder="Full Name" style={inp}
                      onFocus={e => (e.target.style.borderColor = "rgba(94,234,212,0.5)")}
                      onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                  </div>
                )}

                <div>
                  <label style={{ color:"rgb(255, 255, 255)", fontSize:12, display:"block", marginBottom:7, fontFamily: "var(--font-dm-sans), sans-serif"  }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setField("email", e.target.value)}
                    placeholder="your@email.com" style={inp}
                    onFocus={e => (e.target.style.borderColor = "rgba(94,234,212,0.5)")}
                    onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                </div>

                <div>
                  <label style={{ color:"rgb(255, 255, 255)", fontSize:12, display:"block", marginBottom:7, fontFamily: "var(--font-dm-sans), sans-serif" }}>Password</label>
                  <div style={{ position:"relative" }}>
                    <input type={showPw ? "text" : "password"} value={form.password}
                      onChange={e => setField("password", e.target.value)}
                      onKeyDown={e => mode==="login" && e.key==="Enter" && handleLogin()}
                      placeholder={mode==="register" ? "Min 8 chars, 1 Uppercase, and 1 Number" : "Password"}
                      style={{ ...inp, paddingRight:44 }}
                      onFocus={e => (e.target.style.borderColor = "rgba(94,234,212,0.5)")}
                      onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                    {/* eye toggle */}
                    <button onClick={() => setShowPw(v => !v)} style={{
                      position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                      background:"none", border:"none", cursor:"pointer",
                      color:"rgba(255,255,255,0.35)", display:"flex", alignItems:"center" }}>
                      {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>

                {/* confirm password only needed on register */}
                {mode === "register" && (
                  <div>
                    <label style={{ color:"#ffffff", fontSize:12, display:"block", marginBottom:7, fontFamily: "var(--font-dm-sans), sans-serif" }}>Confirm Password</label>
                    <input type={showPw ? "text" : "password"} value={form.confirm}
                      onChange={e => setField("confirm", e.target.value)}
                      placeholder="Confirm Password" style={inp}
                      onFocus={e => (e.target.style.borderColor = "rgba(94,234,212,0.5)")} 
                      onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                  </div>
                )}

                {/* error banner */}
                {error && (
                  <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 13px",
                    background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:9 }}>
                    <AlertTriangle size={14} color="#ef4444" style={{ marginTop:1, flexShrink:0 }}/>
                    <span style={{ color:"#fca5a5", fontSize:12.5, lineHeight:1.5 }}>{error}</span>
                  </div>
                )}

                <button onClick={mode === "login" ? handleLogin : handleRegister}
                  disabled={loading}
                  style={{
                    marginTop: 16, padding: "14px 0",
                    background: loading ? "rgba(20,184,166,0.5)" : "#14b8a6",
                    border: "none", borderRadius: 14, color: "white",
                    fontSize: 16, fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                  }}>
                  {loading
                    ? <><Loader2/> loading...</>
                    : mode === "login" ? "Login to Libraria" : "Create Account"
                  }
                </button>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}