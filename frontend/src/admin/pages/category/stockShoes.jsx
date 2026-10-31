import { useState, useEffect } from "react";
import { Table, Button, Container, Modal, Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import axios from "axios";
import "./stockShoes.css";
/*import ListAllShoe from "./src/pages/category/listAllShoe";*/

export default function stockShoes() {
  const [shoes, setShoes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedShoe, setSelectedShoe] = useState(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState();

  const [loading, setLoading] = useState(false);

  // Frontend-only search
  const [searchTerm, setSearchTerm] = useState("");

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const response = await axios.put(
        `http://localhost:5000/api/update/${selectedShoe._id}`,
        {
          name: name,
          price: price,
          stock: stock,
        },
      );
      if (response.status === 200) {
        console.log("Update Succesfully");
        setShowModal(false);
        fetchShoes();
        setLoading(false);
      }
    } catch (e) {
      console.log(e);
      setLoading(false);
    }
  };
  const handleDeleteShoes = async (id) => {
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/delete/${id}`,
      );
      console.log("Delete Shoes!", response.data);
      fetchShoes();
    } catch (e) {
      console.error("Error deleting shoes", e);
    }
  };

  useEffect(() => {
    fetchShoes();
  }, []);

  const fetchShoes = async () => {
    try {
      const respond = await axios.get("http://localhost:5000/api/all");
      setShoes(respond.data);
    } catch (err) {
      alert("Error fetching shoes:", err);
    }
  };

  // Filter shoes using the search input
  const filteredShoes = shoes.filter((shoe) =>
    `${shoe._id} ${shoe.name} ${shoe.brand} ${shoe.gender} ${shoe.category}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="admin-page">
      <Container fluid className="admin-container">
        {/* Page Header */}
        <div className="admin-header">
          <h2 className="admin-title">INVENTORY</h2>

          <div className="admin-header-actions">
            {/* Search */}
            <div className="admin-search">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                size="sm"
                className="admin-search-icon"
              />
              <Form.Control
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Add Product */}
            <Link to="/shoes/add" className="admin-add-btn">
              <span className="admin-add-icon">+</span>
              Add Product
            </Link>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="admin-card">
          <div className="admin-table-wrap">
            <Table className="admin-table" responsive>
              <thead>
                <tr>
                  <th>Shoe ID</th>
                  <th>Shoe Name</th>
                  <th>Brand</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Stocks</th>
                  <th className="admin-th-actions">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredShoes.length > 0 ? (
                  filteredShoes.map((shoe) => (
                    <tr key={shoe._id}>
                      <td className="admin-cell-id">{shoe._id}</td>

                      <td className="admin-cell-name">{shoe.name}</td>

                      <td>{shoe.brand}</td>

                      <td className="admin-cell-price">₱{shoe.price}</td>

                      <td className="admin-cell-tag">{shoe.category}</td>

                      <td className="admin-cell-stock">{shoe.stock}</td>

                      <td className="admin-cell-actions">
                        <Button
                          className="admin-btn admin-btn-update"
                          onClick={() => {
                            setSelectedShoe(shoe);
                            setName(shoe.name);
                            setPrice(shoe.price);
                            setStock(shoe.stock);
                            setShowModal(true);
                          }}
                        >
                          Update
                        </Button>

                        <Button
                          variant="danger"
                          className="admin-btn admin-btn-delete"
                          onClick={() => handleDeleteShoes(shoe._id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="admin-empty">
                      No shoes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </Container>

      {/* Update Shoe Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        dialogClassName="admin-modal"
      >
        <Modal.Header closeButton className="admin-modal-header">
          <Modal.Title className="admin-modal-title">Update Shoe</Modal.Title>
        </Modal.Header>

        <Modal.Body className="admin-modal-body">
          <Form.Group className="admin-field">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="admin-field">
            <Form.Label>Price</Form.Label>
            <Form.Control
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="admin-field">
            <Form.Label>Stock</Form.Label>
            <Form.Control
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer className="admin-modal-footer">
          <Button
            className="admin-btn admin-btn-update"
            onClick={handleUpdate}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
