import { Carousel, Container, Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const [latestShoes, setLatestShoes] = useState([]);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_BASE_URL}/api/all`)
      .then((response) => setLatestShoes(response.data.slice(0, 4)))
      .catch(() => setLatestShoes([]));
  }, []);

  return (
    <>
      <Carousel className="hero-carousel">
        {/* Slide 1 - Explore Collection */}
        <Carousel.Item>
          <div className="hero-image hero-image-featured">
            <img
              src="/featured-images/sage-green-sneaker-studio.png"
              alt="Sage green sneaker studio collection"
            />
          </div>
          <Container>
            <Row className="align-items-center hero-slide hero-slide-featured">
              <Col md={6} className="hero-content">
                <p className="hero-label">NEW SEASON / 2026</p>

                <h1>
                  Step into
                  <br />
                  <span>your Style</span>
                </h1>

                <p className="hero-description">
                  Performance-inspired footwear designed for everyday movement.
                </p>

                <Button
                  className="hero-button"
                  onClick={() => navigate("/men")}
                >
                  Explore Collection
                </Button>
              </Col>
            </Row>
          </Container>
        </Carousel.Item>

        {/* Slide 2 - Men's Collection */}
        <Carousel.Item>
          <div className="hero-image hero-image-men">
            <img
              src="/featured-images/men-sneaker-studio.jpe"
              alt="Men's sneaker collection"
            />
          </div>
          <Container>
            <Row className="align-items-center hero-slide hero-slide-men">
              <Col md={6} className="hero-content">
                <p className="hero-label">MEN'S COLLECTION</p>

                <h1>
                  Move with
                  <br />
                  <span>Confidence</span>
                </h1>

                <p className="hero-description">
                  Find your next everyday pair.
                </p>

                <Button
                  className="hero-button"
                  onClick={() => navigate("/men")}
                >
                  Shop Men's
                </Button>
              </Col>
            </Row>
          </Container>
        </Carousel.Item>

        {/* Slide 3 - Women's Collection */}
        <Carousel.Item>
          <div className="hero-image hero-image-women">
            <img
              src="/featured-images/women-sneaker-studio.png"
              alt="Women's pink sneaker collection"
            />
          </div>
          <Container>
            <Row className="align-items-center hero-slide hero-slide-women">
              <Col md={6} className="hero-content">
                <p className="hero-label">WOMEN'S COLLECTION</p>

                <h1>
                  Find your
                  <br />
                  <span>Perfect Pair</span>
                </h1>

                <p className="hero-description">Style made for every step.</p>

                <Button
                  className="hero-button"
                  onClick={() => navigate("/women")}
                >
                  Shop Women's
                </Button>
              </Col>
            </Row>
          </Container>
        </Carousel.Item>
      </Carousel>

      <section className="latest-drop-section">
        <Container>
          <div className="latest-drop-heading">
            <div>
              <p>CURATED FOR YOU</p>
              <h2>Latest drop</h2>
            </div>
            <button type="button" onClick={() => navigate("/men")}>
              View all <span>→</span>
            </button>
          </div>

          <div className="latest-drop-grid">
            {latestShoes.map((shoe) => (
              <article
                className="latest-drop-card"
                key={shoe._id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/product/${shoe._id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") navigate(`/product/${shoe._id}`);
                }}
              >
                <div className="latest-drop-image">
                  {shoe.productStatus && <span>{shoe.productStatus}</span>}
                  <img
                    src={
                      shoe.image
                        ? `http://localhost:5000${shoe.image.startsWith("/") ? "" : "/"}${shoe.image}`
                        : "/product-images/product%201.png"
                    }
                    alt={shoe.name || "Shoe"}
                  />
                </div>
                <p>{shoe.gender || shoe.category}</p>
                <div>
                  <strong>{shoe.name || "Product"}</strong>
                  <span>
                    ₱{Number(shoe.price || 0).toLocaleString("en-PH")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

export default Home;
