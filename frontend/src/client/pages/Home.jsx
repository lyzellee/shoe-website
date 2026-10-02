import { Carousel, Container, Row, Col, Button } from "react-bootstrap";
import "./Home.css";

function Home() {
  return (
    <Carousel className="hero-carousel">

      {/* Slide 1 */}
      <Carousel.Item>
        <Container>
          <Row className="align-items-center hero-slide">

            <Col md={6} className="hero-content">
              <p className="hero-label">
                NEW SEASON / 2026
              </p>

              <h1>
                Step into
                <br />
                <span>your Style</span>
              </h1>

              <p className="hero-description">
                Performance-inspired footwear designed
                for everyday movement.
              </p>

              <Button className="hero-button">
                Explore Collection
              </Button>
            </Col>

            <Col md={6} className="hero-image">
              <img
                src="/shoes/hero-shoe.png"
                alt="Featured shoe"
              />
            </Col>

          </Row>
        </Container>
      </Carousel.Item>

      {/* Slide 2 */}
      <Carousel.Item>
        <Container>
          <Row className="align-items-center hero-slide">

            <Col md={6} className="hero-content">
              <p className="hero-label">
                MEN'S COLLECTION
              </p>

              <h1>
                Move with
                <br />
                <span>Confidence</span>
              </h1>

              <p className="hero-description">
                Find your next everyday pair.
              </p>

              <Button className="hero-button">
                Shop Men's
              </Button>
            </Col>

            <Col md={6} className="hero-image">
              <img
                src="/shoes/men-shoe.png"
                alt="Men's shoe"
              />
            </Col>

          </Row>
        </Container>
      </Carousel.Item>

      {/* Slide 3 */}
      <Carousel.Item>
        <Container>
          <Row className="align-items-center hero-slide">

            <Col md={6} className="hero-content">
              <p className="hero-label">
                WOMEN'S COLLECTION
              </p>

              <h1>
                Find your
                <br />
                <span>Perfect Pair</span>
              </h1>

              <p className="hero-description">
                Style made for every step.
              </p>

              <Button className="hero-button">
                Shop Women's
              </Button>
            </Col>

            <Col md={6} className="hero-image">
              <img
                src="/shoes/women-shoe.png"
                alt="Women's shoe"
              />
            </Col>

          </Row>
        </Container>
      </Carousel.Item>

    </Carousel>
  );
}

export default Home;