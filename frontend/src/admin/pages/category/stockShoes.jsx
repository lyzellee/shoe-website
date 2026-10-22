import { useState, useEffect } from "react";
import { Table, Button, Container, Modal, Form } from "react-bootstrap";
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

  return (
    <div className="admin-page">
      <Container fluid className="admin-container">
        {/* Page header */}
        <div className="admin-header">
          <div>
            <h4 className="admin-title">Stock Management</h4>
            <p className="admin-subtitle">{shoes.length} shoes in inventory</p>
          </div>
        </div>

        {/* Table card */}
        <div className="admin-card">
          <div className="admin-table-wrap">
            <Table striped bordered hover className="admin-table">
              <thead>
                <tr>
                  <th>Shoe ID</th>
                  <th>Shoe Name</th>
                  <th>Brand</th>
                  <th>Price</th>
                  <th>Gender</th>
                  <th>Category</th>
                  <th>Stocks</th>
                  <th className="admin-th-actions"> Function</th>
                </tr>
              </thead>
              <tbody>
                {shoes.map((shoe) => (
                  <tr key={shoe._id}>
                    <td className="admin-cell-id">{shoe._id}</td>
                    <td className="admin-cell-name">{shoe.name}</td>
                    <td>{shoe.brand}</td>
                    <td className="admin-cell-price">₱{shoe.price}</td>
                    <td className="admin-cell-tag">{shoe.gender}</td>
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
                        updates
                      </Button>
                      <Button
                        variant="danger"
                        className="admin-btn admin-btn-delete"
                        onClick={() => handleDeleteShoes(shoe._id)}
                      >
                        delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </Container>

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
