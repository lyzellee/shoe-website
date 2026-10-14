import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function ShoeDetails() {
  const { id } = useParams();

  const [shoe, setShoe] = useState(null);

  useEffect(() => {
    const fetchSingleShoe = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/single/${id}`,
        );

        setShoe(response.data);
      } catch (error) {
        console.error("Error fetching shoe:", error);
      }
    };

    fetchSingleShoe();
  }, [id]);

  if (!shoe) {
    return <p>Loading shoe details...</p>;
  }

  return (
    <div>
      <img src={shoe.image} alt={shoe.name} width="300" />

      <h1>{shoe.name}</h1>
      <h3>₱{shoe.price}</h3>
      <p>{shoe.brand}</p>
      <p>{shoe.category}</p>

      <button>Add to Cart</button>
    </div>
  );
}
