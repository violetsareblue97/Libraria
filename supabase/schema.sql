-- ═══════════════════════════════════════════════════════════════════════════
-- LIBRARIA — Database Schema v2 (Integrasi Google Books API)
-- Jalankan file SQL ini di Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ARSITEKTUR:
--   Google Books API  →  menyediakan data buku (judul, cover, deskripsi, dll.)
--   Supabase          →  menyimpan transaksi peminjaman & cache buku yang dipinjam
--
-- ALUR DATA:
--   1. User mencari buku di katalog (data dari Google Books API, real-time)
--   2. User klik "Pinjam" → sistem menyimpan data buku ke tabel `books`
--      (sebagai cache, menggunakan google_books_id sebagai referensi unik)
--   3. Transaksi peminjaman dicatat di tabel `transactions`
--
-- KEUNTUNGAN PENDEKATAN INI:
--   ✓ Tidak perlu input manual ribuan buku ke database
--   ✓ Data buku selalu up-to-date (dari Google)
--   ✓ Hanya buku yang pernah dipinjam yang masuk ke Supabase
--   ✓ Stok tetap dikelola di Supabase (bukan Google Books)
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- LANGKAH 0: Hapus tabel lama kalau ada (untuk fresh start)
-- HATI-HATI: Uncomment baris di bawah hanya kalau kamu mau reset total!
-- ───────────────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS transactions CASCADE;
-- DROP TABLE IF EXISTS books        CASCADE;
-- DROP TABLE IF EXISTS profiles     CASCADE;


-- ───────────────────────────────────────────────────────────────────────────
-- TABEL 1: profiles
-- Menyimpan data pengguna — terhubung ke Supabase Auth
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  -- Menggunakan UUID yang sama dengan auth.users (Supabase Auth)
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  full_name  TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,

  -- Role menentukan hak akses:
  --   'member' → bisa cari buku & pinjam
  --   'admin'  → bisa kelola semua transaksi & stok
  role       TEXT        NOT NULL DEFAULT 'member'
               CHECK (role IN ('admin', 'member')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  profiles      IS 'Profil pengguna Libraria. Terhubung ke Supabase Auth.';
COMMENT ON COLUMN profiles.role IS 'member = peminjam biasa, admin = pengelola perpustakaan';


-- ───────────────────────────────────────────────────────────────────────────
-- TABEL 2: books
-- Cache buku dari Google Books API.
-- Buku masuk ke tabel ini HANYA saat pertama kali dipinjam.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  -- Primary key internal Supabase
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ID unik dari Google Books API (contoh: "zyTCAlFPjgYC")
  -- Digunakan untuk deduplikasi — satu buku hanya boleh ada sekali
  google_books_id TEXT        NOT NULL UNIQUE,

  -- Data yang di-cache dari Google Books API
  title           TEXT        NOT NULL,
  authors         TEXT        NOT NULL,                   -- Join dari array, misal: "A, B, C"
  publisher       TEXT,
  published_year  TEXT,                                   -- Disimpan sebagai TEXT: "2021"
  description     TEXT,                                   -- Sinopsis bersih (tanpa HTML)
  categories      TEXT,                                   -- Genre, join dari array
  cover_url       TEXT,                                   -- URL thumbnail HTTPS dari Google Books
  page_count      INTEGER,
  language        TEXT        DEFAULT 'id',
  preview_link    TEXT,                                   -- URL preview Google Books

  -- Stok dikelola manual oleh Admin di Supabase
  -- Tidak dari Google Books (Google tidak punya info stok fisik)
  stock_count     INTEGER     NOT NULL DEFAULT 1
                    CHECK (stock_count >= 0),            -- Tidak boleh negatif

  -- Waktu data ini masuk ke cache
  cached_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  books                 IS 'Cache buku dari Google Books API. Diisi otomatis saat peminjaman.';
COMMENT ON COLUMN books.google_books_id IS 'ID volume Google Books. Contoh: zyTCAlFPjgYC';
COMMENT ON COLUMN books.stock_count     IS 'Jumlah eksemplar fisik yang tersedia. Dikelola oleh Admin.';
COMMENT ON COLUMN books.cached_at       IS 'Waktu data buku pertama kali di-cache dari Google Books.';


-- ───────────────────────────────────────────────────────────────────────────
-- TABEL 3: transactions
-- Log lengkap setiap transaksi peminjaman dan pengembalian buku
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relasi ke pengguna yang meminjam
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Relasi ke buku yang dipinjam (Supabase internal ID)
  book_id         UUID        NOT NULL REFERENCES books(id)    ON DELETE RESTRICT,

  -- google_books_id disimpan langsung untuk kemudahan query
  -- (tidak perlu JOIN ke tabel books untuk tahu buku apa)
  google_books_id TEXT        NOT NULL,

  -- Status transaksi
  status          TEXT        NOT NULL DEFAULT 'borrowed'
                    CHECK (status IN ('borrowed', 'returned', 'overdue')),
  --   'borrowed'  → sedang dipinjam
  --   'returned'  → sudah dikembalikan
  --   'overdue'   → terlambat dikembalikan (bisa di-set via cron job)

  -- Timestamps transaksi
  borrowed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  returned_at     TIMESTAMPTZ,                           -- NULL selama masih dipinjam

  -- Tenggat waktu otomatis: borrowed_at + 14 hari
  -- GENERATED ALWAYS AS → dihitung otomatis oleh PostgreSQL, tidak bisa diubah manual
  due_date        TIMESTAMPTZ GENERATED ALWAYS AS
                    (borrowed_at + INTERVAL '14 days') STORED,

  -- Catatan tambahan (opsional, untuk admin)
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  transactions                IS 'Log lengkap peminjaman dan pengembalian buku.';
COMMENT ON COLUMN transactions.google_books_id IS 'Disimpan langsung untuk query cepat tanpa JOIN.';
COMMENT ON COLUMN transactions.due_date        IS 'Otomatis: borrowed_at + 14 hari. Tidak bisa diubah manual.';
COMMENT ON COLUMN transactions.returned_at     IS 'NULL = masih dipinjam. Diisi saat pengembalian.';


-- ───────────────────────────────────────────────────────────────────────────
-- INDEX — Mempercepat query yang sering digunakan
-- ───────────────────────────────────────────────────────────────────────────

-- Index untuk pencarian buku di tabel books
CREATE INDEX IF NOT EXISTS idx_books_google_id
  ON books(google_books_id);                             -- Lookup by Google Books ID

CREATE INDEX IF NOT EXISTS idx_books_title
  ON books USING gin(to_tsvector('simple', title));      -- Full-text search judul

CREATE INDEX IF NOT EXISTS idx_books_authors
  ON books USING gin(to_tsvector('simple', authors));    -- Full-text search penulis

-- Index untuk query transaksi (yang paling sering dipakai)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id
  ON transactions(user_id);                              -- "Semua pinjaman user X"

CREATE INDEX IF NOT EXISTS idx_transactions_book_id
  ON transactions(book_id);                              -- "Siapa yang pinjam buku Y"

CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON transactions(status);                               -- "Semua yang masih dipinjam"

CREATE INDEX IF NOT EXISTS idx_transactions_google_books_id
  ON transactions(google_books_id);                      -- "Riwayat pinjaman buku Z"

CREATE INDEX IF NOT EXISTS idx_transactions_due_date
  ON transactions(due_date) WHERE status = 'borrowed';   -- "Buku yang hampir jatuh tempo"


-- ───────────────────────────────────────────────────────────────────────────
-- FUNCTION: update_updated_at
-- Trigger function untuk auto-update kolom updated_at
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pasang trigger ke tabel profiles
CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Pasang trigger ke tabel books
CREATE OR REPLACE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ───────────────────────────────────────────────────────────────────────────
-- FUNCTION: upsert_book_from_google
-- Menyimpan data buku dari Google Books ke tabel books.
-- Kalau buku sudah ada (by google_books_id), update data yang berubah.
-- Kalau belum ada, insert baru.
-- Dipanggil dari backend setiap kali user meminjam buku.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_book_from_google(
  p_google_books_id TEXT,
  p_title           TEXT,
  p_authors         TEXT,
  p_publisher       TEXT    DEFAULT NULL,
  p_published_year  TEXT    DEFAULT NULL,
  p_description     TEXT    DEFAULT NULL,
  p_categories      TEXT    DEFAULT NULL,
  p_cover_url       TEXT    DEFAULT NULL,
  p_page_count      INTEGER DEFAULT NULL,
  p_language        TEXT    DEFAULT 'id',
  p_preview_link    TEXT    DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_book_id UUID;
BEGIN
  -- Cek apakah buku sudah ada
  SELECT id INTO v_book_id
  FROM books
  WHERE google_books_id = p_google_books_id;

  IF v_book_id IS NULL THEN
    -- Buku belum ada → INSERT baru dengan stok default 1
    INSERT INTO books (
      google_books_id, title, authors, publisher, published_year,
      description, categories, cover_url, page_count, language, preview_link
    ) VALUES (
      p_google_books_id, p_title, p_authors, p_publisher, p_published_year,
      p_description, p_categories, p_cover_url, p_page_count, p_language, p_preview_link
    )
    RETURNING id INTO v_book_id;
  ELSE
    -- Buku sudah ada → UPDATE data (stok tidak diubah — dikelola admin)
    UPDATE books SET
      title          = p_title,
      authors        = p_authors,
      publisher      = COALESCE(p_publisher, publisher),
      cover_url      = COALESCE(p_cover_url, cover_url),
      description    = COALESCE(p_description, description),
      categories     = COALESCE(p_categories, categories),
      preview_link   = COALESCE(p_preview_link, preview_link),
      cached_at      = NOW()
    WHERE id = v_book_id;
  END IF;

  RETURN v_book_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION upsert_book_from_google IS
  'Simpan atau update buku dari Google Books. Return UUID buku di Supabase.';


-- ───────────────────────────────────────────────────────────────────────────
-- FUNCTION: get_active_loans
-- View ringkas: semua peminjaman yang masih aktif (status = borrowed)
-- Berguna untuk dashboard admin
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW active_loans AS
SELECT
  t.id                AS transaction_id,
  p.full_name         AS borrower_name,
  p.email             AS borrower_email,
  b.title             AS book_title,
  b.authors           AS book_authors,
  b.cover_url         AS book_cover,
  b.google_books_id,
  t.borrowed_at,
  t.due_date,
  -- Hari tersisa sebelum jatuh tempo
  GREATEST(0, EXTRACT(DAY FROM (t.due_date - NOW()))::INTEGER) AS days_remaining,
  -- Apakah sudah melewati due_date?
  CASE WHEN NOW() > t.due_date THEN TRUE ELSE FALSE END         AS is_overdue
FROM transactions t
JOIN profiles p ON p.id = t.user_id
JOIN books    b ON b.id = t.book_id
WHERE t.status = 'borrowed'
ORDER BY t.due_date ASC;  -- Urutkan dari yang paling dekat jatuh tempo

COMMENT ON VIEW active_loans IS 'Semua peminjaman aktif dengan info borrower dan buku. Untuk dashboard admin.';


-- ───────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Keamanan level baris — memastikan user hanya bisa akses data miliknya
-- ───────────────────────────────────────────────────────────────────────────

-- Aktifkan RLS untuk semua tabel
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE books        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ── Policy untuk tabel books ──
-- Siapapun (termasuk anonymous) bisa baca katalog buku
CREATE POLICY "books_select_public"
  ON books FOR SELECT
  USING (true);

-- Hanya admin yang bisa tambah/ubah/hapus buku
CREATE POLICY "books_modify_admin"
  ON books FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System bisa insert buku (via upsert function, SECURITY DEFINER)
CREATE POLICY "books_insert_system"
  ON books FOR INSERT
  WITH CHECK (true);

-- ── Policy untuk tabel profiles ──
-- User hanya bisa lihat dan edit profil sendiri
CREATE POLICY "profiles_own"
  ON profiles FOR ALL
  USING (auth.uid() = id);

-- ── Policy untuk tabel transactions ──
-- Member hanya bisa lihat transaksi milik sendiri
CREATE POLICY "transactions_select_own"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Member bisa buat transaksi baru (meminjam buku)
CREATE POLICY "transactions_insert_own"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin bisa lihat dan ubah semua transaksi
CREATE POLICY "transactions_admin_all"
  ON transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ───────────────────────────────────────────────────────────────────────────
-- DATA SAMPLE
-- 5 buku populer sudah di-cache sebagai contoh.
-- Dalam produksi, data ini akan diisi otomatis saat user meminjam.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO books (
  google_books_id, title, authors, publisher, published_year,
  description, categories, cover_url, page_count, language, stock_count
) VALUES
  (
    'nfmWDwAAQBAJ',
    'Laskar Pelangi',
    'Andrea Hirata',
    'Bentang Pustaka',
    '2005',
    'Novel tentang semangat belajar anak-anak di sebuah desa di Pulau Belitung yang penuh keterbatasan namun kaya mimpi.',
    'Fiksi, Sastra Indonesia',
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80',
    529, 'id', 5
  ),
  (
    'xPR3nQEACAAJ',
    'Bumi Manusia',
    'Pramoedya Ananta Toer',
    'Lentera Dipantara',
    '1980',
    'Kisah Minke, seorang pribumi terpelajar di era kolonial Hindia Belanda, yang berjuang melawan ketidakadilan.',
    'Fiksi Historis, Sastra Indonesia',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
    535, 'id', 3
  ),
  (
    'FmyBswEACAAJ',
    'Sapiens: Riwayat Singkat Umat Manusia',
    'Yuval Noah Harari',
    'Kepustakaan Populer Gramedia',
    '2017',
    'Dari zaman batu hingga era digital, Harari menelusuri perjalanan Homo sapiens menjadi spesies paling dominan di Bumi.',
    'Non-Fiksi, Sejarah, Sains',
    'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&q=80',
    513, 'id', 4
  ),
  (
    'hjEFCAAAQBAJ',
    'Clean Code: A Handbook of Agile Software Craftsmanship',
    'Robert C. Martin',
    'Prentice Hall',
    '2008',
    'Panduan komprehensif untuk menulis kode yang bersih, mudah dibaca, dan mudah di-maintain oleh tim pengembang.',
    'Teknologi, Pemrograman',
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=80',
    431, 'en', 2
  ),
  (
    'XfFvDwAAQBAJ',
    'Atomic Habits',
    'James Clear',
    'Avery',
    '2018',
    'Panduan praktis berbasis riset tentang cara membangun kebiasaan baik, menghilangkan kebiasaan buruk secara sistematis.',
    'Pengembangan Diri, Psikologi',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    319, 'en', 6
  )
ON CONFLICT (google_books_id) DO NOTHING;  -- Jika sudah ada, skip (tidak error)


-- ───────────────────────────────────────────────────────────────────────────
-- VERIFIKASI — Query untuk cek semua berhasil dibuat
-- Jalankan query di bawah setelah schema di atas selesai
-- ───────────────────────────────────────────────────────────────────────────

-- Cek tabel:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Cek data sample books:
-- SELECT google_books_id, title, authors, stock_count FROM books;

-- Cek view active_loans (akan kosong karena belum ada transaksi):
-- SELECT * FROM active_loans;

-- Cek index:
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
