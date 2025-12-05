import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext"; // adjust path if needed

const PrivateRoute = ({ element, requiredRole }) => {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return element;
};

export default PrivateRoute;
