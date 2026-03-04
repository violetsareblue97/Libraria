"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, CheckCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { searchBooks, getFeaturedBooks } from "@/lib/open-library";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { BookCard } from "@/lib/types/open-library";

const PER_PAGE = 10;   // tampil per halaman
const FETCH_LIMIT = 150; // total buku yang diambil dari API

type StockMap = Record<string, number>;

// ─── MODAL BORROW ────────────────────────────────────────────────────────────

function BorrowModal({ book, onClose, user, profile, isAuthLoading, stock }: {
  book: BookCard; onClose: () => void;
  user: any; profile: any; isAuthLoading: boolean; stock: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const borrowerEmail = profile?.email ?? user?.email ?? null;
  const borrowerName  = profile?.full_name ?? user?.user_metadata?.full_name ?? "Member";
  const borrowerId    = user?.id ?? null;
  const outOfStock    = stock !== null && stock <= 0;

  async function handleBorrow() {
    if (!borrowerEmail || !borrowerId) return alert("You must be logged in to borrow a book.");
    if (outOfStock) return;
    setLoading(true);
    try {
      const { data: existingBook } = await supabase
        .from("books").select("id, stock_count")
        .eq("google_books_id", book.googleBooksId).maybeSingle();

      let bookId: string;
      if (!existingBook) {
        const { data: newBook, error } = await supabase.from("books").insert({
          google_books_id: book.googleBooksId, title: book.title,
          authors: book.authors, cover_url: book.coverUrl, stock_count: 4,
        }).select("id").single();
        if (error || !newBook) throw error ?? new Error("Failed to create book record");
        bookId = newBook.id;
      } else {
        bookId = existingBook.id;
        await supabase.from("books")
          .update({ stock_count: Math.max(0, (existingBook.stock_count ?? 1) - 1) })
          .eq("id", bookId);
      }

      const { error: trxError } = await supabase.from("transactions").insert({
        user_id: borrowerId, book_id: bookId,
        google_books_id: book.googleBooksId,
        book_title: book.title, book_authors: book.authors,
        book_cover_url: book.coverUrl,
        borrower_email: borrowerEmail, borrower_name: borrowerName,
        status: "borrowed",
        borrowed_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (trxError) throw trxError;
      setSuccess(true);
      setTimeout(onClose, 1800);
    } catch (err: any) {
      alert("Failed to borrow book: " + err.message);
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      backgroundColor: "rgba(2,8,23,0.92)", backdropFilter: "blur(20px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "linear-gradient(145deg, rgba(14,26,58,0.97), rgba(8,16,36,0.99))",
        border: "1px solid rgba(94,234,212,0.15)",
        borderRadius: 24, maxWidth: 360, width: "100%", padding: "36px 32px",
        textAlign: "center", position: "relative",
        boxShadow: "0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", right: 16, top: 16,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, color: "rgba(255,255,255,0.45)", cursor: "pointer",
          width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "white"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; }}>
          <X size={13} />
        </button>

        {isAuthLoading ? (
          <div style={{ padding: "40px 0" }}>
            <Loader2 size={26} style={{ margin: "0 auto", color: "#14b8a6", animation: "spin 1s linear infinite", display: "block" }} />
            <p style={{ color: "rgba(255,255,255,0.5)", marginTop: 14, fontSize: 13 }}>Verifying session...</p>
          </div>

        ) : success ? (
          <div style={{ padding: "24px 0" }}>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
              <div style={{ position: "absolute", inset: -12, background: "radial-gradient(circle, rgba(94,234,212,0.15) 0%, transparent 70%)", borderRadius: "50%" }} />
              <CheckCircle size={52} color="#14b8a6" style={{ display: "block", position: "relative" }} />
            </div>
            <h3 style={{ color: "white", fontSize: 17, marginBottom: 8, fontWeight: 500 }}>Peminjaman Berhasil!</h3>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Cek di Dashboard kamu.</p>
          </div>

        ) : (
          <>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 20 }}>
              <div style={{ position: "absolute", inset: -16, background: "radial-gradient(circle, rgba(94,234,212,0.08) 0%, transparent 70%)", borderRadius: 16 }} />
              <img src={book.coverUrl} style={{
                width: 92, height: 132, objectFit: "cover", borderRadius: 10, display: "block", position: "relative",
                boxShadow: "0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
              }} alt={book.title} />
            </div>

            <h3 style={{ color: "white", fontSize: 15, marginBottom: 4, lineHeight: 1.4, fontWeight: 500, letterSpacing: "-0.01em" }}>{book.title}</h3>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginBottom: 16 }}>{book.authors}</p>

            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 14px", borderRadius: 999, marginBottom: 24,
              background: outOfStock ? "rgba(239,68,68,0.08)" : "rgba(94,234,212,0.08)",
              border: `1px solid ${outOfStock ? "rgba(239,68,68,0.25)" : "rgba(94,234,212,0.2)"}`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: outOfStock ? "#ef4444" : "#5eead4" }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: outOfStock ? "#ef4444" : "#5eead4" }}>
                {stock === null ? "Checking stock..." : outOfStock ? "Out of stock" : `${stock} available`}
              </span>
            </div>

            {!borrowerEmail ? (
              <button onClick={() => (window.location.href = "/auth")} style={{ width: "100%", padding: "13px 0", background: "linear-gradient(135deg, #14b8a6, #0d9488)", border: "none", borderRadius: 12, color: "white", fontWeight: 600, cursor: "pointer", fontSize: 14, boxShadow: "0 8px 24px rgba(20,184,166,0.25)" }}>
                Login untuk Meminjam
              </button>
            ) : (
              <button onClick={handleBorrow} disabled={loading || outOfStock}
                style={{
                  width: "100%", padding: "13px 0", border: "none", borderRadius: 12,
                  color: "white", fontWeight: 600, fontSize: 14,
                  background: outOfStock ? "rgba(255,255,255,0.05)" : loading ? "rgba(20,184,166,0.5)" : "linear-gradient(135deg, #14b8a6, #0d9488)",
                  cursor: outOfStock || loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: outOfStock || loading ? "none" : "0 8px 24px rgba(20,184,166,0.25)",
                  transition: "all 0.2s",
                }}>
                {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Memproses...</> : outOfStock ? "Stok Habis" : "Confirm"}
              </button>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── BOOK CARD ───────────────────────────────────────────────────────────────

function BookCard({ book, stock, onClick }: { book: BookCard; stock: number | null; onClick: () => void }) {
  const outOfStock = stock !== null && stock <= 0;

  return (
    <div onClick={!outOfStock ? onClick : undefined} style={{
      background: "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, overflow: "hidden",
      cursor: outOfStock ? "not-allowed" : "pointer",
      opacity: outOfStock ? 0.45 : 1,
      transition: "all 0.2s ease",
    }}
      onMouseEnter={e => { if (!outOfStock) { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(94,234,212,0.2)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
      <div style={{ position: "relative" }}>
        <img src={book.coverUrl} style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} alt={book.title} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to top, rgba(8,16,36,0.8) 0%, transparent 100%)" }} />
        <div style={{
          position: "absolute", bottom: 8, right: 8,
          background: "rgba(8,16,36,0.9)",
          border: `1px solid ${outOfStock ? "rgba(239,68,68,0.5)" : "rgba(94,234,212,0.4)"}`,
          borderRadius: 6, padding: "3px 9px",
          fontSize: 11, fontWeight: 700,
          color: outOfStock ? "#ef4444" : "#5eead4",
          backdropFilter: "blur(8px)",
        }}>
          Available: {stock === null ? "—" : `${stock}`}
        </div>
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <h3 style={{ fontSize: 13, color: "white", marginBottom: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontWeight: 500, letterSpacing: "-0.01em" }}>{book.title}</h3>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>By: {book.authors}</p>
      </div>
    </div>
  );
}

// ─── PAGINATION CONTROLS ──────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPrev, onNext }: {
  page: number; totalPages: number;
  onPrev: () => void; onNext: () => void;
}) {
  const btnBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "9px 20px", borderRadius: 10, border: "none",
    fontSize: 13, fontWeight: 500, cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "var(--font-dm-sans), sans-serif",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 40, paddingBottom: 40 }}>
      <button
        onClick={onPrev}
        disabled={page <= 1}
        style={{
          ...btnBase,
          background: page <= 1 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: page <= 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
          cursor: page <= 1 ? "not-allowed" : "pointer",
        }}
        onMouseEnter={e => { if (page > 1) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "white"; } }}
        onMouseLeave={e => { if (page > 1) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; } }}>
        <ChevronLeft size={15} /> Previous
      </button>

      {/* Page indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "9px 20px",
        background: "rgba(94,234,212,0.08)",
        border: "1px solid rgba(94,234,212,0.18)",
        borderRadius: 10,
        fontSize: 13,
      }}>
        <span style={{ color: "#5eead4", fontWeight: 600 }}>{page}</span>
        <span style={{ color: "rgba(255,255,255,0.25)" }}>/</span>
        <span style={{ color: "rgba(255,255,255,0.45)" }}>{totalPages}</span>
      </div>

      <button
        onClick={onNext}
        disabled={page >= totalPages}
        style={{
          ...btnBase,
          background: page >= totalPages ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: page >= totalPages ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
          cursor: page >= totalPages ? "not-allowed" : "pointer",
        }}
        onMouseEnter={e => { if (page < totalPages) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "white"; } }}
        onMouseLeave={e => { if (page < totalPages) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; } }}>
        Next <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ─── KATALOG PAGE ─────────────────────────────────────────────────────────────

export default function KatalogPage() {
  const { user, profile, loading: authLoading } = useAuth();

  // Semua buku yang diambil dari API (max 150)
  const [allBooks, setAllBooks]         = useState<BookCard[]>([]);
  const [stockMap, setStockMap]         = useState<StockMap>({});
  const [selectedBook, setSelectedBook] = useState<BookCard | null>(null);
  const [loading, setLoading]           = useState(true);

  // Search state
  const [searchInput, setSearchInput]   = useState("");
  const [searchQuery, setSearchQuery]   = useState(""); // debounced
  const debounceRef = useRef<any>(null);

  // Pagination (client-side)
  const [page, setPage] = useState(1);

  // ── Derived: buku yang ditampilkan di halaman ini ─────────────────────────
  const start       = (page - 1) * PER_PAGE;
  const paginated   = allBooks.slice(start, start + PER_PAGE);
  const totalPages  = Math.max(1, Math.ceil(allBooks.length / PER_PAGE));

  // ── Fetch stok dari Supabase ──────────────────────────────────────────────
  const fetchStocks = useCallback(async (bookList: BookCard[]) => {
    if (!bookList.length) return;
    const ids = bookList.map(b => b.googleBooksId);
    const { data } = await supabase
      .from("books").select("google_books_id, stock_count")
      .in("google_books_id", ids);
    if (data) {
      setStockMap(prev => {
        const map = { ...prev };
        data.forEach(b => { map[b.google_books_id] = b.stock_count; });
        return map;
      });
    }
  }, []);

  // ── Load buku dari API ────────────────────────────────────────────────────
  const loadBooks = useCallback(async (q: string) => {
    setLoading(true);
    setAllBooks([]);
    setStockMap({});
    setPage(1);
    try {
      let result: BookCard[];
      if (!q.trim()) {
        result = await getFeaturedBooks(); // 150 buku populer
      } else {
        const { books } = await searchBooks(q, FETCH_LIMIT, 0);
        result = books;
      }
      setAllBooks(result);
      fetchStocks(result); // ambil stok paralel
    } catch {
      setAllBooks([]);
    } finally {
      setLoading(false);
    }
  }, [fetchStocks]);

  // Load awal
  useEffect(() => { loadBooks(""); }, [loadBooks]);

  // Debounce search
  function handleInput(val: string) {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(val);
      loadBooks(val);
    }, 500);
  }

  // Scroll ke atas saat ganti halaman
  function goToPage(newPage: number) {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#020817", color: "white" }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Sticky header + search */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        backgroundColor: "rgba(2,8,23,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 32px",
      }}>
        <div style={{ display: "flex", alignItems: "center", height: 64, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ flex: 1, maxWidth: 640, position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)" }} />
            <input
              value={searchInput}
              onChange={e => handleInput(e.target.value)}
              placeholder="Search title or author..."
              style={{
                width: "100%", padding: "9px 14px 9px 38px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 999, color: "white", fontSize: 13, outline: "none",
                fontFamily: "var(--font-dm-sans), sans-serif",
                transition: "border-color 0.2s",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(94,234,212,0.35)")}
              onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.09)")} />
          </div>
        </div>
      </header>

      <main style={{ padding: "36px 32px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Page title + info */}
        <div style={{ marginBottom: 28, animation: "fadeUp 0.4s ease", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(94,234,212,0.6)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Library</p>
            <h1 style={{ fontSize: 26, fontWeight: 300, color: "white", letterSpacing: "-0.02em", margin: 0 }}>All Available Books</h1>
          </div>
          {!loading && allBooks.length > 0 && (
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
              Showing <span style={{ color: "rgba(255,255,255,0.5)" }}>{start + 1}–{Math.min(start + PER_PAGE, allBooks.length)}</span> of <span style={{ color: "#5eead4" }}>{allBooks.length}</span> books
            </p>
          )}
        </div>

        {/* Book grid */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 16 }}>
            <Loader2 size={26} style={{ color: "#14b8a6", animation: "spin 1s linear infinite" }} />
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Loading {FETCH_LIMIT} books...</p>
          </div>
        ) : allBooks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 14 }}>No books found for "{searchInput}".</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(162px, 1fr))", gap: 20, animation: "fadeUp 0.4s ease 0.1s both" }}>
              {paginated.map(b => (
                <BookCard
                  key={b.googleBooksId}
                  book={b}
                  stock={stockMap[b.googleBooksId] ?? null}
                  onClick={() => setSelectedBook(b)}
                />
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => goToPage(page - 1)}
              onNext={() => goToPage(page + 1)}
            />
          </>
        )}
      </main>

      {selectedBook && (
        <BorrowModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          user={user} profile={profile} isAuthLoading={authLoading}
          stock={stockMap[selectedBook.googleBooksId] ?? null}
        />
      )}
    </div>
  );
}