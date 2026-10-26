import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import supabase from "../supabase-client";
import { SIZES } from "../sizes";

const BUCKET = "product-images";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const QUICK_SIZES = ["S", "M", "L", "XL"];

const normalizeColor = (c) =>
  c
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const slugify = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `category-${Date.now()}`;

const sortVariants = (list) =>
  [...list].sort(
    (a, b) =>
      a.color.localeCompare(b.color) ||
      SIZES.indexOf(a.size) - SIZES.indexOf(b.size),
  );

const storagePathFromUrl = (url) => {
  const marker = `/${BUCKET}/`;
  const i = url ? url.indexOf(marker) : -1;
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
};

function ProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    is_active: true,
  });
  const [imageUrl, setImageUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [variants, setVariants] = useState([]);
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("M");
  const [variantError, setVariantError] = useState(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [catsRes, productRes] = await Promise.all([
        supabase.from("categories").select("id, name, slug").order("name"),
        isNew
          ? Promise.resolve({ data: null, error: null })
          : supabase
              .from("products")
              .select(
                `id, name, description, price, image_url, category_id, is_active,
                 product_variants(id, size, color, stock)`,
              )
              .eq("id", id)
              .maybeSingle(),
      ]);
      if (cancelled) return;

      if (catsRes.error || productRes.error) {
        console.error(
          "Load error:",
          (catsRes.error || productRes.error).message,
        );
        setError("Could not load the page. Please try again.");
        setLoading(false);
        return;
      }

      setCategories(catsRes.data);

      if (!isNew) {
        const p = productRes.data;
        if (!p) {
          setNotFound(true);
        } else {
          setForm({
            name: p.name,
            description: p.description ?? "",
            price: String(p.price),
            category_id: p.category_id ? String(p.category_id) : "",
            is_active: p.is_active,
          });
          setImageUrl(p.image_url);
          setVariants(
            sortVariants(
              p.product_variants.map((v) => ({
                key: `v${v.id}`,
                id: v.id,
                size: v.size,
                color: v.color,
                stock: String(v.stock),
                old_stock: v.stock,
              })),
            ),
          );
        }
      }
      setLoading(false);
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const setField = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const handleFile = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (!ALLOWED_TYPES.includes(picked.type)) {
      setError("Please use a JPG, PNG or WebP image.");
      e.target.value = "";
      return;
    }
    if (picked.size > MAX_IMAGE_BYTES) {
      setError("The image is too large. Maximum size is 2 MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setFile(picked);
  };

  const addVariants = (sizesToAdd) => {
    const color = normalizeColor(newColor);
    if (!color) {
      setVariantError("Enter a color first.");
      return;
    }

    const additions = sizesToAdd
      .filter(
        (size) =>
          !variants.some(
            (v) =>
              v.size === size && v.color.toLowerCase() === color.toLowerCase(),
          ),
      )
      .map((size) => ({
        key: crypto.randomUUID(),
        id: null,
        size,
        color,
        stock: "0",
        old_stock: null,
      }));

    if (additions.length === 0) {
      setVariantError(`${color} already has ${sizesToAdd.join(", ")}.`);
      return;
    }

    setVariantError(null);
    setVariants(sortVariants([...variants, ...additions]));
    setNewColor("");
  };

  const removeVariant = (key) =>
    setVariants((prev) => prev.filter((v) => v.key !== key));

  const setStock = (key, value) =>
    setVariants((prev) =>
      prev.map((v) => (v.key === key ? { ...v, stock: value } : v)),
    );

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;

    const { data, error } = await supabase
      .from("categories")
      .insert({ name, slug: slugify(name) })
      .select("id, name, slug")
      .single();

    if (error) {
      console.error("Category error:", error.message);
      setError(
        error.code === "23505"
          ? "That category already exists."
          : "Could not add the category.",
      );
      return;
    }

    setError(null);
    setCategories((prev) =>
      [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setField("category_id", String(data.id));
    setNewCategory("");
    setAddingCategory(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const price = Number(form.price);

    if (!form.name.trim()) return setError("Product name is required.");
    if (!form.category_id) return setError("Choose a category.");
    if (form.price === "" || !Number.isFinite(price) || price < 0) {
      return setError("Enter a valid price.");
    }
    if (!imageUrl && !file) return setError("Add a product image.");
    if (
      variants.some(
        (v) =>
          v.stock === "" ||
          !Number.isInteger(Number(v.stock)) ||
          Number(v.stock) < 0,
      )
    ) {
      return setError("Stock must be a whole number, 0 or more.");
    }
    if (form.is_active && variants.length === 0) {
      return setError(
        "Add at least one size and color before showing this product.",
      );
    }

    setSaving(true);

    let uploadedPath = null;
    let finalUrl = imageUrl;

    if (file) {
      uploadedPath = `${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(uploadedPath, file, {
          contentType: file.type,
          cacheControl: "31536000",
        });

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        setError("Could not upload the image. Please try again.");
        setSaving(false);
        return;
      }

      finalUrl = supabase.storage.from(BUCKET).getPublicUrl(uploadedPath)
        .data.publicUrl;
    }

    const { error: saveError } = await supabase.rpc("admin_save_product", {
      p_id: isNew ? null : Number(id),
      p_name: form.name,
      p_description: form.description,
      p_price: price,
      p_category_id: Number(form.category_id),
      p_image_url: finalUrl,
      p_is_active: form.is_active,
      p_variants: variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        stock: Number(v.stock),
        old_stock: v.old_stock,
      })),
    });

    if (saveError) {
      console.error("Save error:", saveError.message);
      if (uploadedPath) {
        await supabase.storage.from(BUCKET).remove([uploadedPath]);
      }
      setError(saveError.message);
      setSaving(false);
      return;
    }

    if (file && imageUrl) {
      const oldPath = storagePathFromUrl(imageUrl);
      if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
    }

    navigate("/admin/products");
  };

  if (loading) return <p>Loading...</p>;

  if (notFound) {
    return (
      <>
        <Link to="/admin/products" className="back-link">
          ← Back to products
        </Link>
        <p>Product not found.</p>
      </>
    );
  }

  const shownImage = preview ?? imageUrl;

  return (
    <section aria-label={isNew ? "New product" : "Edit product"}>
      <Link to="/admin/products" className="back-link">
        ← Back to products
      </Link>
      <h1 className="shop-title">{isNew ? "New product" : "Edit product"}</h1>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="editor-grid">
          <div className="image-box">
            <div className="image-preview">
              {shownImage ? (
                <img src={shownImage} alt="Product preview" />
              ) : (
                <span>No image</span>
              )}
            </div>
            <label className="file-label">
              {shownImage ? "Change image" : "Upload image"}
              <input
                type="file"
                className="sr-only"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFile}
                disabled={saving}
              />
            </label>
            <span className="cart-item-variant">
              JPG, PNG or WebP · max 2 MB
            </span>
          </div>

          <div className="field-grid">
            <label className="field-label">
              Name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={saving}
                required
              />
            </label>

            <div className="field-label">
              <label htmlFor="category">Category</label>
              <div className="category-row">
                <select
                  id="category"
                  value={form.category_id}
                  onChange={(e) => setField("category_id", e.target.value)}
                  disabled={saving}
                  required
                >
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setAddingCategory((open) => !open)}
                >
                  {addingCategory ? "Cancel" : "+ New"}
                </button>
              </div>

              {addingCategory && (
                <div className="category-row">
                  <input
                    type="text"
                    placeholder="New category name"
                    aria-label="New category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={addCategory}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            <label className="field-label">
              Price (EGP)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                disabled={saving}
                required
              />
            </label>

            <label className="field-label">
              Description
              <textarea
                rows="4"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                disabled={saving}
              />
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setField("is_active", e.target.checked)}
                disabled={saving}
              />
              Visible in the shop
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Sizes &amp; stock</h2>

          {variants.length === 0 ? (
            <p className="cart-item-variant">
              No sizes yet. Add a color below, then its sizes.
            </p>
          ) : (
            <ul className="variant-list">
              {variants.map((v) => (
                <li key={v.key} className="variant-row">
                  <span className="variant-size">{v.size}</span>
                  <span>{v.color}</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={v.stock}
                    onChange={(e) => setStock(v.key, e.target.value)}
                    aria-label={`Stock for ${v.size} ${v.color}`}
                    disabled={saving}
                  />
                  {v.id === null ? (
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => removeVariant(v.key)}
                    >
                      Remove
                    </button>
                  ) : Number(v.stock) === 0 ? (
                    <span className="stock-out">Sold out</span>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="variant-add">
            <input
              type="text"
              placeholder="Color (e.g. Black)"
              aria-label="Color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addVariants([newSize]);
                }
              }}
            />
            <select
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              aria-label="Size"
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => addVariants([newSize])}
            >
              Add size
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => addVariants(QUICK_SIZES)}
            >
              Add S–XL
            </button>
          </div>

          {variantError && (
            <div role="alert" className="sign-form-error-message">
              {variantError}
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="sign-form-error-message">
            {error}
          </div>
        )}

        <div className="form-actions">
          <Link to="/admin/products" className="ghost-btn link-btn">
            Cancel
          </Link>
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? "Saving..." : "Save product"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ProductEditor;
