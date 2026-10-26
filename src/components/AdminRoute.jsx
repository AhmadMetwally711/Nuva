import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminRoute = ({ children }) => {
  const { session, profile, isAdmin } = useAuth();
  const location = useLocation();

  if (session === undefined || (session && profile === undefined)) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <Navigate to="/signin" state={{ from: location.pathname }} replace />
    );
  }

  if (!isAdmin) {
    return <Navigate to="/shop" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
