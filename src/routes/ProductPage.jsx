import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { Link, useParams } from "react-router-dom";
import supabase from "../supabase-client";
import { useAuth } from "../context/AuthContext";
import ReturnPolicyNote from "../components/ReturnPolicyNote";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

function ProductPage() {
  const { items, addItem } = useCart();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  const [justAddedId, setJustAddedId] = useState(null);

  useEffect(() => {
    if (justAddedId === null) return;
    const timer = setTimeout(() => setJustAddedId(null), 2500);
    return () => clearTimeout(timer);
  }, [justAddedId]);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setSize(null);
      setColor(null);

      const { data, error } = await supabase
        .from("products")
        .select(
          `id, name, description, price, image_url,
           categories(name),
           product_variants(id, size, color, stock)`,
        )
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) console.error("Error loading product:", error.message);
      setProduct(data ?? null);
      setLoading(false);
    }
    loadProduct();
  }, [id]);

  if (loading) return <p>Loading...</p>;

  if (!product) {
    return (
      <>
        <Link to="/shop" className="back-link">
          ← Back to shop
        </Link>
        <p>Product not found.</p>
      </>
    );
  }

  const variants = product.product_variants;

  const sizes = [...new Set(variants.map((v) => v.size))].sort(
    (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b),
  );
  const colors = [...new Set(variants.map((v) => v.color))];
  const selectedVariant = variants.find(
    (v) => v.size === size && v.color === color,
  );

  const justAdded =
    Boolean(selectedVariant) && justAddedId === selectedVariant.id;
  const inCart = selectedVariant
    ? items.find((i) => i.variantId === selectedVariant.id)
    : null;

  const handleAddToCart = () => {
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url,
      size: selectedVariant.size,
      color: selectedVariant.color,
      stock: selectedVariant.stock,
    });
    setJustAddedId(selectedVariant.id);
  };

  const sizeDisabled = (s) =>
    !variants.some(
      (v) => v.size === s && v.stock > 0 && (!color || v.color === color),
    );

  const colorDisabled = (c) =>
    !variants.some(
      (v) => v.color === c && v.stock > 0 && (!size || v.size === size),
    );

  return (
    <>
      <Link to="/shop" className="back-link">
        ← Back to shop
      </Link>

      <div className="product-page">
        <div className="product-page-image">
          <img src={product.image_url} alt={product.name} />
        </div>

        <div className="product-details">
          <span className="product-category">{product.categories?.name}</span>
          <h1>{product.name}</h1>
          <p className="product-price">
            {Number(product.price).toLocaleString()} EGP
          </p>
          <p className="product-description">{product.description}</p>

          <div className="option-group" role="group" aria-label="Select size">
            <span className="option-label">Size</span>
            <div className="option-chips">
              {sizes.map((s) => (
                <button
                  key={s}
                  className={`filter-chip ${size === s ? "active" : ""}`}
                  disabled={sizeDisabled(s)}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="option-group" role="group" aria-label="Select color">
            <span className="option-label">Color</span>
            <div className="option-chips">
              {colors.map((c) => (
                <button
                  key={c}
                  className={`filter-chip ${color === c ? "active" : ""}`}
                  disabled={colorDisabled(c)}
                  onClick={() => setColor(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {selectedVariant && selectedVariant.stock <= 3 && (
            <p className="stock-note">Only {selectedVariant.stock} left!</p>
          )}

          {inCart && (
            <p className="in-cart-note">
              {inCart.quantity} in your cart — <Link to="/cart">View cart</Link>
            </p>
          )}

          <button
            className={`add-to-cart-btn ${justAdded ? "is-added" : ""}`}
            onClick={handleAddToCart}
            disabled={
              isAdmin ||
              !selectedVariant ||
              selectedVariant.stock === 0 ||
              (inCart && inCart.quantity >= selectedVariant.stock)
            }
          >
            {isAdmin
              ? "Admins can't order"
              : justAdded
                ? "Added ✓"
                : selectedVariant
                  ? "Add to cart"
                  : "Select size and color"}
          </button>
          <span className="sr-only" role="status">
            {justAdded ? "Added to your cart" : ""}
          </span>
          <ReturnPolicyNote />
        </div>
      </div>
    </>
  );
}

export default ProductPage;
