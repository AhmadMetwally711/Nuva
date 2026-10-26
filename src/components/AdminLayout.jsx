import { NavLink, Outlet } from "react-router-dom";
import StoreHeader from "./StoreHeader";

function AdminLayout() {
  return (
    <>
      <StoreHeader />
      <main className="store-main">
        <nav className="admin-tabs" aria-label="Admin navigation">
          <NavLink to="/admin" end>
            Overview
          </NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
          <NavLink to="/admin/returns">Returns</NavLink>
          <NavLink to="/admin/products">Products</NavLink>
        </nav>
        <Outlet />
      </main>
    </>
  );
}

export default AdminLayout;
