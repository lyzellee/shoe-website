import { useState, useEffect } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import {
  faHeart as faHeartSolid,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { isFavorite, readFavorites, toggleFavorite } from "../favorites.js";
import "./ProductDetails.css";

const API_URL = "http://localhost:5000/api";

// Get the product from different possible API response formats
function unwrapProduct(data) {
  return data?.shoe || data?.product || data?.data || data;
}

// Get the product list from the API response
function unwrapProducts(data) {
  const result = data?.shoes || data?.products || data?.data || data;
  return Array.isArray(result) ? result : [];
}

// Get the product name
function getName(item) {
  return item?.name || item?.shoeName || item?.title || "Unnamed Shoe";
}

// Get the product image
function getImage(item) {
  return (
    item?.image ||
    item?.imageUrl ||
    item?.img ||
    "/product-images/product 1.png"
  );
}

// Get and format the product price
function getPrice(item) {
  const price = Number(item?.price ?? item?.sellingPrice ?? 0);
  return Number.isFinite(price) ? price : 0;
}

function formatPrice(item) {
  return `₱${getPrice(item).toLocaleString("en-PH")}`;
}

// Format category text for the badge.
function getCategory(item) {
  return typeof item?.category === "string" ? item.category.trim() : "";
}

function ProductDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Breadcrumb section names.
  const categoryNames = {
    "/men": "Men",
    "/women": "Women",
    "/kids": "Kids",
    "/accessories": "Accessories",
  };

  const sectionPath = location.state?.from || "/";
  const sectionName = categoryNames[sectionPath] || "Shop";

  // Product and page states.
  const [shoe, setShoe] = useState(null);
  const [allShoes, setAllShoes] = useState([]);
  const [selectedSize, setSelectedSize] = useState(7);
  const [selectedColor, setSelectedColor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [favorites, setFavorites] = useState(readFavorites);
  const colorOptions = ["Olive", "Dark Olive"];

  useEffect(() => {
    const updateFavorites = () => setFavorites(readFavorites());

    window.addEventListener("favoritesUpdated", updateFavorites);
    window.addEventListener("storage", updateFavorites);

    return () => {
      window.removeEventListener("favoritesUpdated", updateFavorites);
      window.removeEventListener("storage", updateFavorites);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  function handleFavorite(item) {
    setFavorites(toggleFavorite(item));
  }

  async function handleAddToCart(item) {
    setAddingToCart(true);
    setCartMessage("");

    try {
      await axios.post(`${API_URL}/orders`, {
        orderReference: `ORD-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        items: [
          {
            shoeId: item._id,
            quantity: 1,
            size: selectedSize,
            color: colorOptions[selectedColor],
          },
        ],
      });
      setCartMessage(`${getName(item)} added to your cart.`);
    } catch (err) {
      console.error("Unable to add shoe to cart:", err);
      setCartMessage(
        err.response?.data?.message ||
          "Unable to add this shoe to your cart. Please try again.",
      );
    } finally {
      setAddingToCart(false);
    }
  }

  // Fetch the selected product and other products.
  useEffect(() => {
    let cancelled = false;

    async function fetchSingleShoe() {
      return axios.get(`http://localhost:5000/api/single/${id}`);
    }

    async function fetchShoes() {
      setLoading(true);
      setError("");

      try {
        const [singleResponse, allResponse] = await Promise.all([
          fetchSingleShoe(),
          axios.get(`${API_URL}/all`),
        ]);

        if (cancelled) return;

        const product = unwrapProduct(singleResponse.data);

        setShoe(
          product && typeof product === "object" && product._id
            ? product
            : null,
        );

        setAllShoes(unwrapProducts(allResponse.data));
      } catch (error) {
        console.error("Error fetching shoe:", error);

        if (!cancelled) {
          setError("Unable to load this product. Please check your backend.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchShoes();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Exclude the current product from recommendations
  const recommendations = allShoes
    .filter((item) => String(item._id) !== String(shoe?._id))
    .slice(0, 4);

  // Open another product
  function viewShoe(shoeId) {
    navigate(`/product/${shoeId}`, {
      state: { from: sectionPath },
    });
  }

  if (loading) {
    return (
      <main className="product-page-container">
        <p className="product-message">Loading shoe details...</p>
      </main>
    );
  }

  if (error || !shoe) {
    return (
      <main className="product-page-container">
        <p className="product-message">
          {error || "Shoe not found. Please check the product ID."}
        </p>
      </main>
    );
  }

  return (
    <main className="product-page-container">
      {/* Breadcrumb */}
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>

        <span>/</span>

        <Link to={sectionPath}>{sectionName}</Link>

        <span>/</span>

        <span className="breadcrumb-current">{getName(shoe)}</span>
      </nav>

      {/* Main product section */}
      <section className="product-details">
        {/* Main product image */}
        <div className="product-image-container">
          <div className="product-badges">
            <span className="product-badge">NEW</span>

            {getCategory(shoe) && (
              <span className="product-category-badge">
                {getCategory(shoe)}
              </span>
            )}
          </div>

          <img
            src={getImage(shoe)}
            alt={getName(shoe)}
            className="product-image"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/placeholder-shoe.png";
            }}
          />
        </div>

        {/* Product information */}
        <div className="product-info">
          <h1 className="product-title">{getName(shoe)}</h1>

          <p className="product-price">{formatPrice(shoe)}</p>

          <p className="product-description">
            {typeof shoe.description === "string" && shoe.description.trim()
              ? shoe.description.trim()
              : "No description available for this shoe."}
          </p>

          <div className="product-divider" />

          {/* Color selection */}
          <div className="option-heading">
            <span>Color</span>

            <span className="selected-color-label">
              {colorOptions[selectedColor]}
            </span>
          </div>

          <div className="color-options">
            <button
              type="button"
              aria-label="Olive"
              aria-pressed={selectedColor === 0}
              className={`color-swatch olive-swatch ${
                selectedColor === 0 ? "selected" : ""
              }`}
              onClick={() => setSelectedColor(0)}
            >
              <span className="color-swatch-fill" />
            </button>

            <button
              type="button"
              aria-label="Dark Olive"
              aria-pressed={selectedColor === 1}
              className={`color-swatch dark-olive-swatch ${
                selectedColor === 1 ? "selected" : ""
              }`}
              onClick={() => setSelectedColor(1)}
            >
              <span className="color-swatch-fill" />
            </button>
          </div>

          {/* Size selection */}
          <div className="size-heading">Size</div>

          <div className="size-options">
            {[7, 8, 9, 10].map((size) => (
              <button
                type="button"
                key={size}
                aria-pressed={selectedSize === size}
                className={`size-button ${
                  selectedSize === size ? "active" : ""
                }`}
                onClick={() => setSelectedSize(size)}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Product actions */}
          <div className="product-actions">
            <button
              type="button"
              className="add-to-cart-button"
              disabled={addingToCart}
              onClick={() => handleAddToCart(shoe)}
            >
              {addingToCart ? "Adding..." : "Add to Cart"}
            </button>

            <button
              type="button"
              className={`wishlist-button ${
                isFavorite(favorites, shoe) ? "favorite" : ""
              }`}
              aria-pressed={isFavorite(favorites, shoe)}
              onClick={() => handleFavorite(shoe)}
            >
              <span aria-hidden="true">
                {isFavorite(favorites, shoe) ? "♥" : "♡"}
              </span>
              {isFavorite(favorites, shoe) ? "Saved" : "Save"}
            </button>
          </div>

          {cartMessage && (
            <p className="cart-action-message" role="status">
              {cartMessage}
            </p>
          )}

          <div className="product-divider bottom-divider" />
        </div>
      </section>

      {/* Recommended products */}
      <section className="recommendations-section">
        <h2 className="recommendations-title">YOU MAY ALSO LIKE</h2>

        <div className="recommendations-grid">
          {recommendations.map((item, index) => (
            <article className="recommendation-card" key={item._id}>
              <div
                className="recommendation-image-container"
                role="link"
                tabIndex={0}
                onClick={() => viewShoe(item._id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    viewShoe(item._id);
                  }
                }}
              >
                <span className="recommendation-badge">
                  {index % 2 === 0 ? "NEW" : "POPULAR"}
                </span>

                <div className="recommendation-icons">
                  <button
                    type="button"
                    aria-label={`${
                      isFavorite(favorites, item) ? "Remove" : "Add"
                    } ${getName(item)} ${
                      isFavorite(favorites, item) ? "from" : "to"
                    } favorites`}
                    aria-pressed={isFavorite(favorites, item)}
                    className={isFavorite(favorites, item) ? "favorite" : ""}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleFavorite(item);
                    }}
                  >
                    <FontAwesomeIcon
                      icon={
                        isFavorite(favorites, item)
                          ? faHeartSolid
                          : faHeartRegular
                      }
                    />
                  </button>

                  <button
                    type="button"
                    className="quick-add-button"
                    aria-label={`Add ${getName(item)} to cart`}
                    disabled={addingToCart}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAddToCart(item);
                    }}
                  >
                    <FontAwesomeIcon icon={faPlus} size="sm" />
                  </button>
                </div>

                <img
                  src={getImage(item)}
                  alt={getName(item)}
                  className="recommendation-image"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = "/placeholder-shoe.png";
                  }}
                />
              </div>

              <div className="recommendation-meta">
                <span>{item.gender || sectionName}</span>

                <span>{formatPrice(item)}</span>
              </div>

              <button
                type="button"
                className="recommendation-name"
                onClick={() => viewShoe(item._id)}
              >
                {getName(item)}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ProductDetails;
