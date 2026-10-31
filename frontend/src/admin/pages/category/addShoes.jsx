import { useState } from "react";
import { Form, Button, Container, Dropdown, Col, Row } from "react-bootstrap";
import axios from "axios";
import "./addshoes.css";

export default function AddShoes() {
  // 1. useState para sa bawat input field
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [gender, setGender] = useState("");
  const [category, setCategory] = useState("");
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
      <Container fluid className="shoe-wrap">
        {/* Page heading */}
        <div className="shoe-heading">
          <div>
            <p className="shoe-eyebrow">INVENTORY</p>
            <h2 className="shoe-title">Add New Product</h2>
            <p className="shoe-description">
              Enter the product information to add a new shoe to your inventory.
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="shoe-form-card">
          <div className="shoe-form-header">
            <h5>Product Information</h5>
            <p>Fill in the details below.</p>
          </div>

          <Form onSubmit={handleSubmit}>
            {/* Shoe name and brand */}
            <Row className="g-4 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Shoe Name</Form.Label>
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
                  <Form.Label>Brand</Form.Label>
                  <Form.Control
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Enter brand"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Price and stock */}
            <Row className="g-4 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Price</Form.Label>
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
                  <Form.Label>Stock Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="Enter stock quantity"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Gender and category */}
            <Row className="g-4 mb-4">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Gender</Form.Label>
                  <Form.Select
                    aria-label="Select gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="" disabled>
                      Select Gender
                    </option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    aria-label="Select category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="" disabled>
                      Select Category
                    </option>
                    <option value="running">Running</option>
                    <option value="sports">Sports</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Submit button */}
            <div className="shoe-form-actions">
              <Button type="submit" className="shoe-btn">
                Add Product
              </Button>
            </div>
          </Form>
        </div>
      </Container>
    </div>
  );
}
