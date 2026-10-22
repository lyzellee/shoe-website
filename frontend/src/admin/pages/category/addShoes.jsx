import { useState } from "react";
import { Form, Button, Container, Dropdown, Col, Row } from "react-bootstrap";
import axios from "axios";
import "./Addshoes.css";

export default function AddShoes() {
  // 1. useState para sa bawat input field
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [gender, setGender] = useState("men");
  const [category, setCategory] = useState("running");
  const [stock, setStock] = useState();

  // 2. Submit function na tumatawag sa backend endpoint
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/shoes", {
        name,
        brand,
        price,
        gender,
        category,
        stock,
      });
      alert("Successfully added shoe!");
    } catch (err) {
      console.error(err);
      alert("Error adding shoe");
    }
  };

  return (
    <div className="shoe-page">
      <Container className="shoe-wrap">
        <p className="shoe-eyebrow">Inventory</p>
        <h3 className="shoe-title">Add Shoes</h3>
        <Form onSubmit={handleSubmit}>
          <Row className="g-3 mb-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="visually-hidden">Shoe Name</Form.Label>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter shoe name"
                />
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="visually-hidden">Brand</Form.Label>
                <Form.Control
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Enter brand"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="visually-hidden">Price</Form.Label>
                <Form.Control
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter price"
                />
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="visually-hidden">Stock</Form.Label>
                <Form.Control
                  type="Number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="Enter Stock"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col xs={12} md={6}>
              <Form.Select
                aria-label="Default select example"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option>Gender</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </Form.Select>
            </Col>

            <Col xs={12} md={6}>
              <Form.Select
                aria-label="Default select example"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Category</option>
                <option value="running">Running</option>
                <option value="sports">Sports</option>
              </Form.Select>
            </Col>
          </Row>

          <Button type="submit" variant="primary" className="shoe-btn">
            Add Shoe
          </Button>
        </Form>
      </Container>
    </div>
  );
}
