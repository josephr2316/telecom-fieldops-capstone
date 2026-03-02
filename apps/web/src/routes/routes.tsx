import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App";
import LoginPage from "../pages/Login";
import HomePage from "../pages/Home";
import AdminDashboardPage from "../pages/AdminDashboard";
import { CatalogPage } from "../pages/CatalogPage";
import InventoryPage from "../pages/InventoryPage";
import InventoryReservationPage from "../pages/InventoryReservationPage";
import MyOrdersPage from "../pages/MyOrdersPage";
import { PlansPage } from "../pages/PlansPage";
import WorkOrdersPage from "../pages/WorkOrdersPage";
import RequireAuth from "./RequireAuth";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
      {
        path: "home",
        element: (
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        ),
      },
      {
        path: "dashboard",
        element: (
          <RequireAuth>
            <AdminDashboardPage />
          </RequireAuth>
        ),
      },
      {
        path: "plans",
        element: (
          <RequireAuth>
            <PlansPage />
          </RequireAuth>
        ),
      },
      {
        path: "catalog",
        element: (
          <RequireAuth>
            <CatalogPage />
          </RequireAuth>
        ),
      },
      {
        path: "reserve",
        element: (
          <RequireAuth>
            <InventoryReservationPage />
          </RequireAuth>
        ),
      },
      {
        path: "inventory",
        element: (
          <RequireAuth>
            <InventoryPage />
          </RequireAuth>
        ),
      },
      {
        path: "work-orders",
        element: (
          <RequireAuth>
            <WorkOrdersPage />
          </RequireAuth>
        ),
      },
      {
        path: "my-orders",
        element: (
          <RequireAuth>
            <MyOrdersPage />
          </RequireAuth>
        ),
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
