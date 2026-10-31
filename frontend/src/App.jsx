import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

//import CheckoutShoes from "./pages/checkoutShoes.jsx";
//import DashboardShoes from "./pages/dashboardShoes.jsx";
//import Sample from "./pages/sample.jsx";
//import MenShoes from "./pages/category/menShoes.jsx";
import AddShoes from "./admin/pages/category/addShoes.jsx";
import StockShoe from "./admin/pages/category/stockShoes.jsx";

import Cart from "./client/pages/Cart.jsx";
import Checkout from "./client/pages/Checkout.jsx";
import Home from "./client/pages/Home.jsx";
import Men from "./client/pages/Men.jsx";
import ProductDetails from "./client/pages/ProductDetails.jsx";
import Wishlist from "./client/pages/Wishlist.jsx";
import Women from "./client/pages/Women.jsx";
import Navbar from "./components/Navbar";
import Orders from "./admin/pages/category/orders.jsx";

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/men" element={<Men />} />
        <Route path="/women" element={<Women />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        {/* admin */}
        <Route path="/admin/add" element={<AddShoes />} />
        <Route path="/admin/stock" element={<StockShoe />} />
        <Route path="admin/orders" element={<Orders />} />
      </Routes>
    </Router>
  );
}

export default App;
