import { useState } from "react";
import { Form, Button, Container, Dropdown, Col, Row } from "react-bootstrap";
export default function Placeorder() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    province: "",
    zipCode: "",
    phone: "",
    email: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="h4 fw-bold mb-3">Delivery</h2>
      <Form>
        {/* First Name & Last Name */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Control
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>
          <Col md={6} className="mt-2 mt-md-0">
            <Form.Control
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>
        </Row>

        {/* Address */}
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
            className="rounded-pill bg-light"
          />
        </Form.Group>

        {/* City, Province, ZIP Code */}
        <Row className="mb-3">
          <Col md={4}>
            <Form.Control
              type="text"
              name="city"
              placeholder="City"
              value={formData.city}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>
          <Col md={4} className="mt-2 mt-md-0">
            <Form.Control
              type="text"
              name="province"
              placeholder="Province"
              value={formData.province}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>
          <Col md={4} className="mt-2 mt-md-0">
            <Form.Control
              type="text"
              name="zipCode"
              placeholder="ZIP code"
              value={formData.zipCode}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>
        </Row>

        {/* Phone & Email Address */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Control
              type="text"
              name="phone"
              placeholder="Phone"
              value={formData.phone}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>
          <Col md={6} className="mt-2 mt-md-0">
            <Form.Control
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              className="rounded-pill bg-light"
            />
          </Col>
        </Row>

        {/* Submit Button */}
        <Button type="submit" className="w-100 rounded-pill btn-dark py-2 mt-2">
          Place Order
        </Button>
      </Form>
    </div>
  );
}
