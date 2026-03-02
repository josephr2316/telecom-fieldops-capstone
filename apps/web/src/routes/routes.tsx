import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import LoginPage from "../pages/Login";
import HomePage from "../pages/Home";
import InventoryReservationPage from "../pages/InventoryReservationPage";
import InventoryPage from "../pages/InventoryPage";
import { PlansPage } from "../pages/PlansPage";
import { CatalogPage } from "../pages/CatalogPage";
import WorkOrdersPage from "../pages/WorkOrdersPage";
import MyOrdersPage from "../pages/MyOrdersPage";
import AdminDashboardPage from "../pages/AdminDashboard";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true,
                element: <LoginPage />
            },
            {
                path: "home",
                element: <HomePage />
            },
            {
                path: "plans",
                element: <PlansPage />
            },
            {
                path: "catalog",
                element: <CatalogPage />
            },
            {
                path: "reserve",
                element: <InventoryReservationPage />
            },
            {
                path: "inventory",
                element: <InventoryPage />
            },
            {
                path: "work-orders",
                element: <WorkOrdersPage />
            },
            {
                path: "my-orders",
                element: <MyOrdersPage />
            },
            {
                path: "dashboard",
                element: <AdminDashboardPage />
            }
        ]
    }
])
