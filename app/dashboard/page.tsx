"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, AlertTriangle, Clock, RotateCcw, Loader2, ArrowRight, X, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Transaction } from "@/lib/types/open-library";

// how many days until due date (negative = already overdue)
function daysLeft(due: string) {
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
}

// ---- RETURN MODAL ----

function ReturnModal({ trx, onClose, onConfirm, loading }: {
  trx: Transaction;
  onClose: () => void;
  onConfirm: (trxId: string, bookId: string) => void;
  loading: boolean;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "#000000d9", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0a1228b3", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, maxWidth: 400, width: "100%", padding: 32, textAlign: "center", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", right: 16, top: 16, background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={20} /></button>

        {trx.book_cover_url && (
          <img src={trx.book_cover_url} alt={trx.book_title}
            style={{ width: 100, height: 140, objectFit: "cover", borderRadius: 8, marginBottom: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", display: "block", margin: "0 auto 20px" }} />
        )}
        <h3 style={{ fontSize: 18, marginBottom: 5, fontWeight: 400, color: "white", fontFamily: "var(--font-dm-sans), sans-serif" }}>{trx.book_title}</h3>
        <p style={{ color: "rgb(255, 255, 255)", fontSize: 13, fontFamily: "var(--font-dm-sans), sans-serif", marginBottom: 24 }}> by {trx.book_authors}</p>
        <p style={{ color: "rgba(255, 255, 255, 0.42)", fontSize: 13, fontFamily: "var(--font-dm-sans), sans-serif", marginBottom: 10 }}>Click the button below to return this book.</p>

        <button
          onClick={() => onConfirm(trx.id, trx.book_id)}
          disabled={loading}
          style={{ width: "100%", padding: 14, background: loading ? "#0d9488" : "#14b8a6", fontFamily: "var(--font-dm-sans), sans-serif", border: "none", borderRadius: 20, color: "white", fontSize: 16, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
        >
          {loading
            ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Processing...</>
            : <><CheckCircle size={20}/> Return this Book</>
          }
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ---- SINGLE LOAN CARD ----

function ActiveLoanCard({ trx, onClick }: { trx: Transaction; onClick: () => void }) {
  const d = daysLeft(trx.due_date);
  const isOver   = d < 0;
  const isUrgent = !isOver && d <= 2;

  // color changes based on how close the due date is
  const color = isOver ? "#ef4444" : isUrgent ? "#f59e0b" : "#5eead4";

  return (
    <div
      onClick={onClick}
      style={{
        background: "#081021",
        border: `1px solid ${isOver ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 14, padding: "18px 20px",
        display: "flex", alignItems: "center", gap: 16,
        cursor: "pointer", transition: "border-color 0.2s, transform 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.03)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      {/* book cover thumbnail */}
      <div style={{ width: 52, height: 72, borderRadius: 6, overflow: "hidden", background: "#ffffff0d", flexShrink: 0 }}>
        {trx.book_cover_url && <img src={trx.book_cover_url} alt={trx.book_title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ color: "white", fontSize: 16, marginBottom: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{trx.book_title}</h3>
        <p style={{ color: "#ffffff66", fontSize: 13, marginBottom: 8 }}>by {trx.book_authors}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Clock size={11} color={color} />
          <span style={{ color, fontSize: 11, fontWeight: 600 }}>
            {isOver ? `Late ${Math.abs(d)} Days` : d === 0 ? "Due Today" : `${d} days left`}
          </span>
        </div>
      </div>
    </div>
  );
}


{/*MAIN PAGE*/}

export default function Dashboard() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTrx, setLoadingTrx]     = useState(true);
  const [selectedTrx, setSelectedTrx]   = useState<Transaction | null>(null);
  const [returning, setReturning]       = useState(false);

  // redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.push("/auth");
  }, [authLoading, user, router]);

  const fetchTrx = useCallback(async () => {
    // prefer user_id, fall back to email if somehow id is missing
    const userId    = user?.id;
    const userEmail = profile?.email ?? user?.email;
    if (!userId && !userEmail) return;

    setLoadingTrx(true);
    try {
      const { data, error } = userId
        ? await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", userId)
            .neq("status", "returned")
            .order("borrowed_at", { ascending: false })
        : await supabase
            .from("transactions")
            .select("*")
            .eq("borrower_email", userEmail)
            .neq("status", "returned")
            .order("borrowed_at", { ascending: false });

      if (!error) setTransactions((data as Transaction[]) ?? []);
    } finally {
      setLoadingTrx(false);
    }
  }, [user?.id, profile?.email, user?.email]);

  useEffect(() => { fetchTrx(); }, [fetchTrx]);

  async function handleReturn(trxId: string, bookId: string) {
    setReturning(true);
    try {
      // step 1: mark transaction as returned
      const { error: trxError } = await supabase
        .from("transactions")
        .update({ status: "returned", returned_at: new Date().toISOString() })
        .eq("id", trxId);

      if (trxError) throw trxError;

      // step 2: add the stock back
      const { data: bk } = await supabase
        .from("books")
        .select("stock_count")
        .eq("id", bookId)
        .single();

      if (bk) {
        await supabase
          .from("books")
          .update({ stock_count: (bk.stock_count ?? 0) + 1 })
          .eq("id", bookId);
      }

      // step 3: close modal and reload list
      setSelectedTrx(null);
      await fetchTrx();
    } catch (err: any) {
      alert("Gagal mengembalikan buku: " + err.message);
    } finally {
      setReturning(false);
    }
  }

  // filter active and overdue transactions
  const active  = transactions;
  const overdue = active.filter(t => daysLeft(t.due_date) < 0);

  if (authLoading) {
    return (
      <div style={{ display: "flex", backgroundColor: "#0f172a",justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Loader2 size={32} color="#14b8a6" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 36px", width: "100%", backgroundColor: "#0f172a" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* greeting */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 35, fontWeight: 300, color: "white", fontFamily: "var(--font-dm-sans), sans-serif" }}>Welcome back, {profile?.full_name ?? user?.email ?? "Member"}</h1>
      </div>

      {/* summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 32 }}>
        {/* Card 1: Currently Borrowed */}
        <div style={{ 
          background: "#0f172a", 
          border: "1px solid rgba(255,255,255,0.07)", 
          padding: 18, 
          position: "relative" 
        }}>
          <div style={{ fontSize: 30, fontFamily: "var(--font-dm-sans), sans-serif", color: "white", fontWeight: 300, marginBottom: 2 }}>
            {active.length}
          </div>
          <div style={{ color: "white", fontSize: 16, fontFamily: "var(--font-dm-sans), sans-serif" }}>
            Currently Borrowed
          </div>
        </div>

        {/* Card 2: Overdue*/}
        <div style={{ 
          background: "#0f172a", 
          border: "1px solid rgba(255,255,255,0.07)", 
          padding: 18, 
          position: "relative",
          overflow: "hidden"
        }}>

          <div style={{ 
            position: "absolute", 
            top: 25, 
            right: 12, 
            color: overdue.length > 0 ? "#ef4444" : "rgba(255,255,255,0.2)",
            opacity: 0.8 
          }}>
            <AlertTriangle size={50} strokeWidth={1} />
          </div>

          <div style={{ fontSize: 30, fontFamily: "var(--font-dm-sans), sans-serif", color: "white", fontWeight: 300, marginBottom: 2 }}>
            {overdue.length}
          </div>
          <div style={{ color: "white", fontSize: 16, fontFamily: "var(--font-dm-sans), sans-serif" }}>
            Overdue
          </div>
        </div>
      </div>

      {/* loan list or empty state */}
      {loadingTrx ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <Loader2 size={24} color="#14b8a6" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : active.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", background: "rgba(255,255,255,0.02)", borderRadius: 16 }}>
          <BookMarked size={32} color="rgba(255,255,255,0.1)" style={{ margin: "0 auto 12px", display: "block" }} />
          <p style={{ color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>You have no books currently borrowed.</p>
          <a href="/katalog" style={{ color: "#5eead4", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            Cari Buku <ArrowRight size={12} />
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {active.map(t => (
            <ActiveLoanCard key={t.id} trx={t} onClick={() => setSelectedTrx(t)} />
          ))}
        </div>
      )}

      {/* return confirmation modal */}
      {selectedTrx && (
        <ReturnModal
          trx={selectedTrx}
          onClose={() => setSelectedTrx(null)}
          onConfirm={handleReturn}
          loading={returning}
        />
      )}
    </div>
  );
}