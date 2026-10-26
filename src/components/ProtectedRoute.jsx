import { useAuth } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { session } = useAuth();
  const location = useLocation();

  if (session === undefined) {
    return <div>Loading...</div>;
  }

  return session ? (
    <>{children}</>
  ) : (
    <Navigate to="/signin" state={{ from: location.pathname }} replace />
  );
};

export default ProtectedRoute;
