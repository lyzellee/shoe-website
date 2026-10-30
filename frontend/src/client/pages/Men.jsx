import { useState, useEffect } from "react";
import { Button, Dropdown, Navbar, Container } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import { faHeart as faHeartSolid } from "@fortawesome/free-solid-svg-icons";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getFavoriteId, readFavorites, toggleFavorite } from "../favorites.js";
import "./Men.css";
import { addToCart, getCart } from "../../components/AddToCartItems.jsx";
const featuredImages = [
  "/featured-images/featured 1.jpg",
  "/featured-images/featured 2.jpg",
  "/featured-images/featured 3.jpg",
  "/featured-images/featured 4.jpg",
];

export default function CategoryMen() {
  const [shoes, setShoes] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
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

  //heart button functionality

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

  // add to cart button functionality

  const handleAddToCard = (shoe) => {
    // Kunin ang existing cart.
    const savedCart = getCart();

    // Check kung nasa cart na ang shoe.
    const existingShoe = savedCart.some((item) => item._id === shoe._id);

    if (existingShoe) {
      setAddCardMessage("Already in cart");
    } else {
      // Gamitin ang reusable function mula sa AddToCartItems.jsx.
      const updatedCart = addToCart(shoe);

      // I-update ang React state.
      setAddCard(updatedCart.map((item) => item._id));

      setAddCardMessage("Added to cart");
    }

    // Alisin ang notification pagkatapos ng 2 seconds.
    setTimeout(() => {
      setAddCardMessage("");
    }, 2000);
  };

  const handleListAll = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/all");
      setShoes(response.data);
    } catch (e) {
      console.error("Error fetching shoes:", e);
    }
  };

  const handleViewShoe = (id) => {
    navigate(`/product/${id}`, {
      state: {
        from: "/men",
      },
    });
  };

  return (
    <div>
      {favoriteMessage && (
        <div className="favorite-notification">{favoriteMessage}</div>
      )}

      {addCardMessage && (
        <div className="add-card-notification">{addCardMessage}</div>
      )}

      <h1 className="title-page">MEN SECTION</h1>

      <h2 className="title-description">
        Find your everyday pair. Built to move, styled to last.
      </h2>

      {/* category buttons */}

      <Navbar className="category-navbar">
        <Container>
          <div className="category-buttons">
            <Button
              className={`category-button ${
                activeCategory === "all" ? "active" : ""
              }`}
              onClick={() => {
                setActiveCategory("all");
                handleListAll();
              }}
            >
              All
            </Button>

            <Button
              className={`category-button ${
                activeCategory === "popular" ? "active" : ""
              }`}
              onClick={() => {
                setActiveCategory("popular");
                handleListAll();
              }}
            >
              Popular
            </Button>

            <Button
              className={`category-button ${
                activeCategory === "new" ? "active" : ""
              }`}
              onClick={() => {
                setActiveCategory("new");
                handleListAll();
              }}
            >
              New
            </Button>
          </div>

          <Dropdown>
            <Dropdown.Toggle className="category-dropdown">
              Category
            </Dropdown.Toggle>

            <Dropdown.Menu className="category-dropdown-option">
              <Dropdown.Item href="#">Running</Dropdown.Item>
              <Dropdown.Item href="#">Casual</Dropdown.Item>
              <Dropdown.Item href="#">Lifestyle</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Container>
      </Navbar>

      {/* featured */}

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

        {/* dots */}

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
        {shoes.map((shoe) => (
          <div
            className="product-card"
            key={shoe._id}
            onClick={() => handleViewShoe(shoe._id)}
          >
            {/* IMAGE SECTION */}
            <div className="product-image-container">
              {/* TAGS */}
              <div className="product-tags">
                <span className="product-tag">NEW</span>
                <span className="product-tag">{shoe.category}</span>
              </div>

              {/* ACTION BUTTONS */}
              <div className="product-actions">
                <button
                  className={`wishlist-button ${
                    favorites.includes(getFavoriteId(shoe)) ? "favorite" : ""
                  }`}
                  type="button"
                  aria-label={`${
                    favorites.includes(getFavoriteId(shoe)) ? "Remove" : "Add"
                  } ${shoe.name} ${favorites.includes(getFavoriteId(shoe)) ? "from" : "to"} favorites`}
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
                src="/product-images/product 1.png"
                alt={shoe.name}
              />
            </div>

            {/* PRODUCT INFORMATION */}
            <div className="product-info">
              <p className="product-gender">{shoe.gender}</p>

              <div className="product-bottom">
                <p className="product-name">{shoe.name}</p>

                <p className="product-price">
                  ₱{Number(shoe.price).toLocaleString("en-PH")}
                </p>

                <div onClick={() => handleViewShoe(shoe._id)}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
