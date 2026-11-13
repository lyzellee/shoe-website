import { useState } from "react";
import { Form, Button, Container, Dropdown, Col, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Addshoes.css";
import { removeBackground } from "@imgly/background-removal";

const availableSizes = [4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function AddShoes() {
  const navigate = useNavigate();

  // 1. useState para sa bawat input field
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [gender, setGender] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // NEW FIELDS
  const [productStatus, setProductStatus] = useState("");
  const [sizes, setSizes] = useState([]);
  const [color, setColor] = useState("");
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState("");

  // IMAGE PREVIEW
  const [imagePreview, setImagePreview] = useState("");

  // HANDLE SHOE SIZE SELECTION
  const handleSizeChange = (size) => {
    setSizes((previousSizes) => {
      if (previousSizes.includes(size)) {
        return previousSizes.filter((item) => item !== size);
      }

      return [...previousSizes, size].sort((a, b) => a - b);
    });
  };

  // HANDLE IMAGE UPLOAD
  const handleImageChange = (e) => {
    const selectedImage = e.target.files[0];

    if (!selectedImage) return;

    if (!selectedImage.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (selectedImage.size > 5 * 1024 * 1024) {
      alert("Image size must not exceed 5 MB.");
      e.target.value = "";
      return;
    }

    setImage(selectedImage);
    setImagePreview(URL.createObjectURL(selectedImage));
  };

  // RESET FORM AFTER SUCCESSFUL SUBMISSION
  const resetForm = () => {
    setName("");
    setBrand("");
    setPrice("");
    setGender("");
    setCategory("");
    setStock("");
    setProductStatus("");
    setSizes([]);
    setColor("");
    setImage(null);
    setImagePreview("");
    setDescription("");

    const fileInput = document.getElementById("shoe-image");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // 2. Submit function na tumatawag sa backend endpoint
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // <-- DITO
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("name", name);
      formData.append("brand", brand);
      formData.append("price", price);
      formData.append("gender", gender);
      formData.append("category", category);
      formData.append("stock", stock);
      formData.append("productStatus", productStatus);
      formData.append("sizes", JSON.stringify(sizes));
      formData.append("color", color);
      formData.append("description", description);

      if (image) {
        const transparentBlob = await removeBackground(image);
        const imageToUpload = new File([transparentBlob], "shoe.png", {
          type: "image/png",
        });
        formData.append("image", imageToUpload);
      }

      // Keep your existing admin token authentication
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/shoes`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert("Successfully added shoe!");
      resetForm();
      navigate("/admin/stock", { replace: true });
    } catch (err) {
      console.error("Error adding shoe:", err);

      alert(
        err.response?.data?.message || "Error adding shoe. Please try again.",
      );
    }
  };

  return (
    <div className="shoe-page">
      <Container fluid className="shoe-wrap">
        {/* PAGE HEADING */}
        <div className="shoe-heading">
          <div>
            <p className="shoe-eyebrow">INVENTORY</p>
            <h2 className="shoe-title">Add New Product</h2>
            <p className="shoe-description">
              Enter the product information to add a new shoe to your inventory.
            </p>
          </div>
        </div>

        {/* FORM PANEL */}
        <div className="shoe-form-card">
          <div className="shoe-form-header">
            <h5>Product Information</h5>
            <p>Fill in the details below.</p>
          </div>

          <Form onSubmit={handleSubmit}>
            {/* SHOE NAME AND BRAND */}
            <Row className="g-4 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Shoe Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter shoe name"
                    required
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
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* PRICE AND STOCK */}
            <Row className="g-4 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Price</Form.Label>
                  <Form.Control
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Enter price"
                    required
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Stock Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="Enter stock quantity"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* GENDER AND CATEGORY */}
            <Row className="g-4 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Gender</Form.Label>
                  <Form.Select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
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
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select Category
                    </option>
                    <option value="running">Running</option>
                    <option value="sports">Sports</option>
                    <option value="casual">Casual</option>
                    <option value="lifestyle">Lifestyle</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* PRODUCT STATUS AND COLOR */}
            <Row className="g-4 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Product Status</Form.Label>
                  <Form.Select
                    value={productStatus}
                    onChange={(e) => setProductStatus(e.target.value)}
                  >
                    <option value="">No Status</option>
                    <option value="new">New</option>
                    <option value="popular">Popular</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label>Color</Form.Label>
                  <Form.Control
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Enter shoe color"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* SHOE SIZES */}
            <Row className="g-4 mb-4">
              <Col xs={12}>
                <Form.Group>
                  <div className="shoe-size-heading">
                    <Form.Label>Available Shoe Sizes</Form.Label>
                    <span className="shoe-size-count">
                      {sizes.length} selected
                    </span>
                  </div>

                  <div className="shoe-size-options">
                    {availableSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        className={`shoe-size-button ${
                          sizes.includes(size) ? "selected" : ""
                        }`}
                        onClick={() => handleSizeChange(size)}
                        aria-pressed={sizes.includes(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>

                  <p className="shoe-size-help">
                    Select all sizes available for this product.
                  </p>
                </Form.Group>
              </Col>
            </Row>

            {/* PRODUCT IMAGE */}
            <Row className="g-4 mb-3">
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Product Image</Form.Label>

                  <Form.Control
                    id="shoe-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />

                  <Form.Text className="text-muted">
                    Upload a shoe image. Maximum file size: 5 MB.
                  </Form.Text>

                  {imagePreview && (
                    <div className="shoe-image-preview">
                      <img src={imagePreview} alt="Shoe preview" />

                      <Button
                        type="button"
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => {
                          setImage(null);
                          setImagePreview("");
                          document.getElementById("shoe-image").value = "";
                        }}
                      >
                        Remove Image
                      </Button>
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>

            {/* PRODUCT DESCRIPTION */}
            <Row className="g-4 mb-4">
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Product Description</Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter product description"
                    className="shoe-description-input"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* SUBMIT BUTTON */}
            <div className="shoe-form-actions">
              <Button
                type="submit"
                className="shoe-btn"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processing & Removing Background..."
                  : "Add Product"}
              </Button>
            </div>
          </Form>
        </div>
      </Container>
    </div>
  );
}
