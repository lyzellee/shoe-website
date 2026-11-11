import { useEffect, useRef, useState } from "react";
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

// Hero carousel images (put these files in public/featured-images/).
// "focus" = which part of the image stays visible in the wide banner (0 = top, 100 = bottom)
const featuredImages = [
  { src: "/featured-images/women-carousel-page-1.jpg", focus: 32 },
  { src: "/featured-images/women-carousel-page-2.jpg", focus: 60 },
  { src: "/featured-images/women-carousel-page-3.jpg", focus: 40 },
];

// Returns "light" when the visible top part of an image is bright, otherwise "dark".
// "focus" is the same vertical crop position the banner uses (0-100).
// The hero title uses this to pick a readable text color.
const detectImageTone = (src, focus = 50) =>
  new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 48;
        canvas.height = 24;

        const context = canvas.getContext("2d");

        // The banner is a wide strip, so only part of the image is visible
        const visibleHeight = Math.min(
          image.naturalHeight,
          image.naturalWidth / 6,
        );
        const top = (image.naturalHeight - visibleHeight) * (focus / 100);

        // Look at the middle-top of what is visible, where the title sits
        context.drawImage(
          image,
          image.naturalWidth * 0.25,
          top,
          image.naturalWidth * 0.5,
          visibleHeight * 0.4,
          0,
          0,
          canvas.width,
          canvas.height,
        );

        const { data } = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const toLinear = (value) => {
          const channel = value / 255;
          return channel <= 0.03928
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        };
        const values = [];

        for (let i = 0; i < data.length; i += 4) {
          values.push(
            0.2126 * toLinear(data[i]) +
              0.7152 * toLinear(data[i + 1]) +
              0.0722 * toLinear(data[i + 2]),
          );
        }

        const mean =
          values.reduce((sum, value) => sum + value, 0) / values.length;
        const spread = Math.sqrt(
          values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
            values.length,
        );

        // A busy area (people, shoes) is not safe for dark text, so use white
        // text with the dark layer. A plain area uses whichever title color
        // (white or #262a2a) has more contrast with it.
        resolve(spread < 0.12 && mean > 0.18 ? "light" : "dark");
      } catch {
        // Image could not be read, so use the white title
        resolve("dark");
      }
    };

    image.onerror = () => resolve("dark");
    image.src = src;
  });

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
  const [imageTones, setImageTones] = useState([]);
  const heroRef = useRef(null);
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

  // HERO SHRINKS WHILE SCROLLING, THEN SCROLLS AWAY WITH THE PAGE
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;

    let frame = 0;

    const update = () => {
      frame = 0;

      const width = window.innerWidth;
      const expanded =
        width <= 480 ? 220 : width <= 768 ? 260 : width <= 992 ? 340 : 440;
      const collapsed = Math.min(
        expanded,
        Math.min(380, Math.max(220, window.innerHeight * 0.34)),
      );
      const distance = expanded - collapsed;
      const progress =
        distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 1;

      hero.style.setProperty("--hero-h", `${expanded - distance * progress}px`);
      hero.style.setProperty("--hero-p", String(progress));
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    // The browser must not "fix" the scroll position while the banner changes size
    const previousAnchor = document.documentElement.style.overflowAnchor;
    document.documentElement.style.overflowAnchor = "none";

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      document.documentElement.style.overflowAnchor = previousAnchor;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Check how bright each hero image is
  useEffect(() => {
    let cancelled = false;

    Promise.all(
      featuredImages.map((image) => detectImageTone(image.src, image.focus)),
    ).then((tones) => {
      if (!cancelled) setImageTones(tones);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedIndex((index) =>
        index === featuredImages.length - 1 ? 0 : index + 1,
      );
    }, 4000);

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
    <div className="women-page">
      {favoriteMessage && (
        <div className="favorite-notification">{favoriteMessage}</div>
      )}
      {addCardMessage && (
        <div className="add-card-notification">{addCardMessage}</div>
      )}

      {/* HERO CAROUSEL WITH TITLE ON TOP OF THE IMAGES */}
      <div className="women-hero-sticky" ref={heroRef}>
        <section
          className="women-hero"
          data-tone={imageTones[featuredIndex] || "dark"}
          aria-label="Women section featured images"
        >
          {featuredImages.map((image, index) => (
            <img
              key={image.src}
              className={`women-hero-slide ${featuredIndex === index ? "active" : ""}`}
              style={{ objectPosition: `center ${image.focus}%` }}
              src={image.src}
              alt=""
              aria-hidden={featuredIndex !== index}
            />
          ))}

          <div className="women-hero-overlay">
            <h1 className="women-hero-title">WOMEN SECTION</h1>
            <h2 className="women-hero-description">
              Find your everyday pair. Built to move, styled to last.
            </h2>
          </div>

          {/* CAROUSEL DOTS */}
          <div className="women-hero-dots">
            {featuredImages.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Show image ${index + 1}`}
                className={featuredIndex === index ? "active" : ""}
                onClick={() => setFeaturedIndex(index)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* FILTERS AND CATEGORY DROPDOWN */}
      <ProductFilter
        activeFilter={activeCategory}
        setActiveFilter={setActiveCategory}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={womenCategories}
      />

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
