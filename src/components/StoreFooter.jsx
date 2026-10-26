import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CONTACT } from "../config";
import ReturnPolicyNote from "./ReturnPolicyNote";

const SHOP_LINKS = [
  { label: "Winter 26", to: "/shop?category=Winter 26" },
  { label: "Hoodies", to: "/shop?category=Hoodies" },
  { label: "Sweatshirts", to: "/shop?category=Sweatshirts" },
  { label: "Knitwear", to: "/shop?category=Knitwear" },
  { label: "Fleece Sweatpants", to: "/shop?category=Fleece Sweatpants" },
  { label: "Jeans", to: "/shop?category=Jeans" },
  { label: "Summer Sale", to: "/shop?category=Summer Sale" },
  { label: "Shop All", to: "/shop" },
  { label: "Winter Sale", to: "/shop?category=Winter Sale" },
];

const HELP_LINKS = [
  { label: "Help center", to: "/help" },
  { label: "Contact us", to: "/contact" },
  { label: "Returns & exchanges", to: "/returns" },
  { label: "Return portal", to: "/return-portal" },
  { label: "Privacy policy", to: "/privacy" },
  { label: "Shipping", to: "/shipping" },
];

function StoreFooter() {
  const { session, isAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    // TODO: send `email` to your backend / mailing service
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="store-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="store-logo">
            Nuva
          </Link>
          <p className="footer-tagline">Clothing for every day.</p>
        </div>

        <div className="footer-columns">
          <nav className="footer-column" aria-label="Shop">
            <h2 className="footer-heading">Shop</h2>
            <ul className="footer-list">
              {SHOP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
              {!isAdmin && (
                <li>
                  <Link to="/cart">Cart</Link>
                </li>
              )}
              {session && !isAdmin && (
                <li>
                  <Link to="/orders">My orders</Link>
                </li>
              )}
            </ul>
          </nav>

          <nav className="footer-column" aria-label="Help">
            <h2 className="footer-heading">Help</h2>
            <ul className="footer-list">
              {HELP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <address className="footer-column footer-contact">
            <h2 className="footer-heading">Customer service</h2>
            <ul className="footer-list">
              <li>
                <a href={`tel:${CONTACT.phoneDisplay.replace(/\s/g, "")}`}>
                  {CONTACT.phoneDisplay}
                </a>
              </li>
              {CONTACT.email && (
                <li>
                  <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                </li>
              )}
              {CONTACT.hours && (
                <li className="footer-hours">{CONTACT.hours}</li>
              )}
            </ul>

            <div className="footer-social">
              <a
                href={CONTACT.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </a>
              {CONTACT.instagramUrl && (
                <a
                  href={CONTACT.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
                  </svg>
                </a>
              )}
              {CONTACT.facebookUrl && (
                <a
                  href={CONTACT.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 8h2.5V4.5H14C11.8 4.5 10.5 5.9 10.5 8v2H8v3.5h2.5V20H14v-6.5h2.5L17 10h-3V8.6c0-.4.2-.6.6-.6z" />
                  </svg>
                </a>
              )}
            </div>
          </address>
        </div>

        <div className="footer-newsletter">
          <div>
            <h2 className="footer-heading">Join the Nuva list</h2>
            <p className="footer-newsletter-text">
              New drops and restocks, straight to your inbox.
            </p>
          </div>

          {subscribed ? (
            <p className="newsletter-done">You’re on the list. Thank you.</p>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <label htmlFor="footer-email" className="newsletter-label">
                Email
              </label>
              <div className="newsletter-row">
                <input
                  id="footer-email"
                  type="email"
                  required
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit">Sign up</button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="footer-bottom">
        <ReturnPolicyNote />
        <small>© {new Date().getFullYear()} Nuva</small>
      </div>
    </footer>
  );
}

export default StoreFooter;
