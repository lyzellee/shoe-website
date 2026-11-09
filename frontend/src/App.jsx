import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";

// Admin pages
import AddShoes from "./admin/pages/category/addShoes.jsx";
import StockShoe from "./admin/pages/category/stockShoes.jsx";
import Orders from "./admin/pages/category/orders.jsx";
import ProtectedRoute from "./admin/components/ProtectedRoute.jsx";
import AdminLogin from "./admin/pages/category/AdminLoginTemp.jsx";
import RepresentativeDashboard from "./admin/pages/category/RepresentativeDashboard.jsx";
import Dashboard from "./admin/pages/category/Dashboard.jsx";

// Admin layout
import AdminLayout from "./admin/components/AdminLayout.jsx";

// Client pages
import Cart from "./client/pages/Cart.jsx";
import Checkout from "./client/pages/Checkout.jsx";
import Home from "./client/pages/Home.jsx";
import Men from "./client/pages/Men.jsx";
import ProductDetails from "./client/pages/ProductDetails.jsx";
import Wishlist from "./client/pages/Wishlist.jsx";
import Women from "./client/pages/Women.jsx";
import Feedback from "./client/pages/Feedback.jsx";
import YourOrder from "./client/pages/YourOrder.jsx";
import OrderDetails from "./client/pages/OrderDetails.jsx";
import TrackOrder from "./client/pages/TrackOrder.jsx";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function AppContent() {
  const location = useLocation();

  // Admin and representative pages must not use the client navbar or footer.
  const isAdminPage =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/representative");

  return (
    <>
      {!isAdminPage && <Navbar />}

      <Routes>
        {/* Client Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/men" element={<Men />} />
        <Route path="/women" element={<Women />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/your-order" element={<YourOrder />} />
        <Route path="/orders/:reference/track" element={<TrackOrder />} />
        <Route path="/orders/:reference" element={<OrderDetails />} />

        {/* Admin Pages with Shared Sidebar */}
        <Route element={<AdminLayout />}>
          <Route
            path="/admin/add"
            element={
              <ProtectedRoute allowedRole="admin">
                <AddShoes />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/stock"
            element={
              <ProtectedRoute allowedRole="admin">
                <StockShoe />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRole="admin">
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRole="admin">
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/representative/dashboard"
          element={
            <ProtectedRoute allowedRole="representative">
              <RepresentativeDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
      {!isAdminPage && <Footer />}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
