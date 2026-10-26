import { useEffect, useState } from "react";
import supabase from "../supabase-client";
import ProductCard from "../components/ProductCard";
import { useSearchParams } from "react-router-dom";

function Shop() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "all";
  const setActiveCategory = (slug) =>
    setSearchParams(slug === "all" ? {} : { category: slug });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadShop() {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, price, image_url, categories(name, slug)")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name, slug").order("name"),
      ]);

      if (productsRes.error || categoriesRes.error) {
        console.error(productsRes.error || categoriesRes.error);
        setError("Could not load products. Please try again.");
      } else {
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
      }
      setLoading(false);
    }
    loadShop();
  }, []);

  const visibleProducts =
    activeCategory === "all"
      ? products
      : products.filter((p) => p.categories?.slug === activeCategory);

  if (loading) return <p>Loading...</p>;
  if (error)
    return (
      <p role="alert" className="sign-form-error-message">
        {error}
      </p>
    );

  return (
    <section aria-label="Products">
      <h1 className="shop-title">Shop</h1>

      <div className="filter-bar" role="group" aria-label="Filter by category">
        <button
          className={`filter-chip ${activeCategory === "all" ? "active" : ""}`}
          onClick={() => setActiveCategory("all")}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`filter-chip ${activeCategory === c.slug ? "active" : ""}`}
            onClick={() => setActiveCategory(c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {visibleProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {visibleProducts.length === 0 && <p>No products here yet.</p>}
    </section>
  );
}

export default Shop;
