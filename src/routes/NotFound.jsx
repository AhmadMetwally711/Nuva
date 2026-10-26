import { Link } from "react-router-dom";

function NotFound() {
  return (
    <section className="not-found">
      <span className="not-found-code">404</span>
      <h1 className="shop-title">Page not found</h1>
      <p>The page you're looking for doesn't exist or was moved.</p>
      <div className="not-found-actions">
        <Link to="/" className="primary-btn link-btn">
          Go home
        </Link>
        <Link to="/shop" className="ghost-btn link-btn">
          Browse the shop
        </Link>
      </div>
    </section>
  );
}

export default NotFound;
