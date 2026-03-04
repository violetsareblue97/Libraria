"use client";

// app/test-db/page.tsx
// Halaman sementara untuk memverifikasi koneksi ke Supabase.
// HAPUS file ini setelah koneksi berhasil diverifikasi.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Book {
  id: string;
  title: string;
  author: string;
  stock_count: number;
}

export default function TestDB() {
  const [books,   setBooks  ] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, stock_count");

      if (error) setError(error.message);
      else       setBooks(data ?? []);

      setLoading(false);
    }
    load();
  }, []);

  if (loading)
    return (
      <p style={{ padding: "32px", color: "white", fontFamily: "monospace" }}>
        Menghubungkan ke Supabase...
      </p>
    );

  if (error)
    return (
      <p style={{ padding: "32px", color: "#f87171", fontFamily: "monospace" }}>
        ❌ Error: {error}
      </p>
    );

  return (
    <div
      style={{
        padding: "32px",
        backgroundColor: "#020817",
        minHeight: "100vh",
        fontFamily: "monospace",
        color: "white",
      }}
    >
      <h1 style={{ color: "#5eead4", marginBottom: "16px", fontSize: "22px" }}>
        ✅ Supabase Terhubung!
      </h1>
      <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "24px" }}>
        Ditemukan {books.length} buku di database:
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {books.map((b) => (
          <div
            key={b.id}
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "12px 16px",
            }}
          >
            <strong style={{ color: "white" }}>{b.title}</strong>
            <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: "12px" }}>
              — {b.author}
            </span>
            <span style={{ color: "#5eead4", marginLeft: "12px" }}>
              [stok: {b.stock_count}]
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
