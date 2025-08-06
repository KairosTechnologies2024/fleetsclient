import { createBrowserRouter } from "react-router-dom";

import ProtectedRoute from "components/auth/ProtectedRoute";
import Login from "components/auth/Login";
import Layout from "components/layout";
import Dashboard from "components/dashboard";
import Fleet from "components/fleet";
import Vehicle from "components/vehicle";
import Vehicles from "components/vehicles";
import TripReport from "components/vehicles/tripReport";
import Manager from "components/manager";
import DeviceHealth from "components/deviceHealth";
import VehicleDetailComponent from "components/vehicles/VehicleDetails";
// import InviteRegister from "components/auth/inviteRegester";
// import Register from "components/auth/Register";

export const ROOT = "/";
export const LOGIN = "/login";
// export const REGISTER = "/register";
// export const INVITEE = "/inviteRegister";

export const PROTECTED = "/protected";
export const DASHBOARD = "/protected/dashboard";
export const FLEET = "/protected/fleet";
export const VEHICLE = "/protected/fleet/:id";
export const VEHICLES = "/protected/vehicles";
export const VEHICLE_DETAILS="/protected/vehicles/vehicle-details/:id"
export const TRIPREPORT = "/protected/vehicles/tripReport/:id"
export const MANAGER = "/protected/manager";
export const DEVICE_HEALTH  = "/protected/deviceHealth";

export const routes = createBrowserRouter([
  { path: ROOT, element: <Login /> },
  { path: LOGIN, element: <Login /> },
  {
    path: PROTECTED,
    element: <Layout />,
    children: [
      { path: DASHBOARD, element: <Dashboard /> },
      { path: FLEET, element: <Fleet /> },
      { path: VEHICLE, element: <Vehicle /> },
      { path: VEHICLES, element: <Vehicles /> ,
      },
        {path: VEHICLE_DETAILS, element: <VehicleDetailComponent/> },
      { path: DEVICE_HEALTH , element: <DeviceHealth /> },
      { path: TRIPREPORT , element: <TripReport /> },
      // Check Role
      {
        path: MANAGER,
        element: <ProtectedRoute role="manager" />, 
        children: [
          { path: "", element: <Manager /> },
        ],
      },
    ],
  },
]);
