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
import {
  addToCart,
  getCart,
  removeFromCart,
} from "../../components/AddToCartItems.jsx";
import "./ProductDetails.css";

const API_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://shoe-website-x78a.onrender.com/api"
).replace(/\/+$/, "");

const BASE_URL = API_URL.replace(/\/api\/?$/, "");

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
  const image =
    item?.image ||
    item?.imageUrl ||
    item?.img ||
    "/product-images/product 1.png";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("/product-images/")
  ) {
    return image;
  }

  return `${BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
}

// Get and format the product price
function getPrice(item) {
  const price = Number(item?.price ?? item?.sellingPrice ?? 0);
  return Number.isFinite(price) ? price : 0;
}

function formatPrice(item) {
  return `₱${getPrice(item).toLocaleString("en-PH")}`;
}

// Format category text for the badge
function getCategory(item) {
  return typeof item?.category === "string" ? item.category.trim() : "";
}

// Format product status
function getProductStatus(item) {
  return typeof item?.productStatus === "string"
    ? item.productStatus.trim()
    : "";
}

// Capitalize product tags for display
function formatLabel(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ProductDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Breadcrumb section names
  const categoryNames = {
    "/men": "Men",
    "/women": "Women",
    "/kids": "Kids",
    "/accessories": "Accessories",
  };

  const sectionPath = location.state?.from || "/";
  const sectionName = categoryNames[sectionPath] || "Shop";

  // Product and page states
  const [shoe, setShoe] = useState(null);
  const [allShoes, setAllShoes] = useState([]);
  const [selectedSize, setSelectedSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [favorites, setFavorites] = useState(readFavorites);

  // Track products currently saved in the cart
  const [cartItems, setCartItems] = useState(() =>
    getCart().map((item) => item._id),
  );

  // Available sizes from the selected shoe
  const availableSizes = Array.isArray(shoe?.sizes) ? shoe.sizes : [];

  // Actual color saved for this shoe
  const shoeColor =
    typeof shoe?.color === "string" && shoe.color.trim()
      ? shoe.color.trim()
      : "Not specified";

  // Keep the cart display updated when another component changes the cart
  useEffect(() => {
    const updateCartItems = () => {
      setCartItems(getCart().map((item) => item._id));
    };

    window.addEventListener("cartUpdated", updateCartItems);
    window.addEventListener("storage", updateCartItems);

    return () => {
      window.removeEventListener("cartUpdated", updateCartItems);
      window.removeEventListener("storage", updateCartItems);
    };
  }, []);

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
    if (!cartMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setCartMessage("");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [cartMessage]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  // Set the first available size when the product loads
  useEffect(() => {
    if (availableSizes.length > 0) {
      setSelectedSize(availableSizes[0]);
    } else {
      setSelectedSize(null);
    }
  }, [shoe]);

  function handleFavorite(item) {
    setFavorites(toggleFavorite(item));
  }

  // Add the main product to the same local cart used by the Men page
  function handleAddToCart(item) {
    if (selectedSize === null) {
      setCartMessage("Please select an available size first.");
      return;
    }

    const updatedCart = addToCart({
      ...item,
      size: selectedSize,
      color: shoeColor,
    });

    setCartItems(updatedCart.map((cartItem) => cartItem._id));
    setCartMessage(`${getName(item)} added to your cart.`);
  }

  // Add or remove a recommended product, following the Men page behavior
  function handleRecommendationCart(item) {
    const savedCart = getCart();
    const alreadyAdded = savedCart.some(
      (cartItem) => cartItem._id === item._id,
    );

    let updatedCart;

    if (alreadyAdded) {
      updatedCart = removeFromCart(item._id);
      setCartMessage(`${getName(item)} removed from your cart.`);
    } else {
      updatedCart = addToCart(item);
      setCartMessage(`${getName(item)} added to your cart.`);
    }

    setCartItems(updatedCart.map((cartItem) => cartItem._id));
  }

  // Fetch the selected product and other products
  useEffect(() => {
    let cancelled = false;

    async function fetchSingleShoe() {
      return axios.get(`${API_URL}/single/${id}`);
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
            {getProductStatus(shoe) && (
              <span className="product-badge">
                {formatLabel(getProductStatus(shoe))}
              </span>
            )}

            {getCategory(shoe) && (
              <span className="product-category-badge">
                {formatLabel(getCategory(shoe))}
              </span>
            )}
          </div>

          <img
            src={getImage(shoe)}
            alt={getName(shoe)}
            className="product-image"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/product-images/product 1.png";
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

          {/* Actual product color */}
          <div className="option-heading">
            <span>Color</span>

            <span className="selected-color-label">{shoeColor}</span>
          </div>

          {/* Size selection from the database */}
          <div className="size-heading">Available Sizes</div>

          <div className="size-options">
            {availableSizes.length > 0 ? (
              availableSizes.map((size) => (
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
              ))
            ) : (
              <p className="no-sizes-message">
                No available sizes for this shoe.
              </p>
            )}
          </div>

          {/* Product actions */}
          <div className="product-actions">
            <button
              type="button"
              className="add-to-cart-button"
              disabled={addingToCart || availableSizes.length === 0}
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
          {recommendations.map((item) => {
            const itemIsInCart = cartItems.includes(item._id);

            return (
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
                    {getProductStatus(item)
                      ? formatLabel(getProductStatus(item))
                      : "New"}
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
                      className={`quick-add-button ${
                        itemIsInCart ? "added" : ""
                      }`}
                      aria-label={`${
                        itemIsInCart ? "Remove" : "Add"
                      } ${getName(item)} ${itemIsInCart ? "from" : "to"} cart`}
                      aria-pressed={itemIsInCart}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRecommendationCart(item);
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
                      event.currentTarget.src = "/product-images/product 1.png";
                    }}
                  />
                </div>

                <div className="recommendation-meta">
                  <span>
                    {formatLabel(item.brand || item.gender || sectionName)}
                  </span>

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
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default ProductDetails;
