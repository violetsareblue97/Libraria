export interface GoogleBookVolume {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    language?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
    previewLink?: string;
    infoLink?: string;
  };
}

export interface GoogleBooksApiResponse {
  totalItems: number;
  items?: GoogleBookVolume[];
}

// Versi bersih untuk dipakai di komponen UI
export interface BookCard {
  googleBooksId: string;
  title: string;
  authors: string;
  publisher: string;
  publishedYear: string;
  description: string;
  categories: string;
  coverUrl: string;
  pageCount: number;
  language: string;
  previewLink: string;
  rating: number;

  // optional stock count from Supabase cache; undefined if never borrowed
  stock?: number;
}
// Transaksi dari Supabase
export interface Transaction {
  id: string;
  book_id: string;
  google_books_id: string;
  book_title: string;
  book_authors: string;
  book_cover_url: string | null;
  borrower_name: string;
  borrower_email: string;
  status: "borrowed" | "returned" | "overdue";
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
}