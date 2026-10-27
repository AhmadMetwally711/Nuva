import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

function StoreHeader() {
  const { session, profile, isAdmin, signOut } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const handleSignOut = async () => {
    const { success } = await signOut();
    if (success) navigate("/");
  };

  const displayName = profile?.name?.trim() || "";
  const firstName = displayName.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <header className="store-header">
      <Link to="/" className="store-logo">
        <svg
          width="28"
          height="28"
          viewBox="0 0 64 64"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="64" height="64" rx="14" fill="#17324D" />
          <path
            d="M20 46V18l24 28V18"
            fill="none"
            stroke="#B9E3FF"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Nuva
      </Link>

      <nav className="store-nav" aria-label="Main navigation">
        <div
          id="nav-menu"
          className={`nav-menu ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(false)}
        >
          {displayName && (
            <span className="menu-user">
              {displayName}
              {isAdmin && " · Admin"}
            </span>
          )}

          <Link to="/shop">Shop</Link>

          {!isAdmin && (
            <Link
              to="/cart"
              className={`cart-link ${totalItems > 0 ? "has-items" : ""}`}
              aria-label={
                totalItems > 0
                  ? `Cart, ${totalItems} ${totalItems === 1 ? "item" : "items"}`
                  : "Cart, empty"
              }
            >
              Cart
              {totalItems > 0 && (
                <span className="cart-count" aria-hidden="true">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>
          )}

          {session && !isAdmin && <Link to="/orders">My orders</Link>}
          {isAdmin && <Link to="/admin">Admin</Link>}

          {session === undefined ? null : session ? (
            <button className="nav-auth" onClick={handleSignOut}>
              Sign out
            </button>
          ) : (
            <Link to="/signin" className="nav-auth">
              Sign in
            </Link>
          )}
        </div>
        {!isAdmin && (
          <Link
            to="/cart"
            className="cart-mobile"
            aria-label={`Cart, ${totalItems} ${totalItems === 1 ? "item" : "items"}`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {totalItems > 0 && (
              <span className="cart-count" aria-hidden="true">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </Link>
        )}

        {displayName && (
          <span className="user-chip" title={displayName}>
            <span className="user-avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="user-name">{firstName}</span>
            {isAdmin && <span className="user-role">Admin</span>}
          </span>
        )}

        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>
    </header>
  );
}

export default StoreHeader;
