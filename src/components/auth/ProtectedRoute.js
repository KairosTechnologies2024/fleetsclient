import { Navigate, Outlet } from "react-router-dom";
import { FLEET, MANAGER, LOGIN } from "lib/routes";

const ProtectedRoute = ({ role }) => {
  const userRole = localStorage.getItem("userRole");

  if (!userRole) {
    return <Navigate to={LOGIN} />;
  }

  // Allow If role is admin
  if (role === "manager" && userRole !== "fleetCustomer") {
    return <Navigate to={FLEET} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
