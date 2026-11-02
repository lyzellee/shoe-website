import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import {
  faHeart as faHeartSolid,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getFavoriteId, readFavorites, toggleFavorite } from "../favorites.js";
import {
  addToCart,
  getCart,
  removeFromCart,
} from "../../components/AddToCartItems.jsx";
import ProductFilter from "../../components/ProductFilter/ProductFilter";
import "./Men.css";

// Featured images for the carousel
const featuredImages = [
  "/featured-images/featured 1.jpg",
  "/featured-images/featured 2.jpg",
  "/featured-images/featured 3.jpg",
  "/featured-images/featured 4.jpg",
];

// Get the correct product image URL
const getShoeImage = (image) => {
  if (!image) {
    return "/product-images/product 1.png";
  }

  // Keep full URLs unchanged
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  // Uploaded images are served by the backend
  return `http://localhost:5000${image.startsWith("/") ? "" : "/"}${image}`;
};

// Convert text to title case.
// Example: "running" becomes "Running".
const formatLabel = (value) => {
  if (typeof value !== "string" || !value.trim()) return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export default function CategoryMen() {
  // PRODUCT STATES
  const [shoes, setShoes] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Categories displayed in the reusable filter
  const menCategories = ["running", "casual", "sports", "lifestyle"];

  // CAROUSEL STATE
  const [featuredIndex, setFeaturedIndex] = useState(0);

  // FAVORITES STATES
  const [favorites, setFavorites] = useState(() =>
    readFavorites().map(getFavoriteId).filter(Boolean),
  );

  const [favoriteMessage, setFavoriteMessage] = useState("");

  // ADD TO CART STATES
  const [addCard, setAddCard] = useState(() =>
    getCart().map((item) => item._id),
  );

  const [addCardMessage, setAddCardMessage] = useState("");

  const navigate = useNavigate();

  // UPDATE FAVORITES WHEN CHANGES OCCUR
  useEffect(() => {
    const updateFavorites = () => {
      setFavorites(readFavorites().map(getFavoriteId).filter(Boolean));
    };

    window.addEventListener("favoritesUpdated", updateFavorites);
    window.addEventListener("storage", updateFavorites);

    return () => {
      window.removeEventListener("favoritesUpdated", updateFavorites);
      window.removeEventListener("storage", updateFavorites);
    };
  }, []);

  // AUTOMATIC CAROUSEL
  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedIndex((index) => {
        if (index === featuredImages.length - 1) {
          return 0;
        }

        return index + 1;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // FETCH SHOES WHEN PAGE LOADS
  useEffect(() => {
    const fetchShoes = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/all");
        setShoes(response.data);
      } catch (error) {
        console.error("Error fetching shoes:", error);
      }
    };

    fetchShoes();
  }, []);

  // HEART BUTTON FUNCTIONALITY
  const handleFavorite = (shoe) => {
    const wasFavorite = favorites.includes(getFavoriteId(shoe));
    const updatedFavorites = toggleFavorite(shoe);

    setFavorites(updatedFavorites.map(getFavoriteId).filter(Boolean));

    setFavoriteMessage(
      wasFavorite ? "Removed from favorites" : "Added to favorites",
    );

    setTimeout(() => {
      setFavoriteMessage("");
    }, 2000);
  };

  // ADD TO CART BUTTON FUNCTIONALITY
  const handleAddToCard = (shoe) => {
    // Get the existing cart
    const savedCart = getCart();

    // Check if the shoe is already in the cart
    const existingShoe = savedCart.some((item) => item._id === shoe._id);

    if (existingShoe) {
      // Remove the shoe if it is already in the cart
      const updatedCart = removeFromCart(shoe._id);

      setAddCard(updatedCart.map((item) => item._id));
      setAddCardMessage("Removed from cart");
    } else {
      // Add the shoe if it is not yet in the cart
      const updatedCart = addToCart(shoe);

      setAddCard(updatedCart.map((item) => item._id));
      setAddCardMessage("Added to cart");
    }

    // Remove notification after 2 seconds
    setTimeout(() => {
      setAddCardMessage("");
    }, 2000);
  };

  // FETCH ALL SHOES
  const handleListAll = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/all");
      setShoes(response.data);
    } catch (error) {
      console.error("Error fetching shoes:", error);
    }
  };

  // NAVIGATE TO PRODUCT DETAILS
  const handleViewShoe = (id) => {
    navigate(`/product/${id}`, {
      state: {
        from: "/men",
      },
    });
  };

  // FILTER PRODUCTS
  const filteredShoes = [...shoes]
    .filter((shoe) => {
      // Only display men's shoes
      if (shoe.gender?.toLowerCase() !== "men") {
        return false;
      }

      // Filter by product status
      if (
        activeCategory !== "all" &&
        shoe.productStatus?.toLowerCase() !== activeCategory
      ) {
        return false;
      }

      // Filter by selected category
      if (
        selectedCategory !== "all" &&
        shoe.category?.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Show newest products first when New is selected
      if (activeCategory === "new") {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();

        return dateB - dateA;
      }

      return 0;
    });

  return (
    <div>
      {/* NOTIFICATIONS */}
      {favoriteMessage && (
        <div className="favorite-notification">{favoriteMessage}</div>
      )}

      {addCardMessage && (
        <div className="add-card-notification">{addCardMessage}</div>
      )}

      {/* PAGE TITLE */}
      <h1 className="title-page">MEN SECTION</h1>

      <h2 className="title-description">
        Find your everyday pair. Built to move, styled to last.
      </h2>

      {/* REUSABLE PRODUCT FILTER */}
      <ProductFilter
        activeFilter={activeCategory}
        setActiveFilter={(filter) => {
          setActiveCategory(filter);
        }}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={menCategories}
      />

      {/* FEATURED CAROUSEL */}
      <section className="featured-section">
        <h2 className="featured-title">Featured</h2>

        <div className="featured-carousel">
          <div
            className="featured-track"
            style={{
              transform: `translateX(-${featuredIndex * 25}%)`,
            }}
          >
            {[...featuredImages, ...featuredImages].map((image, index) => (
              <div className="featured-card" key={index}>
                <img src={image} alt={`Featured ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>

        {/* CAROUSEL DOTS */}
        <div className="featured-dots">
          {featuredImages.map((_, index) => (
            <button
              key={index}
              className={featuredIndex === index ? "active" : ""}
              onClick={() => setFeaturedIndex(index)}
            />
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <div className="product-card-container">
        {filteredShoes.map((shoe) => (
          <div
            className="product-card"
            key={shoe._id}
            onClick={() => handleViewShoe(shoe._id)}
          >
            {/* IMAGE SECTION */}
            <div className="product-image-container">
              {/* PRODUCT TAGS */}
              <div className="product-tags">
                {shoe.productStatus && (
                  <span className="product-tag">
                    {formatLabel(shoe.productStatus)}
                  </span>
                )}

                {shoe.category && (
                  <span className="product-tag">
                    {formatLabel(shoe.category)}
                  </span>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="product-actions">
                {/* FAVORITES BUTTON */}
                <button
                  className={`wishlist-button ${
                    favorites.includes(getFavoriteId(shoe)) ? "favorite" : ""
                  }`}
                  type="button"
                  aria-label={`${
                    favorites.includes(getFavoriteId(shoe)) ? "Remove" : "Add"
                  } ${shoe.name} ${
                    favorites.includes(getFavoriteId(shoe)) ? "from" : "to"
                  } favorites`}
                  aria-pressed={favorites.includes(getFavoriteId(shoe))}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleFavorite(shoe);
                  }}
                >
                  <FontAwesomeIcon
                    icon={
                      favorites.includes(getFavoriteId(shoe))
                        ? faHeartSolid
                        : faHeartRegular
                    }
                  />
                </button>

                {/* ADD TO CART BUTTON */}
                <button
                  className={`add-cart-button ${
                    addCard.includes(shoe._id) ? "added" : ""
                  }`}
                  type="button"
                  aria-label={`${
                    addCard.includes(shoe._id) ? "Remove" : "Add"
                  } ${shoe.name} ${addCard.includes(shoe._id) ? "from" : "to"} cart`}
                  aria-pressed={addCard.includes(shoe._id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAddToCard(shoe);
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} size="sm" />
                </button>
              </div>

              {/* SHOE IMAGE */}
              <img
                className="product-image"
                src={getShoeImage(shoe.image)}
                alt={shoe.name}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/product-images/product 1.png";
                }}
              />
            </div>

            {/* PRODUCT INFORMATION */}
            <div className="product-info">
              <p className="product-gender">{shoe.brand}</p>

              <div className="product-bottom">
                <p className="product-name">{shoe.name}</p>

                <p className="product-price">
                  ₱{Number(shoe.price).toLocaleString("en-PH")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
