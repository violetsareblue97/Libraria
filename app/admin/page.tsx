"use client";

// app/admin/page.tsx
// Dashboard Admin Libraria — monitoring semua pinjaman, stok, statistik.

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Users, AlertTriangle, CheckCircle, RotateCcw,
  Loader2, LogOut, Search, Filter, Package, TrendingUp,
  Clock, Calendar, ChevronDown, X, Edit2, Save, User,
} from "lucide-react";
import { useAuth, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Transaction } from "@/lib/types/open-library";

// ─── TIPE ─────────────────────────────────────────────────────────────────────

interface BookRow {
  id: string;
  google_books_id: string;
  title: string;
  authors: string;
  cover_url: string | null;
  stock_count: number;
  categories: string | null;
  language: string;
}

interface Summary {
  total_borrowed: number;
  total_returned: number;
  total_overdue: number;
  total_unique_borrowers: number;
  total_unique_books: number;
}

type AdminTab = "overview" | "pinjaman" | "stok" | "pengguna";
type FilterStatus = "all" | "borrowed" | "returned" | "overdue";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
function daysLeft(due: string) {
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
}
function badgeColor(status: string, due?: string) {
  if (status==="returned") return "#22c55e";
  if (status==="overdue")  return "#ef4444";
  if (due && daysLeft(due)<0) return "#ef4444";
  if (due && daysLeft(due)<=2) return "#f59e0b";
  return "#5eead4";
}

// ─── KOMPONEN UTAMA ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [activeTab,    setActiveTab]    = useState<AdminTab>("overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [books,        setBooks]        = useState<BookRow[]>([]);
  const [summary,      setSummary]      = useState<Summary | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [returning,    setReturning]    = useState<string | null>(null);
  const [searchTrx,    setSearchTrx]   = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [stockVal,     setStockVal]    = useState(0);
  const [savingStock,  setSavingStock] = useState(false);

  // Guard: hanya admin yang boleh akses
  useEffect(() => {
    if (!authLoading && !user)                    router.push("/auth");
    if (!authLoading && profile?.role === "member") router.push("/dashboard");
  }, [authLoading, user, profile, router]);

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [trxRes, booksRes, sumRes] = await Promise.all([
      supabase.from("transactions").select("*").order("borrowed_at", { ascending: false }),
      supabase.from("books").select("id,google_books_id,title,authors,cover_url,stock_count,categories,language").order("title"),
      supabase.from("admin_loan_summary").select("*").single(),
    ]);
    setTransactions((trxRes.data as Transaction[]) ?? []);
    setBooks((booksRes.data as BookRow[]) ?? []);
    setSummary(sumRes.data as Summary ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { if (profile?.role === "admin") fetchAll(); }, [profile, fetchAll]);

  // ── Return book (admin) ─────────────────────────────────────────────────────

  async function handleAdminReturn(trxId: string, bookId: string) {
    setReturning(trxId);
    const { error } = await supabase.from("transactions")
      .update({ status:"returned", returned_at: new Date().toISOString() })
      .eq("id", trxId);
    if (!error) {
      const { data: bk } = await supabase.from("books")
        .select("stock_count").eq("id", bookId).single();
      if (bk) await supabase.from("books")
        .update({ stock_count:(bk.stock_count??0)+1 }).eq("id", bookId);
      await fetchAll();
    }
    setReturning(null);
  }

  // ── Update stok buku ────────────────────────────────────────────────────────

  async function handleSaveStock(bookId: string) {
    setSavingStock(true);
    await supabase.from("books").update({ stock_count: stockVal }).eq("id", bookId);
    setSavingStock(false);
    setEditingStock(null);
    await fetchAll();
  }

  // ── Filter transaksi ────────────────────────────────────────────────────────

  const filteredTrx = transactions.filter(t => {
    const matchSearch = !searchTrx || (
      t.book_title.toLowerCase().includes(searchTrx.toLowerCase()) ||
      t.borrower_name.toLowerCase().includes(searchTrx.toLowerCase()) ||
      t.borrower_email.toLowerCase().includes(searchTrx.toLowerCase())
    );
    let matchStatus = true;
    if (filterStatus === "overdue") {
      matchStatus = t.status === "borrowed" && daysLeft(t.due_date) < 0;
    } else if (filterStatus !== "all") {
      matchStatus = t.status === filterStatus;
    }
    return matchSearch && matchStatus;
  });

  // ── Stats cards ─────────────────────────────────────────────────────────────

  const statCards = [
    { label:"Sedang Dipinjam", value: summary?.total_borrowed??0,    icon:<BookOpen size={18}/>,      color:"#5eead4" },
    { label:"Dikembalikan",    value: summary?.total_returned??0,     icon:<CheckCircle size={18}/>,   color:"#22c55e" },
    { label:"Terlambat",       value: summary?.total_overdue??0,      icon:<AlertTriangle size={18}/>, color: (summary?.total_overdue??0)>0?"#ef4444":"rgba(255,255,255,0.3)" },
    { label:"Peminjam Unik",   value: summary?.total_unique_borrowers??0, icon:<Users size={18}/>,   color:"#a78bfa" },
    { label:"Judul Dicache",   value: books.length,                   icon:<Package size={18}/>,       color:"#fb923c" },
    { label:"Total Transaksi", value: transactions.length,            icon:<TrendingUp size={18}/>,    color:"rgba(255,255,255,0.5)" },
  ];

  // ── Sidebar nav ─────────────────────────────────────────────────────────────

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id:"overview",   label:"Overview",        icon:<TrendingUp size={15}/> },
    { id:"pinjaman",   label:"Semua Pinjaman",  icon:<BookOpen size={15}/>,  badge: summary?.total_borrowed },
    { id:"stok",       label:"Manajemen Stok",  icon:<Package size={15}/> },
    { id:"pengguna",   label:"Peminjam",        icon:<Users size={15}/> },
  ];

  if (authLoading || !profile) {
    return (
      <div style={{ minHeight:"100vh", backgroundColor:"#020817",
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Loader2 size={28} color="#5eead4" style={{ animation:"spin 1s linear infinite" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight:"100vh", backgroundColor:"#020817", color:"white" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        input::placeholder{color:rgba(255,255,255,0.25);}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>

      <div style={{ display:"flex", minHeight:"100vh" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width:228, flexShrink:0,
          background:"rgba(255,255,255,0.02)",
          borderRight:"1px solid rgba(255,255,255,0.07)",
          display:"flex", flexDirection:"column",
          position:"sticky", top:0, height:"100vh" }}>

          {/* Header */}
          <div style={{ padding:"24px 20px 18px",
            borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <BookOpen size={18} color="#5eead4"/>
              <span style={{ fontFamily:"Georgia,serif", fontSize:16,
                letterSpacing:"0.18em", textTransform:"uppercase" }}>Libraria</span>
            </div>
            <div style={{ padding:"8px 10px",
              background:"rgba(168,85,247,0.08)", border:"1px solid rgba(168,85,247,0.18)",
              borderRadius:8 }}>
              <div style={{ color:"#a78bfa", fontSize:10, textTransform:"uppercase",
                letterSpacing:"0.12em", marginBottom:3 }}>Admin</div>
              <div style={{ color:"white", fontSize:13, fontWeight:500,
                overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                {profile.full_name}
              </div>
              <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11,
                overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                {profile.email}
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, padding:"16px 12px" }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
                  padding:"10px 12px", borderRadius:9, border:"none",
                  cursor:"pointer", transition:"all 0.18s", marginBottom:4,
                  background: activeTab===item.id ? "rgba(168,85,247,0.12)" : "transparent",
                  color: activeTab===item.id ? "#a78bfa" : "rgba(255,255,255,0.5)",
                  fontSize:13, fontWeight: activeTab===item.id ? 500 : 400, textAlign:"left" }}>
                {item.icon}
                <span style={{ flex:1 }}>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span style={{ padding:"1px 7px", background:"rgba(168,85,247,0.2)",
                    borderRadius:999, fontSize:10, color:"#a78bfa" }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div style={{ padding:"0 12px 24px" }}>
            <button onClick={async () => { await signOut(); router.push("/"); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
                padding:"10px 12px", borderRadius:9, border:"none",
                background:"rgba(239,68,68,0.06)", color:"rgba(239,68,68,0.7)",
                cursor:"pointer", fontSize:13 }}
              onMouseEnter={e=>{
                (e.currentTarget as HTMLElement).style.background="rgba(239,68,68,0.12)";
                (e.currentTarget as HTMLElement).style.color="#f87171";
              }}
              onMouseLeave={e=>{
                (e.currentTarget as HTMLElement).style.background="rgba(239,68,68,0.06)";
                (e.currentTarget as HTMLElement).style.color="rgba(239,68,68,0.7)";
              }}>
              <LogOut size={15}/> Keluar
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex:1, padding:"32px 36px", overflowY:"auto" }}>

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div style={{ animation:"fadeUp 0.3s ease" }}>
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontFamily:"Georgia,serif", fontSize:24, fontWeight:300,
                  color:"white", marginBottom:4 }}>Dashboard Admin</h1>
                <p style={{ color:"rgba(255,255,255,0.35)", fontSize:13 }}>
                  Monitoring perpustakaan secara real-time
                </p>
              </div>

              {/* Stats grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:32 }}>
                {statCards.map(s => (
                  <div key={s.label} style={{ background:"rgba(255,255,255,0.03)",
                    border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"18px 20px" }}>
                    <div style={{ color:s.color, marginBottom:10 }}>{s.icon}</div>
                    <div style={{ fontFamily:"Georgia,serif", fontSize:28, fontWeight:300,
                      color:"white", marginBottom:3 }}>
                      {loading ? "—" : s.value}
                    </div>
                    <div style={{ color:"rgba(255,255,255,0.35)", fontSize:11,
                      textTransform:"uppercase", letterSpacing:"0.1em" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Overdue alert */}
              {(summary?.total_overdue??0) > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px",
                  background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.25)",
                  borderRadius:14, marginBottom:28 }}>
                  <AlertTriangle size={20} color="#ef4444" style={{ flexShrink:0 }}/>
                  <div>
                    <p style={{ color:"#f87171", fontSize:14, fontWeight:600, marginBottom:2 }}>
                      {summary?.total_overdue} peminjaman melewati batas waktu
                    </p>
                    <p style={{ color:"rgba(239,68,68,0.6)", fontSize:12 }}>
                      Hubungi peminjam atau tandai sebagai overdue.
                    </p>
                  </div>
                  <button onClick={() => { setActiveTab("pinjaman"); setFilterStatus("overdue"); }}
                    style={{ marginLeft:"auto", padding:"8px 16px", background:"rgba(239,68,68,0.15)",
                      border:"1px solid rgba(239,68,68,0.3)", borderRadius:999,
                      color:"#f87171", fontSize:12, cursor:"pointer", flexShrink:0 }}>
                    Lihat Detail
                  </button>
                </div>
              )}

              {/* Recent transactions */}
              <div>
                <h2 style={{ fontFamily:"Georgia,serif", fontSize:18, fontWeight:400,
                  color:"white", marginBottom:16 }}>Pinjaman Terbaru</h2>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {transactions.slice(0, 8).map(t => {
                    const d = daysLeft(t.due_date);
                    const isActive = t.status !== "returned";
                    const color = badgeColor(t.status, t.due_date);
                    return (
                      <div key={t.id} style={{
                        display:"flex", alignItems:"center", gap:14,
                        padding:"12px 16px",
                        background:"rgba(255,255,255,0.02)",
                        border:"1px solid rgba(255,255,255,0.06)", borderRadius:10 }}>
                        <div style={{ width:36, height:50, borderRadius:4, overflow:"hidden",
                          background:"rgba(255,255,255,0.05)", flexShrink:0 }}>
                          {t.book_cover_url && (
                            <img src={t.book_cover_url} alt={t.book_title}
                              style={{ width:"100%", height:"100%", objectFit:"cover" }}
                              onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                          )}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ color:"white", fontSize:13, fontWeight:500, marginBottom:2,
                            overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                            {t.book_title}
                          </div>
                          <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>
                            {t.borrower_name} • {t.borrower_email}
                          </div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:11, marginBottom:4 }}>
                            {fmtDate(t.borrowed_at)}
                          </div>
                          <div style={{ padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:600,
                            background:`${color}18`, border:`1px solid ${color}35`, color, display:"inline-block" }}>
                            {t.status==="returned" ? "Dikembalikan"
                              : (isActive && d<0) ? "Terlambat"
                              : "Aktif"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── SEMUA PINJAMAN ── */}
          {activeTab === "pinjaman" && (
            <div style={{ animation:"fadeUp 0.3s ease" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                marginBottom:24 }}>
                <div>
                  <h1 style={{ fontFamily:"Georgia,serif", fontSize:24, fontWeight:300,
                    color:"white", marginBottom:4 }}>Semua Pinjaman</h1>
                  <p style={{ color:"rgba(255,255,255,0.35)", fontSize:13 }}>
                    {filteredTrx.length} dari {transactions.length} transaksi
                  </p>
                </div>
                <button onClick={fetchAll} style={{ display:"flex", alignItems:"center", gap:7,
                  padding:"8px 16px", background:"rgba(255,255,255,0.05)",
                  border:"1px solid rgba(255,255,255,0.1)", borderRadius:999,
                  color:"rgba(255,255,255,0.6)", fontSize:12, cursor:"pointer" }}>
                  <RotateCcw size={13}/> Refresh
                </button>
              </div>

              {/* Filter bar */}
              <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:200, display:"flex", alignItems:"center",
                  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.09)",
                  borderRadius:9, overflow:"hidden" }}>
                  <Search size={13} color="rgba(255,255,255,0.3)" style={{ marginLeft:12, flexShrink:0 }}/>
                  <input value={searchTrx} onChange={e=>setSearchTrx(e.target.value)}
                    placeholder="Cari buku atau peminjam..."
                    style={{ flex:1, background:"transparent", border:"none", outline:"none",
                      color:"white", fontSize:13, padding:"10px 10px" }}/>
                  {searchTrx && (
                    <button onClick={()=>setSearchTrx("")} style={{
                      marginRight:8, background:"rgba(255,255,255,0.08)", border:"none",
                      borderRadius:"50%", width:18, height:18, display:"flex",
                      alignItems:"center", justifyContent:"center",
                      cursor:"pointer", color:"rgba(255,255,255,0.4)" }}>
                      <X size={10}/>
                    </button>
                  )}
                </div>
                {(["all","borrowed","returned","overdue"] as FilterStatus[]).map(f => (
                  <button key={f} onClick={()=>setFilterStatus(f)} style={{
                    padding:"8px 16px", borderRadius:9, border:"none", fontSize:12,
                    cursor:"pointer", transition:"all 0.18s",
                    background: filterStatus===f ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)",
                    color: filterStatus===f ? "#a78bfa" : "rgba(255,255,255,0.5)" }}>
                    {f==="all"?"Semua":f==="borrowed"?"Dipinjam":f==="returned"?"Dikembalikan":"Terlambat"}
                  </button>
                ))}
              </div>

              {/* Tabel transaksi */}
              {loading ? (
                <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
                  <Loader2 size={24} color="rgba(94,234,212,0.5)"
                    style={{ animation:"spin 1s linear infinite" }}/>
                </div>
              ) : filteredTrx.length === 0 ? (
                <div style={{ textAlign:"center", padding:48 }}>
                  <Filter size={40} color="rgba(255,255,255,0.07)" style={{ marginBottom:12 }}/>
                  <p style={{ color:"rgba(255,255,255,0.3)", fontSize:15 }}>Tidak ada data</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {filteredTrx.map(t => {
                    const d = daysLeft(t.due_date);
                    const isActive = t.status !== "returned";
                    const color = badgeColor(t.status, t.due_date);
                    const durasi = t.returned_at
                      ? Math.ceil((new Date(t.returned_at).getTime()-new Date(t.borrowed_at).getTime())/86400000)
                      : null;

                    return (
                      <div key={t.id} style={{
                        background:"rgba(255,255,255,0.025)",
                        border:`1px solid ${isActive&&d<0?"rgba(239,68,68,0.2)":"rgba(255,255,255,0.06)"}`,
                        borderRadius:12, padding:"14px 18px",
                        display:"flex", alignItems:"center", gap:14 }}>

                        {/* Cover mini */}
                        <div style={{ width:38, height:52, borderRadius:5, overflow:"hidden",
                          background:"rgba(255,255,255,0.05)", flexShrink:0 }}>
                          {t.book_cover_url && (
                            <img src={t.book_cover_url} alt={t.book_title}
                              style={{ width:"100%", height:"100%", objectFit:"cover" }}
                              onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                          )}
                        </div>

                        {/* Buku info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"flex-start",
                            gap:8, marginBottom:4 }}>
                            <h4 style={{ color:"white", fontFamily:"Georgia,serif",
                              fontSize:13.5, fontWeight:400, flex:1, minWidth:0,
                              overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                              {t.book_title}
                            </h4>
                          </div>
                          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:11.5, marginBottom:7 }}>
                            {t.book_authors}
                          </p>
                          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                              <User size={10} color="rgba(255,255,255,0.3)"/>
                              <span style={{ color:"rgba(255,255,255,0.45)", fontSize:11 }}>
                                {t.borrower_name} • {t.borrower_email}
                              </span>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                              <Calendar size={10} color="rgba(255,255,255,0.3)"/>
                              <span style={{ color:"rgba(255,255,255,0.35)", fontSize:11 }}>
                                {fmtDate(t.borrowed_at)}
                              </span>
                            </div>
                            {t.returned_at ? (
                              <span style={{ color:"rgba(34,197,94,0.6)", fontSize:11 }}>
                                Kembali: {fmtDateTime(t.returned_at)}
                                {durasi!==null && ` • ${durasi} hari`}
                              </span>
                            ) : (
                              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                <Clock size={10} color={color}/>
                                <span style={{ color, fontSize:11, fontWeight:600 }}>
                                  Due: {fmtDate(t.due_date)}
                                  {d<0 ? ` • Terlambat ${Math.abs(d)} hari!` : ` • ${d} hari`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status + tombol */}
                        <div style={{ display:"flex", flexDirection:"column",
                          alignItems:"flex-end", gap:8, flexShrink:0 }}>
                          <div style={{ padding:"3px 10px", borderRadius:999, fontSize:10,
                            fontWeight:600, background:`${color}18`,
                            border:`1px solid ${color}35`, color }}>
                            {t.status==="returned" ? "Dikembalikan"
                              : (isActive && d<0) ? "Terlambat"
                              : "Aktif"}
                          </div>
                          {isActive && (
                            <button onClick={()=>handleAdminReturn(t.id, t.book_id)}
                              disabled={returning===t.id}
                              style={{ display:"inline-flex", alignItems:"center", gap:5,
                                padding:"6px 12px",
                                background: returning===t.id ? "transparent":"rgba(255,255,255,0.06)",
                                border:"1px solid rgba(255,255,255,0.1)", borderRadius:999,
                                color:"rgba(255,255,255,0.65)", fontSize:11,
                                cursor:returning===t.id?"not-allowed":"pointer" }}>
                              {returning===t.id
                                ?<Loader2 size={11} style={{animation:"spin 1s linear infinite"}}/>
                                :<RotateCcw size={11}/>}
                              Kembalikan
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── MANAJEMEN STOK ── */}
          {activeTab === "stok" && (
            <div style={{ animation:"fadeUp 0.3s ease" }}>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontFamily:"Georgia,serif", fontSize:24, fontWeight:300,
                  color:"white", marginBottom:4 }}>Manajemen Stok Buku</h1>
                <p style={{ color:"rgba(255,255,255,0.35)", fontSize:13 }}>
                  {books.length} judul buku terdaftar di sistem
                </p>
              </div>

              {loading ? (
                <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
                  <Loader2 size={24} color="rgba(94,234,212,0.5)"
                    style={{ animation:"spin 1s linear infinite" }}/>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {books.map(b => (
                    <div key={b.id} style={{
                      background:"rgba(255,255,255,0.03)",
                      border:`1px solid ${b.stock_count===0?"rgba(239,68,68,0.25)":"rgba(255,255,255,0.07)"}`,
                      borderRadius:12, padding:"14px 18px",
                      display:"flex", alignItems:"center", gap:14 }}>

                      {/* Cover */}
                      <div style={{ width:40, height:55, borderRadius:5, overflow:"hidden",
                        background:"rgba(255,255,255,0.05)", flexShrink:0 }}>
                        {b.cover_url && (
                          <img src={b.cover_url} alt={b.title}
                            style={{ width:"100%", height:"100%", objectFit:"cover" }}
                            onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <h4 style={{ color:"white", fontFamily:"Georgia,serif",
                          fontSize:13.5, fontWeight:400, marginBottom:3,
                          overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                          {b.title}
                        </h4>
                        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:11.5, marginBottom:4 }}>
                          {b.authors}
                        </p>
                        <div style={{ display:"flex", gap:10 }}>
                          {b.categories && (
                            <span style={{ color:"rgba(255,255,255,0.25)", fontSize:10,
                              textTransform:"uppercase", letterSpacing:"0.08em" }}>
                              {b.categories.split(",")[0].trim()}
                            </span>
                          )}
                          <span style={{ color:"rgba(255,255,255,0.2)", fontSize:10,
                            textTransform:"uppercase" }}>
                            {b.language.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Stok editor */}
                      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                        {editingStock === b.id ? (
                          <>
                            <input type="number" min="0" value={stockVal}
                              onChange={e=>setStockVal(Math.max(0,parseInt(e.target.value)||0))}
                              style={{ width:60, background:"rgba(255,255,255,0.08)",
                                border:"1px solid rgba(94,234,212,0.4)", borderRadius:7,
                                color:"white", fontSize:14, padding:"6px 10px",
                                outline:"none", textAlign:"center" }}/>
                            <button onClick={()=>handleSaveStock(b.id)} disabled={savingStock}
                              style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
                                background:"#14b8a6", border:"none", borderRadius:999,
                                color:"white", fontSize:12, cursor:"pointer" }}>
                              {savingStock?<Loader2 size={11} style={{animation:"spin 1s linear infinite"}}/>:<Save size={11}/>}
                              Simpan
                            </button>
                            <button onClick={()=>setEditingStock(null)}
                              style={{ background:"none", border:"none", cursor:"pointer",
                                color:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center" }}>
                              <X size={14}/>
                            </button>
                          </>
                        ) : (
                          <>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontFamily:"Georgia,serif", fontSize:22,
                                color: b.stock_count===0?"#ef4444":b.stock_count<=2?"#f59e0b":"white" }}>
                                {b.stock_count}
                              </div>
                              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:10,
                                textTransform:"uppercase", letterSpacing:"0.08em" }}>
                                {b.stock_count===0?"Habis":b.stock_count<=2?"Hampir Habis":"Tersedia"}
                              </div>
                            </div>
                            <button onClick={()=>{ setEditingStock(b.id); setStockVal(b.stock_count); }}
                              style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px",
                                background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                                borderRadius:999, color:"rgba(255,255,255,0.6)", fontSize:11, cursor:"pointer" }}>
                              <Edit2 size={11}/> Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PEMINJAM ── */}
          {activeTab === "pengguna" && (
            <div style={{ animation:"fadeUp 0.3s ease" }}>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontFamily:"Georgia,serif", fontSize:24, fontWeight:300,
                  color:"white", marginBottom:4 }}>Daftar Peminjam</h1>
                <p style={{ color:"rgba(255,255,255,0.35)", fontSize:13 }}>
                  {summary?.total_unique_borrowers ?? 0} peminjam unik
                </p>
              </div>

              {/* Group transaksi per email */}
              {loading ? (
                <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
                  <Loader2 size={24} color="rgba(94,234,212,0.5)"
                    style={{ animation:"spin 1s linear infinite" }}/>
                </div>
              ) : (() => {
                // Group by borrower_email
                const grouped: Record<string, Transaction[]> = {};
                for (const t of transactions) {
                  if (!grouped[t.borrower_email]) grouped[t.borrower_email] = [];
                  grouped[t.borrower_email].push(t);
                }
                const borrowers = Object.entries(grouped)
                  .sort((a,b) => b[1].length - a[1].length);

                return (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {borrowers.map(([email, trxs]) => {
                      const name  = trxs[0].borrower_name;
                      const activeCount = trxs.filter(t=>t.status!=="returned").length;
                      const overdueCount = trxs.filter(t=>t.status!=="returned" && daysLeft(t.due_date)<0).length;
                      return (
                        <div key={email} style={{
                          background:"rgba(255,255,255,0.03)",
                          border:`1px solid ${overdueCount>0?"rgba(239,68,68,0.2)":"rgba(255,255,255,0.07)"}`,
                          borderRadius:12, padding:"16px 20px",
                          display:"flex", alignItems:"center", gap:16 }}>

                          <div style={{ width:40, height:40, borderRadius:"50%",
                            background:"rgba(168,85,247,0.12)", border:"1px solid rgba(168,85,247,0.2)",
                            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <User size={16} color="#a78bfa"/>
                          </div>

                          <div style={{ flex:1, minWidth:0 }}>
                            <h4 style={{ color:"white", fontSize:14, fontWeight:500, marginBottom:2 }}>
                              {name}
                            </h4>
                            <p style={{ color:"rgba(255,255,255,0.4)", fontSize:12 }}>{email}</p>
                          </div>

                          <div style={{ display:"flex", gap:20, flexShrink:0 }}>
                            <div style={{ textAlign:"center" }}>
                              <div style={{ fontFamily:"Georgia,serif", fontSize:20, color:"white" }}>
                                {trxs.length}
                              </div>
                              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:10,
                                textTransform:"uppercase" }}>Total</div>
                            </div>
                            <div style={{ textAlign:"center" }}>
                              <div style={{ fontFamily:"Georgia,serif", fontSize:20, color:"#5eead4" }}>
                                {activeCount}
                              </div>
                              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:10,
                                textTransform:"uppercase" }}>Aktif</div>
                            </div>
                            {overdueCount > 0 && (
                              <div style={{ textAlign:"center" }}>
                                <div style={{ fontFamily:"Georgia,serif", fontSize:20, color:"#ef4444" }}>
                                  {overdueCount}
                                </div>
                                <div style={{ color:"rgba(255,255,255,0.3)", fontSize:10,
                                  textTransform:"uppercase" }}>Terlambat</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}