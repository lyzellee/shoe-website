import { useState } from "react";
import { Card, Button, Navbar, Container } from "react-bootstrap";
import axios from "axios";

export default function CategoryMen() {
  const [shoes, setShoes] = useState([]);

  const handleCategoryWomen = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/women");
      setShoes(response.data);
      console.log("Women's shoes fetched successfully:", response.data);
    } catch (e) {
      console.error("Error fetching women's shoes:", e);
    }
  };

  const handleCategoryMen = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/men");

      setShoes(response.data);
      console.log("Men's shoes fetched successfully:", response.data);
    } catch (e) {
      console.error("Error fetching men's shoes:", e);
    }
  };

  const handleListAll = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/all");

      setShoes(response.data);
      console.log("All shoes fetched successfully:", response.data);
    } catch (e) {
      console.error("Error fetching shoes:", e);
    }
  };
  return (
    <div>
      <Navbar className="bg-body-tertiary mb-3">
        <Container>
          <Button variant="primary" onClick={handleListAll}>
            All
          </Button>

          <Button variant="primary" onClick={handleCategoryMen}>
            Men
          </Button>
          <Button variant="primary" onClick={handleCategoryWomen}>
            Women
          </Button>
        </Container>
      </Navbar>

      <div className="d-flex flex-wrap gap-3">
        {shoes.map((shoe) => (
          <Card key={shoe._id} style={{ width: "18rem" }}>
            <Card.Img variant="top" src="holder.js/100px180" />

            <Card.Body>
              <Card.Title>{shoe.name}</Card.Title>

              <Card.Text>
                Brand: {shoe.brand}
                <br />
                Price: ${shoe.price}
              </Card.Text>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
