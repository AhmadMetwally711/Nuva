import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import supabase from "../supabase-client";

const money = (n) => `${Number(n).toLocaleString()} EGP`;

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select(
        `id, name, price, image_url, is_active,
         categories(name),
         product_variants(stock)`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading products:", error.message);
      setError("Could not load products. Please try again.");
    } else {
      setProducts(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleActive = async (product) => {
    setBusyId(product.id);
    setActionError(null);

    const { error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);

    if (error) {
      console.error("Toggle error:", error.message);
      setActionError("Could not update the product.");
    }

    await loadProducts();
    setBusyId(null);
  };

  if (loading) return <p>Loading...</p>;
  if (error) {
    return (
      <p role="alert" className="sign-form-error-message">
        {error}
      </p>
    );
  }

  const visible = products.filter((p) => {
    const matchesFilter =
      filter === "all" || (filter === "active" ? p.is_active : !p.is_active);
    const matchesQuery = p.name
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const countOf = (active) =>
    products.filter((p) => p.is_active === active).length;

  return (
    <section aria-label="Manage products">
      <div className="products-toolbar">
        <input
          type="search"
          placeholder="Search products"
          aria-label="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div
          className="filter-bar"
          role="group"
          aria-label="Filter by visibility"
        >
          <button
            className={`filter-chip ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({products.length})
          </button>
          <button
            className={`filter-chip ${filter === "active" ? "active" : ""}`}
            onClick={() => setFilter("active")}
          >
            Active ({countOf(true)})
          </button>
          <button
            className={`filter-chip ${filter === "hidden" ? "active" : ""}`}
            onClick={() => setFilter("hidden")}
          >
            Hidden ({countOf(false)})
          </button>
        </div>
        <Link to="/admin/products/new" className="primary-btn link-btn">
          + New product
        </Link>
      </div>

      {actionError && (
        <div role="alert" className="sign-form-error-message">
          {actionError}
        </div>
      )}

      {visible.length === 0 ? (
        <p>No products here.</p>
      ) : (
        <ul className="admin-product-list">
          {visible.map((p) => {
            const totalStock = p.product_variants.reduce(
              (sum, v) => sum + v.stock,
              0,
            );
            return (
              <li
                key={p.id}
                className={`admin-product ${p.is_active ? "" : "is-hidden"}`}
              >
                <img src={p.image_url} alt="" />

                <div className="cart-item-info">
                  <strong>{p.name}</strong>
                  <span className="cart-item-variant">
                    {p.categories?.name ?? "No category"} · {money(p.price)}
                  </span>
                </div>

                <div className="admin-product-stock">
                  {totalStock === 0 ? (
                    <span className="stock-out">Out of stock</span>
                  ) : (
                    <span>{totalStock} in stock</span>
                  )}
                  <span className="cart-item-variant">
                    {p.product_variants.length} variants
                  </span>
                </div>

                <span
                  className={`status-badge ${
                    p.is_active ? "status-active" : "status-hidden"
                  }`}
                >
                  {p.is_active ? "Active" : "Hidden"}
                </span>

                <div className="admin-product-actions">
                  <Link
                    to={`/admin/products/${p.id}`}
                    className="ghost-btn link-btn"
                  >
                    Edit
                  </Link>
                  <button
                    className="ghost-btn"
                    onClick={() => toggleActive(p)}
                    disabled={busyId === p.id}
                  >
                    {p.is_active ? "Hide" : "Show"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default AdminProducts;
