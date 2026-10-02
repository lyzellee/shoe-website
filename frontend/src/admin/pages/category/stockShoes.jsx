import { useState, useEffect } from "react";
import { Table, Button, Container } from "react-bootstrap";
import axios from "axios";


export default function showStock() {
  const [shoes, setShoes] = useState([]);


  useEffect(() => {
    fetchShoes();
  });


  const fetchShoes = async () => {
    try {
      const respond = await axios.get("http://localhost:5000/api/all");
      setShoes(respond.data);
    } catch (err) {
      alert("Error fetching shoes:", err);
    }
  };
  /*
  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/${id}`);
      setShoes(shoes.filter((shoes) => shoes._id !== id));
    } catch (err) {
      alert("Error deleting Shoe:", err);
    }
  };
  */
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
                <Button className="m-1" variant="primary">
                  update
                </Button>
                {/*
                <Button variant="danger" onClick={() => handleDelete(shoe._id)}>
                  delete
                </Button>
*/}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}





