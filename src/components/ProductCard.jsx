import { Link } from "react-router-dom";

function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.id}`} className="product-card-link">
      <article className="product-card">
        <div className="product-image-wrapper">
          <img src={product.image_url} alt={product.name} loading="lazy" />
        </div>
        <div className="product-info">
          <span className="product-category">{product.categories?.name}</span>
          <h3>{product.name}</h3>
          <p className="product-price">
            {Number(product.price).toLocaleString()} EGP
          </p>
        </div>
      </article>
    </Link>
  );
}

export default ProductCard;
