import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../supabase-client";
import ProductCard from "../components/ProductCard";
import { CONTACT, RETURN_WINDOW_DAYS } from "../config";

function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, categories(name, slug)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);

      if (cancelled) return;

      if (error) {
        console.error("Error loading home:", error.message);
        setError("Could not load products. Please try again.");
      } else {
        setProducts(data);
      }
      setLoading(false);
    }
    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const newest = products[0];
  const arrivals = products.slice(0, 8);

  const tileMap = new Map();
  for (const p of products) {
    const c = p.categories;
    if (!c) continue;
    if (!tileMap.has(c.slug)) {
      tileMap.set(c.slug, {
        name: c.name,
        slug: c.slug,
        image: p.image_url,
        count: 0,
      });
    }
    tileMap.get(c.slug).count += 1;
  }
  const tiles = [...tileMap.values()];

  return (
    <>
      <section className="hero" aria-label="Welcome">
        <div className="hero-text">
          <span className="hero-eyebrow">New collection</span>
          <h1>Everyday clothing, made simple.</h1>
          <p>Soft fabrics, easy fits, and prices that make sense.</p>
          <div className="hero-actions">
            <Link to="/shop" className="hero-btn hero-btn-primary">
              Shop now
            </Link>
            <a href="#new-arrivals" className="hero-btn hero-btn-ghost">
              See what's new
            </a>
          </div>
        </div>

        {newest && (
          <Link to={`/product/${newest.id}`} className="hero-image">
            <img src={newest.image_url} alt={newest.name} />
            <span className="hero-caption">
              {newest.name} · {Number(newest.price).toLocaleString()} EGP
            </span>
          </Link>
        )}
      </section>

      <ul className="benefits">
        <li>
          <strong>Cash on delivery</strong>
          <span>Pay when your order arrives</span>
        </li>
        <li>
          <strong>{RETURN_WINDOW_DAYS}-day returns</strong>
          <span>Contact us within {RETURN_WINDOW_DAYS} days of delivery</span>
        </li>
        <li>
          <strong>Support on WhatsApp</strong>
          <a href={CONTACT.whatsappUrl} target="_blank" rel="noreferrer">
            Message us →
          </a>
        </li>
      </ul>

      {loading && <p>Loading...</p>}

      {error && (
        <p role="alert" className="sign-form-error-message">
          {error}
        </p>
      )}

      {tiles.length > 0 && (
        <section className="home-section" aria-labelledby="categories-title">
          <div className="section-head">
            <h2 id="categories-title">Shop by category</h2>
          </div>
          <div className="category-grid">
            {tiles.map((t) => (
              <Link
                key={t.slug}
                to={`/shop?category=${t.slug}`}
                className="category-tile"
              >
                <img src={t.image} alt="" loading="lazy" />
                <span className="category-tile-label">
                  {t.name}
                  <small>
                    {t.count} {t.count === 1 ? "item" : "items"}
                  </small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {arrivals.length > 0 && (
        <section
          id="new-arrivals"
          className="home-section"
          aria-labelledby="arrivals-title"
        >
          <div className="section-head">
            <h2 id="arrivals-title">New arrivals</h2>
            <Link to="/shop" className="back-link">
              View all →
            </Link>
          </div>
          <div className="product-grid">
            {arrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default Home;
