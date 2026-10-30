export const addToCart = (shoe) => {
  const savedCart = localStorage.getItem("cart");
  const cart = savedCart ? JSON.parse(savedCart) : [];

  const existingShoe = cart.find((item) => item._id === shoe._id);

  if (existingShoe) {
    existingShoe.quantity += 1;
  } else {
    cart.push({
      ...shoe,
      quantity: 1,
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  return cart;
};

export const getCart = () => {
  const savedCart = localStorage.getItem("cart");

  return savedCart ? JSON.parse(savedCart) : [];
};
