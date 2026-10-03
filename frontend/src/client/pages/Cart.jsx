import { useState } from "react";
import { Card, Button, Navbar, Container } from "react-bootstrap";
import axios from "axios";

export default function getCartOrder(){

  const [shoes, setShoes] = useState([]);
  const handleCartOrder = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/cart");
      setShoes(response.data);
      console.log("Cart order fetched successfully:", response.data);
    } catch (e) {
      console.error("Error fetching cart order:", e);
    }
  };
    return(
      <div>
        <Navbar className="bg-body-tertiary mb-3">
          <Container>
            <Button variant="primary" onClick={handleCartOrder}>
              Cart Order
            </Button>
          </Container>
        </Navbar>
    );
}