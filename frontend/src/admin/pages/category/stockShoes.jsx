import { useState, useEffect } from "react";
import { Table, Button, Container, Modal, Form } from "react-bootstrap";
import axios from "axios";
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
    <Container
      className="p-3
    "
    >
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Shoe ID</th>
            <th>Shoe Name</th>
            <th>Brand</th>
            <th>Price</th>
            <th>Gender</th>
            <th>Category</th>
            <th> Function</th>
          </tr>
        </thead>
        <tbody>
          {shoes.map((shoe) => (
            <tr key={shoe._id}>
              <td>{shoe._id}</td>
              <td>{shoe.name}</td>
              <td>{shoe.brand}</td>
              <td>₱{shoe.price}</td>
              <td>{shoe.gender}</td>
              <td>{shoe.category}</td>
              <td>
                <Button
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
              </td>
              <td>
                <Button
                  variant="danger"
                  onClick={() => handleDeleteShoes(shoe._id)}
                >
                  delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Shoe</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {" "}
          <Form.Group>
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Price</Form.Label>
            <Form.Control
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Stock</Form.Label>
            <Form.Control
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? "Updating..." : "Update"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
