import { useEffect } from "react";
import { useRouteError } from "react-router-dom";

function RouteError() {
  const error = useRouteError();

  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <section className="not-found">
      <span className="not-found-code">Oops</span>
      <h1 className="shop-title">Something went wrong</h1>
      <p>An unexpected error happened. Try reloading the page.</p>
      <div className="not-found-actions">
        <button
          className="primary-btn"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
        <a href="/" className="ghost-btn link-btn">
          Go home
        </a>
      </div>
    </section>
  );
}

export default RouteError;
