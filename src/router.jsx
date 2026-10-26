import Signin from "./components/Signin";
import Signup from "./components/Signup";
import AdminLayout from "./components/AdminLayout";

import StoreLayout from "./components/StoreLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import Shop from "./routes/Shop";
import ProductPage from "./routes/ProductPage";
import Cart from "./routes/Cart";
import Checkout from "./routes/Checkout";
import OrderSuccess from "./routes/OrderSuccess";
import Orders from "./routes/Orders";

import Home from "./routes/Home";
import NotFound from "./routes/NotFound";
import RouteError from "./routes/RouteError";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy } from "react";

const Dashboard = lazy(() => import("./routes/Dashboard"));
const AdminOrders = lazy(() => import("./routes/AdminOrders"));
const AdminReturns = lazy(() => import("./routes/AdminReturns"));
const AdminProducts = lazy(() => import("./routes/AdminProducts"));
const ProductEditor = lazy(() => import("./routes/ProductEditor"));

export const router = createBrowserRouter([
  { path: "/signin", element: <Signin /> },
  { path: "/signup", element: <Signup /> },
  {
    element: <StoreLayout />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/shop", element: <Shop /> },
      { path: "/product/:id", element: <ProductPage /> },
      { path: "/cart", element: <Cart /> },
      {
        path: "/checkout",
        element: (
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        ),
      },
      {
        path: "/order-success/:id",
        element: (
          <ProtectedRoute>
            <OrderSuccess />
          </ProtectedRoute>
        ),
      },
      {
        path: "/orders",
        element: (
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        ),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/admin",
    errorElement: <RouteError />,
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "orders", element: <AdminOrders /> },
      { path: "returns", element: <AdminReturns /> },
      { path: "products", element: <AdminProducts /> },
      { path: "products/new", element: <ProductEditor /> },
      { path: "products/:id", element: <ProductEditor /> },
    ],
  },
  { path: "/dashboard", element: <Navigate to="/admin" replace /> },
]);
