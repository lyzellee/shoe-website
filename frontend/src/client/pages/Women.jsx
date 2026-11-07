import { useEffect, useState } from "react";
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
import "./Women.css";
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "https://shoe-website-x78a.onrender.com/api"
).replace(/\/api\/?$/, "");
const featuredImages = [
  "/featured-images/women-featured-1.png",
  "/featured-images/women-featured-2.png",
  "/featured-images/women-featured-3.png",
  "/featured-images/women-featured-4.png",
];

const getShoeImage = (image) => {
  if (!image) return "/product-images/product 1.png";
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
};

const formatLabel = (value) => {
  if (typeof value !== "string" || !value.trim()) return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export default function Women() {
  const [shoes, setShoes] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [favorites, setFavorites] = useState(() =>
    readFavorites().map(getFavoriteId).filter(Boolean),
  );
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [addCard, setAddCard] = useState(() =>
    getCart().map((item) => item._id),
  );
  const [addCardMessage, setAddCardMessage] = useState("");
  const navigate = useNavigate();
  const womenCategories = ["running", "casual", "sports", "lifestyle"];

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

  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedIndex((index) =>
        index === featuredImages.length - 1 ? 0 : index + 1,
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/all`)
      .then((response) => setShoes(response.data))
      .catch((error) => console.error("Error fetching shoes:", error));
  }, []);

  const handleFavorite = (shoe) => {
    const wasFavorite = favorites.includes(getFavoriteId(shoe));
    const updatedFavorites = toggleFavorite(shoe);

    setFavorites(updatedFavorites.map(getFavoriteId).filter(Boolean));
    setFavoriteMessage(
      wasFavorite ? "Removed from favorites" : "Added to favorites",
    );
    setTimeout(() => setFavoriteMessage(""), 2000);
  };

  const handleAddToCart = (shoe) => {
    const savedCart = getCart();
    const existingShoe = savedCart.some((item) => item._id === shoe._id);
    const updatedCart = existingShoe
      ? removeFromCart(shoe._id)
      : addToCart(shoe);

    setAddCard(updatedCart.map((item) => item._id));
    setAddCardMessage(existingShoe ? "Removed from cart" : "Added to cart");
    setTimeout(() => setAddCardMessage(""), 2000);
  };

  const handleViewShoe = (id) => {
    navigate(`/product/${id}`, {
      state: { from: "/women" },
    });
  };

  const filteredShoes = [...shoes]
    .filter((shoe) => {
      if (shoe.gender?.toLowerCase() !== "women") return false;
      if (
        activeCategory !== "all" &&
        shoe.productStatus?.toLowerCase() !== activeCategory
      ) {
        return false;
      }
      if (
        selectedCategory !== "all" &&
        shoe.category?.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (activeCategory !== "new") return 0;
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

  return (
    <div>
      {favoriteMessage && (
        <div className="favorite-notification">{favoriteMessage}</div>
      )}
      {addCardMessage && (
        <div className="add-card-notification">{addCardMessage}</div>
      )}

      <h1 className="title-page">WOMEN SECTION</h1>
      <h2 className="title-description">
        Find your everyday pair. Built to move, styled to last.
      </h2>

      <ProductFilter
        activeFilter={activeCategory}
        setActiveFilter={setActiveCategory}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={womenCategories}
      />

      <section className="featured-section">
        <h2 className="featured-title">Featured</h2>
        <div className="featured-carousel">
          <div
            className="featured-track"
            style={{ transform: `translateX(-${featuredIndex * 25}%)` }}
          >
            {[...featuredImages, ...featuredImages].map((image, index) => (
              <div className="featured-card" key={index}>
                <img src={image} alt={`Featured women shoe ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="featured-dots">
          {featuredImages.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Show featured image ${index + 1}`}
              className={featuredIndex === index ? "active" : ""}
              onClick={() => setFeaturedIndex(index)}
            />
          ))}
        </div>
      </section>

      <div className="product-card-container">
        {filteredShoes.map((shoe) => (
          <div
            className="product-card"
            key={shoe._id}
            onClick={() => handleViewShoe(shoe._id)}
          >
            <div className="product-image-container">
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

              <div className="product-actions">
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

                <button
                  className={`add-cart-button ${
                    addCard.includes(shoe._id) ? "added" : ""
                  }`}
                  type="button"
                  aria-label={`${
                    addCard.includes(shoe._id) ? "Remove" : "Add"
                  } ${shoe.name} ${
                    addCard.includes(shoe._id) ? "from" : "to"
                  } cart`}
                  aria-pressed={addCard.includes(shoe._id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAddToCart(shoe);
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} size="sm" />
                </button>
              </div>

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
        {filteredShoes.length === 0 && (
          <p className="no-products-message">
            No women&apos;s products match the selected filters.
          </p>
        )}
      </div>
    </div>
  );
}
