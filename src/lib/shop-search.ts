/** Strips characters that are syntax in a PostgREST or() filter or ilike wildcards, so q is matched literally. */
export function searchTerm(q: string | undefined) {
  return (q ?? "").replace(/[%_*,()"\\:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export const sortOptions = [
  { value: "", label: "Relevance (A–Z)" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

/** Rows arrive A–Z from the query; price sorts use each product's cheapest variant, unpriced products last. */
export function sortByPrice<T extends { variants: { price: number }[] }>(rows: T[], sort: string | undefined) {
  if (sort !== "price-asc" && sort !== "price-desc") return rows;
  const dir = sort === "price-asc" ? 1 : -1;
  const min = (p: T) => (p.variants.length ? Math.min(...p.variants.map((v) => Number(v.price))) : null);
  return [...rows].sort((a, b) => {
    const pa = min(a);
    const pb = min(b);
    if (pa === null || pb === null) return pa === pb ? 0 : pa === null ? 1 : -1;
    return (pa - pb) * dir;
  });
}
