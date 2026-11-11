import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import {
  faHeart as faHeartSolid,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";
import { getFavoriteId, readFavorites, toggleFavorite } from "../favorites.js";
import {
  addToCart,
  getCart,
  removeFromCart,
} from "../../components/AddToCartItems.jsx";
// Reuses the product card styles from the Men page.
// Keep this file in the same folder as Men.jsx so these paths work.
import "./Men.css";

// Same image logic as the Men page
const getShoeImage = (image) => {
  if (!image) {
    return "/product-images/product 1.png";
  }
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  return `http://localhost:5000${image.startsWith("/") ? "" : "/"}${image}`;
};

const formatLabel = (value) => {
  if (typeof value !== "string" || !value.trim()) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

// ---------- Search helpers ----------

// lowercase, drop apostrophes, turn punctuation into spaces
const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Words that say nothing about a specific product ("running shoes" -> "running")
const STOP_WORDS = new Set([
  "shoe",
  "shoes",
  "sneaker",
  "sneakers",
  "footwear",
  "kicks",
  "pair",
  "pairs",
  "for",
  "the",
  "a",
  "an",
  "and",
  "of",
  "in",
  "with",
]);

// Different ways people type a gender
const GENDER_ALIASES = {
  men: "men",
  mens: "men",
  man: "men",
  male: "men",
  guys: "men",
  women: "women",
  womens: "women",
  woman: "women",
  ladies: "women",
  lady: "women",
  female: "women",
  kid: "kids",
  kids: "kids",
  child: "kids",
  children: "kids",
  boy: "kids",
  boys: "kids",
  girl: "kids",
  girls: "kids",
};
const toGender = (word) => GENDER_ALIASES[word] ?? null;

// Fields that should never be searched
const SKIP_KEYS = new Set([
  "_id",
  "id",
  "__v",
  "image",
  "images",
  "gender",
  "createdAt",
  "updatedAt",
]);

// Join every text field of a product (name, brand, category, description,
// colors, tags...) so anything you store on a shoe can be searched.
const collectText = (shoe) => {
  const parts = [];
  Object.entries(shoe).forEach(([key, value]) => {
    if (SKIP_KEYS.has(key)) return;
    (Array.isArray(value) ? value : [value]).forEach((item) => {
      if (typeof item === "string" && !/^(https?:\/\/|\/)/.test(item)) {
        parts.push(item);
      }
    });
  });
  return parts.join(" ");
};

// How well one product matches the typed words
const scoreShoe = (shoe, terms) => {
  const name = normalize(shoe.name);
  const brand = normalize(shoe.brand);
  const text = normalize(collectText(shoe));
  const compact = text.replace(/ /g, ""); // "air max" also matches "airmax"
  const rawGender = normalize(shoe.gender);
  const gender = toGender(rawGender) ?? rawGender;

  let matched = 0;
  let score = 0;

  terms.forEach((term) => {
    const genderTerm = toGender(term);
    let points = 0;

    if (genderTerm) {
      if (gender === genderTerm) points = 2;
      else if (gender === "unisex") points = 1;
    } else {
      // "sneakers" should also find "sneaker"
      const variants =
        term.length > 3 && term.endsWith("s")
          ? [term, term.slice(0, -1)]
          : [term];

      variants.forEach((variant) => {
        if (name.includes(variant) || brand.includes(variant)) {
          points = Math.max(points, 3);
        } else if (text.includes(variant)) {
          points = Math.max(points, 2);
        } else if (compact.includes(variant)) {
          points = Math.max(points, 1);
        }
      });
    }

    if (points > 0) {
      matched += 1;
      score += points;
    }
  });

  return { matched, score };
};

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const location = useLocation();
  const navigate = useNavigate();

  const [shoes, setShoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [favorites, setFavorites] = useState(() =>
    readFavorites().map(getFavoriteId).filter(Boolean),
  );
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [addCard, setAddCard] = useState(() =>
    getCart().map((item) => item._id),
  );
  const [addCardMessage, setAddCardMessage] = useState("");

  // Load all products once
  useEffect(() => {
    const fetchShoes = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/all`,
        );
        setShoes(response.data);
      } catch (error) {
        console.error("Error fetching shoes:", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShoes();
  }, []);

  // Keep hearts in sync with the navbar / other pages
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

  const handleFavorite = (shoe) => {
    const wasFavorite = favorites.includes(getFavoriteId(shoe));
    const updatedFavorites = toggleFavorite(shoe);

    setFavorites(updatedFavorites.map(getFavoriteId).filter(Boolean));
    setFavoriteMessage(
      wasFavorite ? "Removed from favorites" : "Added to favorites",
    );
    setTimeout(() => setFavoriteMessage(""), 2000);
  };

  const handleAddToCard = (shoe) => {
    const savedCart = getCart();
    const existingShoe = savedCart.some((item) => item._id === shoe._id);

    if (existingShoe) {
      const updatedCart = removeFromCart(shoe._id);
      setAddCard(updatedCart.map((item) => item._id));
      setAddCardMessage("Removed from cart");
    } else {
      const updatedCart = addToCart(shoe);
      setAddCard(updatedCart.map((item) => item._id));
      setAddCardMessage("Added to cart");
    }

    setTimeout(() => setAddCardMessage(""), 2000);
  };

  const handleViewShoe = (id) => {
    navigate(`/product/${id}`, {
      state: { from: `/search${location.search}` },
    });
  };

  const rawTerms = normalize(query).split(" ").filter(Boolean);
  const terms = rawTerms.filter((term) => !STOP_WORDS.has(term));

  let results = [];
  let isApproximate = false;

  if (rawTerms.length > 0) {
    if (terms.length === 0) {
      // e.g. just "shoes" -> show everything
      results = shoes;
    } else {
      const scored = shoes
        .map((shoe) => ({ shoe, ...scoreShoe(shoe, terms) }))
        .sort((a, b) => b.score - a.score);

      const exact = scored.filter((item) => item.matched === terms.length);
      if (exact.length > 0) {
        results = exact.map((item) => item.shoe);
      } else {
        // Nothing has every word: show the closest matches instead of nothing
        const partial = scored.filter((item) => item.matched > 0);
        results = partial.map((item) => item.shoe);
        isApproximate = partial.length > 0;
      }
    }
  }

  let description = "Type something in the search bar to find a pair.";
  if (query && isLoading) description = "Searching…";
  else if (query && !hasError) {
    const count = `${results.length} ${results.length === 1 ? "result" : "results"}`;
    description = isApproximate
      ? `No exact match for “${query}”. Showing the ${count} closest.`
      : `${count} for “${query}”`;
  }

  return (
    <div>
      {favoriteMessage && (
        <div className="favorite-notification">{favoriteMessage}</div>
      )}
      {addCardMessage && (
        <div className="add-card-notification">{addCardMessage}</div>
      )}

      <h1 className="title-page">SEARCH RESULTS</h1>
      <h2 className="title-description">{description}</h2>

      {hasError && (
        <p style={{ textAlign: "center" }}>
          Something went wrong while loading products. Please try again.
        </p>
      )}

      {query && !isLoading && !hasError && shoes.length === 0 && (
        <p style={{ textAlign: "center" }}>
          No products were loaded from the server. Check that your backend is
          running.
        </p>
      )}

      {query &&
        !isLoading &&
        !hasError &&
        shoes.length > 0 &&
        results.length === 0 && (
          <p style={{ textAlign: "center" }}>
            Nothing matched “{query}”. Try a shorter word, or browse{" "}
            <Link to="/men">Men</Link>, <Link to="/women">Women</Link> or{" "}
            <Link to="/kids">Kids</Link>.
          </p>
        )}

      <div className="product-card-container">
        {results.map((shoe) => (
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
      </div>
    </div>
  );
}
