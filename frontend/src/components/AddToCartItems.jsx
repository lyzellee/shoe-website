export const addToCart = (shoe) => {
  const savedCart = localStorage.getItem("cart");
  const cart = savedCart ? JSON.parse(savedCart) : [];

  const existingShoe = cart.find((item) => item._id === shoe._id);

  if (existingShoe) {
    existingShoe.quantity += 1;
    const updatedCart = [
      existingShoe,
      ...cart.filter((item) => item._id !== shoe._id),
    ];
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated"));
    return updatedCart;
  } else {
    cart.push({
      ...shoe,
      quantity: 1,
    });

    const updatedCart = [cart[cart.length - 1], ...cart.slice(0, -1)];
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated"));
    return updatedCart;
  }
};

export const getCart = () => {
  const savedCart = localStorage.getItem("cart");

  return savedCart ? JSON.parse(savedCart) : [];
};

// Remove a shoe from the cart
export const removeFromCart = (shoeId) => {
  const savedCart = localStorage.getItem("cart");
  const cart = savedCart ? JSON.parse(savedCart) : [];

  const updatedCart = cart.filter((item) => item._id !== shoeId);

  localStorage.setItem("cart", JSON.stringify(updatedCart));

  // Notify other components that the cart has changed
  window.dispatchEvent(new Event("cartUpdated"));

  return updatedCart;
};
