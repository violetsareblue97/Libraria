import { BookCard } from "./types/open-library";

export async function searchBooks(
  query: string,
  limit = 10,
  offset = 0
): Promise<{ books: BookCard[]; total: number }> {
  const page = Math.floor(offset / limit) + 1;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch from Open Library");
    const data = await res.json();

    const formattedBooks: BookCard[] = (data.docs ?? []).map((item: any) => ({
      googleBooksId: item.key.replace("/works/", ""),
      title: item.title,
      authors: item.author_name ? item.author_name.join(", ") : "Unknown Author",
      publisher: item.publisher ? item.publisher[0] : "Unknown",
      publishedYear: item.first_publish_year
        ? item.first_publish_year.toString()
        : "—",
      description: item.first_sentence
        ? item.first_sentence[0]
        : "No description available.",
      categories: item.subject ? item.subject.slice(0, 3).join(", ") : "General",
      coverUrl: item.cover_i
        ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
        : `https://images.placeholders.dev/?width=200&height=300&text=No+Cover&background=111&color=555`,
      pageCount: item.number_of_pages_median || 0,
      language: item.language ? item.language[0] : "en",
      previewLink: `https://openlibrary.org${item.key}`,
      rating: item.ratings_average || 0,
    }));

    return { books: formattedBooks, total: data.numFound };
  } catch (error) {
    console.error("Open Library Error:", error);
    return { books: [], total: 0 };
  }
}

// Ambil 150 buku populer sekaligus — client paginate 10/halaman
export async function getFeaturedBooks(): Promise<BookCard[]> {
  const { books } = await searchBooks("popular fiction classic novel", 150, 0);
  return books;
}