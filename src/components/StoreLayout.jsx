import { Outlet, ScrollRestoration } from "react-router-dom";
import StoreHeader from "./StoreHeader";
import StoreFooter from "./StoreFooter";

function StoreLayout() {
  return (
    <div className="store-shell">
      <StoreHeader />
      <main className="store-main">
        <Outlet />
      </main>
      <StoreFooter />
      <ScrollRestoration />
    </div>
  );
}

export default StoreLayout;
