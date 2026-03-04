"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, CheckCircle, Loader2 } from "lucide-react";
import { searchBooks, getFeaturedBooks } from "@/lib/open-library";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { BookCard } from "@/lib/types/open-library";

const PER_PAGE = 16;

type StockMap = Record<string, number>; // google_books_id → stock_count

// ─── MODAL BORROW ────────────────────────────────────────────────────────────

function BorrowModal({ book, onClose, user, profile, isAuthLoading, stock }: {
  book: BookCard; onClose: () => void;
  user: any; profile: any; isAuthLoading: boolean;
  stock: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const borrowerEmail = profile?.email ?? user?.email ?? null;
  const borrowerName  = profile?.full_name ?? user?.user_metadata?.full_name ?? "Member";
  const borrowerId    = user?.id ?? null;
  const outOfStock    = stock !== null && stock <= 0;

  async function handleBorrow() {
    if (!borrowerEmail || !borrowerId) return alert("Sesi tidak valid. Silakan login ulang.");
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
        if (error || !newBook) throw error ?? new Error("Gagal menyimpan buku");
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
      alert("Gagal meminjam: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, maxWidth: 360, width: "100%", padding: 32, textAlign: "center", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", right: 16, top: 16, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
          <X size={20} />
        </button>

        {isAuthLoading ? (
          <div style={{ padding: "40px 0" }}>
            <Loader2 size={28} style={{ margin: "0 auto", color: "#14b8a6", animation: "spin 1s linear infinite", display: "block" }} />
            <p style={{ color: "white", marginTop: 14, fontSize: 14 }}>Memverifikasi akun...</p>
          </div>

        ) : success ? (
          <div style={{ padding: "20px 0" }}>
            <CheckCircle size={56} color="#14b8a6" style={{ margin: "0 auto 14px", display: "block" }} />
            <h3 style={{ color: "white", fontSize: 17, marginBottom: 6 }}>Peminjaman Berhasil!</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Cek di Dashboard kamu.</p>
          </div>

        ) : (
          <>
            <img src={book.coverUrl}
              style={{ width: 100, height: 145, objectFit: "cover", borderRadius: 8, margin: "0 auto 18px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", display: "block" }}
              alt={book.title} />

            <h3 style={{ color: "white", fontSize: 16, marginBottom: 4, lineHeight: 1.3 }}>{book.title}</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 12 }}>{book.authors}</p>

            {/* Badge stok di modal */}
            <p style={{ fontSize: 12, marginBottom: 22, color: outOfStock ? "#ef4444" : "#5eead4", fontWeight: 500 }}>
              {stock === null ? "Mengecek stok..." : outOfStock ? "Stok habis" : `Stok tersedia: ${stock}`}
            </p>

            {/* Satu tombol langsung confirm */}
            {!borrowerEmail ? (
              <button onClick={() => (window.location.href = "/auth")}
                style={{ width: "100%", padding: 13, background: "#14b8a6", border: "none", borderRadius: 8, color: "white", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                Login untuk Meminjam
              </button>
            ) : (
              <button onClick={handleBorrow} disabled={loading || outOfStock}
                style={{
                  width: "100%", padding: 13, border: "none", borderRadius: 8,
                  color: "white", fontWeight: 600, fontSize: 14,
                  background: outOfStock ? "rgba(255,255,255,0.06)" : loading ? "#0d9488" : "#14b8a6",
                  cursor: outOfStock || loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                {loading
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Memproses...</>
                  : outOfStock ? "Stok Habis" : "Confirm"
                }
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

function BookCard({ book, stock, onClick }: {
  book: BookCard; stock: number | null; onClick: () => void;
}) {
  const outOfStock = stock !== null && stock <= 0;

  return (
    <div
      onClick={!outOfStock ? onClick : undefined}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12, overflow: "hidden",
        cursor: outOfStock ? "not-allowed" : "pointer",
        opacity: outOfStock ? 0.5 : 1,
        transition: "opacity 0.2s, transform 0.15s",
      }}
      onMouseEnter={e => { if (!outOfStock) e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Cover + badge stok */}
      <div style={{ position: "relative" }}>
        <img src={book.coverUrl} style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} alt={book.title} />
        <div style={{
          position: "absolute", bottom: 8, right: 8,
          background: "rgba(10,15,30,0.88)",
          border: `1px solid ${outOfStock ? "#ef4444" : "#5eead4"}`,
          borderRadius: 6, padding: "3px 8px",
          fontSize: 11, fontWeight: 600,
          color: outOfStock ? "#ef4444" : "#5eead4",
        }}>
          {stock === null ? "—" : `${stock}`}
        </div>
      </div>

      <div style={{ padding: 12 }}>
        <h3 style={{ fontSize: 13, color: "white", marginBottom: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{book.title}</h3>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{book.authors}</p>
      </div>
    </div>
  );
}

// ─── HALAMAN KATALOG ─────────────────────────────────────────────────────────

export default function KatalogPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [searchInput, setSearchInput]   = useState("");
  const [query, setQuery]               = useState("");
  const [books, setBooks]               = useState<BookCard[]>([]);
  const [stockMap, setStockMap]         = useState<StockMap>({});
  const [selectedBook, setSelectedBook] = useState<BookCard | null>(null);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const debounce = useRef<any>(null);

  // Ambil stok dari Supabase untuk daftar buku yang sedang ditampilkan
  const fetchStocks = useCallback(async (bookList: BookCard[]) => {
    if (!bookList.length) return;
    const ids = bookList.map(b => b.googleBooksId);
    const { data } = await supabase
      .from("books")
      .select("google_books_id, stock_count")
      .in("google_books_id", ids);

    if (data) {
      const map: StockMap = {};
      data.forEach(b => { map[b.google_books_id] = b.stock_count; });
      setStockMap(map);
    }
  }, []);

  const loadBooks = useCallback(async (q: string, pg: number) => {
    setLoading(true);
    setStockMap({});
    try {
      let result: BookCard[] = [];
      if (!q.trim()) {
        result = await getFeaturedBooks();
      } else {
        const { books: res } = await searchBooks(q, PER_PAGE, (pg - 1) * PER_PAGE);
        result = res;
      }
      setBooks(result);
      fetchStocks(result); // jalan paralel, tidak perlu ditunggu
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [fetchStocks]);

  useEffect(() => { loadBooks(query, page); }, [query, page, loadBooks]);

  function handleInput(val: string) {
    setSearchInput(val);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setQuery(val); setPage(1); }, 500);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#020817", color: "white" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "rgba(2,8,23,0.96)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 28px" }}>
        <div style={{ display: "flex", alignItems: "center", height: 64, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ flex: 1, maxWidth: 1000, margin: "0 20px", position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: 10, color: "rgba(255,255,255,0.3)" }} />
            <input value={searchInput} onChange={e => handleInput(e.target.value)}
              placeholder="Cari judul atau penulis..."
              style={{ width: "100%", padding: "8px 12px 8px 36px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, color: "white", fontSize: 13, outline: "none" }} />
          </div>
        </div>
      </header>

      <main style={{ padding: "32px 28px", maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 32 }}>All Available Books</h1>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 size={28} style={{ color: "#14b8a6", animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 24 }}>
            {books.map(b => (
              <BookCard
                key={b.googleBooksId}
                book={b}
                stock={stockMap[b.googleBooksId] ?? null}
                onClick={() => setSelectedBook(b)}
              />
            ))}
          </div>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}