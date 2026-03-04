"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, CheckCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { searchBooks, getFeaturedBooks } from "@/lib/open-library";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { BookCard } from "@/lib/types/open-library";

const PER_PAGE    = 10;
const FETCH_LIMIT = 150;
const DEFAULT_STOCK = 5; //for default stock count for new books, adjusted directly in supabase if needed

type StockMap = Record<string, number>;

// SYNCH BOOK FROM OPEN LIBRARY TO SUPABASE

async function syncBooksToSupabase(bookList: BookCard[]) {
  if (!bookList.length) return;

  const rows = bookList.map(b => ({
    google_books_id: b.googleBooksId,
    title:           b.title,
    authors:         b.authors,
    cover_url:       b.coverUrl,
    stock_count:     DEFAULT_STOCK,
  }));

  // Upsert with "ignoreDuplicates" to only insert new books, skip existing ones based on "google_books_id"
  const { error } = await supabase
    .from("books")
    .upsert(rows, { onConflict: "google_books_id", ignoreDuplicates: true });


  if (error) console.error("Sync books error:", error.message);
}

{/* Borrow Modal */}

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
        // fallback if book somehow doesn't exist in DB
        const { data: newBook, error } = await supabase.from("books").insert({
          google_books_id: book.googleBooksId, title: book.title,
          authors: book.authors, cover_url: book.coverUrl, stock_count: DEFAULT_STOCK,
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
      alert("Failed to borrow: " + err.message);
    } finally { setLoading(false); }
  }

    return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "#000000d9", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0f172a", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, maxWidth: 360, width: "100%", padding: 32, textAlign: "center", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", right: 16, top: 16, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
          <X size={20} />
        </button>

        {isAuthLoading ? (
          <div style={{ padding: "40px 0" }}>
            <Loader2 size={28} style={{ margin: "0 auto", color: "#14b8a6", animation: "spin 1s linear infinite", display: "block" }} />
            <p style={{ color: "white", marginTop: 14, fontSize: 14 }}>Loading...</p>
          </div>
        ) : success ? (
          <div style={{ padding: "20px 0" }}>
            <CheckCircle size={56} color="#14b8a6" style={{ margin: "0 auto 14px", display: "block" }} />
            <h3 style={{ color: "white", fontSize: 17, marginBottom: 6 }}>Borrowing Successful!</h3>
          </div>

        ) : (
          <>

          <img src={book.coverUrl}
              style={{ width: 100, height: 145, objectFit: "cover", borderRadius: 8, margin: "0 auto 18px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", display: "block" }}
              alt={book.title} />

            <h3 style={{ color: "white", fontSize: 16, marginBottom: 4, lineHeight: 1.3 }}>{book.title}</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 12 }}>{book.authors}</p>
            
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 6, marginBottom: 24, background: "#0a0f1ee0", border: `1px solid ${outOfStock ? "rgba(239,68,68,0.25)" : "rgba(94,234,212,0.2)"}` }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: outOfStock ? "#ef4444" : "#5eead4" }}>
                {stock === null ? "Checking stock..." : outOfStock ? "Out of stock" : `${stock} available`}
              </span>
            </div>

            {!borrowerEmail ? (
              <button onClick={() => (window.location.href = "/auth")}
                style={{ width: "100%", padding: 13, background: "#14b8a6", border: "none", borderRadius: 8, color: "white", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                You must log in first to borrow Books
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
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading...</>
                  : outOfStock ? "Book is not available at the moment" : "Confirm"
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



{/* Book Card*/}
function BookCard({ book, stock, onClick }: {
  book: BookCard; stock: number | null; onClick: () => void;
}) {
  const outOfStock = stock !== null && stock <= 0;

  return (
    <div
      onClick={!outOfStock ? onClick : undefined}
      style={{
        background: "#081021",
        borderRadius: 12, overflow: "hidden",
        cursor: outOfStock ? "not-allowed" : "pointer",
        opacity: outOfStock ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!outOfStock) e.currentTarget.style.transform = "scale(1.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
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
         Available: {stock === null ? "—" : `${stock}`} book/s
        </div>
      </div>

      <div style={{ padding: 12 }}>
        <h3 style={{ fontSize: 16, color: "white", marginBottom: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{book.title}</h3>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>By: {book.authors}</p>
      </div>
    </div>
  );
}




{/*Pagination*/}
function Pagination({ page, totalPages, onPrev, onNext }: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  const btn = (disabled: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "9px 20px", borderRadius: 10,
    background: disabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13, fontWeight: 500, transition: "all 0.2s",
    fontFamily: "var(--font-dm-sans), sans-serif",
  });

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 40, paddingBottom: 40 }}>
      <button onClick={onPrev} disabled={page <= 1} style={btn(page <= 1)}
        onMouseEnter={e => { if (page > 1) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "white"; } }}
        onMouseLeave={e => { if (page > 1) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; } }}>
        <ChevronLeft size={15} /> Previous
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", background: "rgba(94,234,212,0.08)", border: "1px solid rgba(94,234,212,0.18)", borderRadius: 10, fontSize: 13 }}>
        <span style={{ color: "#5eead4", fontWeight: 600 }}>{page}</span>
        <span style={{ color: "rgba(255,255,255,0.25)" }}>/</span>
        <span style={{ color: "rgba(255,255,255,0.45)" }}>{totalPages}</span>
      </div>

      <button onClick={onNext} disabled={page >= totalPages} style={btn(page >= totalPages)}
        onMouseEnter={e => { if (page < totalPages) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "white"; } }}
        onMouseLeave={e => { if (page < totalPages) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; } }}>
        Next <ChevronRight size={15} />
      </button>
    </div>
  );
}



{/*MAIN PAGE*/}
export default function KatalogPage() {
  const { user, profile, loading: authLoading } = useAuth();

  const [allBooks, setAllBooks]         = useState<BookCard[]>([]);
  const [stockMap, setStockMap]         = useState<StockMap>({});
  const [selectedBook, setSelectedBook] = useState<BookCard | null>(null);
  const [loading, setLoading]           = useState(true);
  const [syncing, setSyncing]           = useState(false);

  const [searchInput, setSearchInput]   = useState("");
  const debounceRef = useRef<any>(null);

  const [page, setPage] = useState(1);

  const start      = (page - 1) * PER_PAGE;
  const paginated  = allBooks.slice(start, start + PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(allBooks.length / PER_PAGE));


  //book data sync 

  // Fetch stock counts for a list of books and update the stockMap state
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

  //load books
  const loadBooks = useCallback(async (q: string) => {
    setLoading(true);
    setAllBooks([]);
    setStockMap({});
    setPage(1);
    try {
      let result: BookCard[];
      if (!q.trim()) {
        result = await getFeaturedBooks();
      } else {
        const { books } = await searchBooks(q, FETCH_LIMIT, 0);
        result = books;
      }
      setAllBooks(result);


      setSyncing(true);
      await syncBooksToSupabase(result);
      setSyncing(false);


      await fetchStocks(result);
    } catch (err) {
      console.error("loadBooks error:", err);
      setAllBooks([]);
    } finally {
      setLoading(false);
    }
  }, [fetchStocks]);

  useEffect(() => { loadBooks(""); }, [loadBooks]);

  function handleInput(val: string) {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadBooks(val), 600);
  }

  function goToPage(newPage: number) {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "white" }}>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      `}</style>



      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#0a1228b3", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", height: 64, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ flex: 1, maxWidth: 640, position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)" }} />
            <input value={searchInput} onChange={e => handleInput(e.target.value)}
              placeholder="Search title or author..."
              style={{ width: "100%", padding: "9px 14px 9px 38px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 999, color: "white", fontSize: 13, outline: "none", fontFamily: "var(--font-dm-sans), sans-serif", transition: "border-color 0.2s" }}
              onFocus={e => (e.target.style.borderColor = "rgba(94,234,212,0.35)")}
              onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.09)")} />
          </div>
        </div>
      </header>

      <main style={{ padding: "36px 32px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Title row */}
        <div style={{ marginBottom: 28, animation: "fadeUp 0.4s ease", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 30, fontWeight: 600, color: "white", margin: 0 }}>All Available Books</h1>
          </div>
          {!loading && allBooks.length > 0 && (
            <p style={{ color: "#ffffff40", fontSize: 13 }}>
              Showing{" "}
              <span style={{ color: "#ffffff40" }}>{start + 1}–{Math.min(start + PER_PAGE, allBooks.length)}</span>
              {" "}of{" "}
              <span style={{ color: "#ffffff40" }}>{allBooks.length}</span> books
            </p>
          )}
        </div>

        {/* Grid */}
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
                <BookCard key={b.googleBooksId} book={b}
                  stock={stockMap[b.googleBooksId] ?? null}
                  onClick={() => setSelectedBook(b)} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPrev={() => goToPage(page - 1)} onNext={() => goToPage(page + 1)} />
          </>
        )}
      </main>

      {selectedBook && (
        <BorrowModal book={selectedBook} onClose={() => setSelectedBook(null)}
          user={user} profile={profile} isAuthLoading={authLoading}
          stock={stockMap[selectedBook.googleBooksId] ?? null} />
      )}
    </div>
  );
}