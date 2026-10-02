import { useState } from "react";
import { Form, Button, Container, Dropdown, Col, Row } from "react-bootstrap";
import axios from "axios";


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
    <Container className="mt-4">
      <h3 className="text-center mb-4">Add Shoes</h3>
      <Form onSubmit={handleSubmit}>
        <Row>
          <Form.Group className="mb-3">
            <Form.Label>Shoe Name</Form.Label>
            <Form.Control
              style={{ width: "200px" }}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter shoe name"
            />
          </Form.Group>


          <Form.Group className="mb-3">
            <Form.Label>Brand</Form.Label>
            <Form.Control
              style={{ width: "200px" }}
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Enter brand"
            />
          </Form.Group>
        </Row>


        <Form.Group className="mb-3">
          <Form.Label>Price</Form.Label>
          <Form.Control
            style={{ width: "200px" }}
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Enter price"
          />
        </Form.Group>


        <Form.Select
          style={{ width: "200px" }}
          className="mb-3"
          aria-label="Default select example"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option>Gender</option>
          <option value="men">Men</option>
          <option value="women">Women</option>
        </Form.Select>
        <Form.Select
          style={{ width: "200px" }}
          className="mb-3"
          aria-label="Default select example"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>Category</option>
          <option value="running">Running</option>
          <option value="sports">Sports</option>
        </Form.Select>


        <Form.Group className="mb-3">
          <Form.Label>Stock</Form.Label>
          <Form.Control
            style={{ width: "200px" }}
            type="Number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Enter Stock"
          />
        </Form.Group>


        <Button type="submit" variant="primary">
          Add Shoe
        </Button>
      </Form>
    </Container>
  );
}



