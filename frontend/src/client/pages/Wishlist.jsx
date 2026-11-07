import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart as faHeartSolid,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { getFavoriteId, readFavorites, removeFavorite } from "../favorites.js";
import "./Wishlist.css";

export default function Wishlist() {
  const [favorites, setFavorites] = useState(readFavorites);

  const navigate = useNavigate();

  // Listen for favorites added or removed on other pages.
  useEffect(() => {
    let isCurrent = true;

    const updateFavorites = async () => {
      const savedFavorites = readFavorites();
      setFavorites(savedFavorites);

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/all`,
        );
        const currentShoes = Array.isArray(response.data) ? response.data : [];

        if (!isCurrent) return;

        const mergedFavorites = savedFavorites
          .map((savedShoe) => {
            const savedId = getFavoriteId(savedShoe);
            const currentShoe = currentShoes.find(
              (shoe) => String(shoe._id || shoe.id) === savedId,
            );

            return currentShoe ? { ...savedShoe, ...currentShoe } : savedShoe;
          })
          .filter(Boolean);

        setFavorites(mergedFavorites);
      } catch {
        // Keep the saved favorite data if the backend is unavailable.
      }
    };

    window.addEventListener("favoritesUpdated", updateFavorites);
    window.addEventListener("storage", updateFavorites);
    window.addEventListener("focus", updateFavorites);
    updateFavorites();

    return () => {
      isCurrent = false;
      window.removeEventListener("favoritesUpdated", updateFavorites);
      window.removeEventListener("storage", updateFavorites);
      window.removeEventListener("focus", updateFavorites);
    };
  }, []);

  // Remove a shoe from favorites
  const handleRemoveFavorite = (shoeId) => {
    setFavorites(removeFavorite(shoeId));
  };

  // Open the selected product
  const handleViewShoe = (shoe) => {
    const shoeId = getFavoriteId(shoe);

    if (shoeId) {
      navigate(`/product/${shoeId}`);
    }
  };

  // Format product prices
  const formatPrice = (price) => (Number(price) || 0).toLocaleString("en-PH");

  // Format product labels consistently
  const formatLabel = (value) => {
    if (typeof value !== "string" || !value.trim()) return "";

    return value
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  // Get the product image
  const getImage = (shoe) =>
    shoe.image ||
    shoe.imageUrl ||
    shoe.img ||
    "/product-images/product%201.png";

  return (
    <main className="wishlist-page">
      <header className="wishlist-header">
        <h1>Wishlist</h1>
        <p>Your shortlist of pairs worth moving in.</p>
      </header>

      <section className="wishlist-content">
        <p className="wishlist-section-title">SAVED FOR LATER</p>

        <div className="wishlist-divider" />

        {favorites.length === 0 ? (
          <div className="wishlist-empty">
            <FontAwesomeIcon icon={faHeartSolid} />

            <h3>Your wishlist is empty</h3>

            <p>Save your favorite shoes to see them here.</p>

            <button
              type="button"
              className="wishlist-shop-button"
              onClick={() => navigate("/men")}
            >
              Explore Shoes
            </button>
          </div>
        ) : (
          <div className="wishlist-grid">
            {favorites.map((shoe) => {
              const shoeId = getFavoriteId(shoe);
              if (!shoeId || typeof shoe !== "object") return null;

              return (
                <article className="wishlist-card" key={shoeId}>
                  <div
                    className="wishlist-image-container"
                    onClick={() => handleViewShoe(shoe)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleViewShoe(shoe);
                      }
                    }}
                  >
                    <div className="wishlist-tags">
                      {shoe.productStatus && (
                        <span className="wishlist-badge">
                          {formatLabel(shoe.productStatus)}
                        </span>
                      )}

                      {shoe.category && (
                        <span className="wishlist-badge wishlist-category-badge">
                          {formatLabel(shoe.category)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="wishlist-action-button wishlist-remove-button"
                      aria-label="Remove from favorites"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveFavorite(shoeId);
                      }}
                    >
                      <FontAwesomeIcon icon={faHeartSolid} />
                    </button>

                    <button
                      type="button"
                      className="wishlist-action-button wishlist-view-button"
                      aria-label="View product"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleViewShoe(shoe);
                      }}
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>

                    <img
                      className="wishlist-product-image"
                      src={getImage(shoe)}
                      alt={shoe.name || "Shoe"}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src =
                          "/product-images/product%201.png";
                      }}
                    />
                  </div>

                  <div className="wishlist-product-info">
                    <p className="wishlist-product-category">
                      {formatLabel(
                        shoe.brand || shoe.gender || shoe.category || "Shoes",
                      )}
                    </p>

                    <div className="wishlist-product-details">
                      <h3 className="wishlist-product-name">
                        {shoe.name || "Unnamed Shoe"}
                      </h3>

                      <span className="wishlist-product-price">
                        ₱{formatPrice(shoe.price)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
