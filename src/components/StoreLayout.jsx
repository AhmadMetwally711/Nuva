import { Outlet } from "react-router-dom";
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
    </div>
  );
}

export default StoreLayout;
