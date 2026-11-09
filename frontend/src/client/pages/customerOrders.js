const API_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
const ORDERS_STORAGE_KEY = "shoeHubOrders";

export const readSavedOrders = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveOrders = (orders) => {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
};

export const formatMoney = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));

export const formatOrderDate = (date) => {
  if (!date) return "Date unavailable";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";
  return parsedDate.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const getOrderDate = (order) => order.orderDate || order.createdAt;

export const getOrderReference = (order) =>
  order.orderReference || order._id || "Reference unavailable";

export const getItemShoe = (item) =>
  item?.shoeId && typeof item.shoeId === "object" ? item.shoeId : item || {};

export const getItemPrice = (item) =>
  Number(item?.price ?? getItemShoe(item)?.price ?? 0);

export const getItemCount = (order) =>
  (order.items || []).reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

export const getLineTotal = (item) =>
  getItemPrice(item) * Number(item?.quantity || 1);

const mergeOrderData = (savedOrder = {}, serverOrder = {}) => ({
  ...savedOrder,
  ...serverOrder,
  items: (serverOrder.items || savedOrder.items || []).map((serverItem, index) => {
    const savedItem = savedOrder.items?.[index] || {};
    const serverShoe = getItemShoe(serverItem);
    const savedShoe = getItemShoe(savedItem);
    return {
      ...savedItem,
      ...serverItem,
      shoeId: serverItem.shoeId
        ? { ...savedShoe, ...serverShoe }
        : savedItem.shoeId || serverItem.shoeId,
    };
  }),
});

export const addOrderToCart = (order) => {
  const parsedCart = JSON.parse(localStorage.getItem("cart") || "[]");
  if (!Array.isArray(parsedCart)) {
    throw new Error("Your cart data is invalid. Please clear it and try again.");
  }

  const nextCart = [...parsedCart];
  (order.items || []).forEach((item) => {
    const shoe = getItemShoe(item);
    if (!shoe._id) return;
    const size = item.size || "";
    const color = item.color || shoe.color || "";
    const existing = nextCart.find(
      (entry) => entry._id === shoe._id && entry.size === size && entry.color === color,
    );
    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + Number(item.quantity || 1);
    } else {
      nextCart.push({ ...shoe, size, color, quantity: Number(item.quantity || 1) });
    }
  });
  localStorage.setItem("cart", JSON.stringify(nextCart));
  window.dispatchEvent(new Event("cartUpdated"));
};

export const getProductImage = (shoe) => {
  const image = shoe?.image || shoe?.imageUrl || shoe?.img;
  if (!image) return "/product-images/product%201.png";
  if (/^https?:\/\//i.test(image)) return image;
  const baseUrl = API_URL.replace(/\/api\/?$/, "");
  return `${baseUrl}${image.startsWith("/") ? "" : "/"}${image}`;
};

export const loadCustomerOrders = async () => {
  const savedOrders = readSavedOrders();
  const references = [
    ...new Set(savedOrders.map((order) => order.orderReference).filter(Boolean)),
  ];

  if (!references.length) return { orders: savedOrders, live: true };

  const response = await fetch(`${API_URL}/customer-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ references }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to load your orders.");
  }
  if (!Array.isArray(data)) {
    throw new Error("The server returned an invalid order response.");
  }

  const savedByReference = new Map(
    savedOrders.map((order) => [order.orderReference, order]),
  );
  const liveOrders = data.map((order) =>
    mergeOrderData(savedByReference.get(order.orderReference), order),
  );
  const liveReferences = new Set(liveOrders.map((order) => order.orderReference));
  const mergedOrders = [
    ...liveOrders,
    ...savedOrders.filter((order) => !liveReferences.has(order.orderReference)),
  ];
  saveOrders(mergedOrders);
  return { orders: mergedOrders, live: true };
};

export const loadCustomerOrder = async (reference) => {
  const savedOrder = readSavedOrders().find(
    (order) => order.orderReference === reference,
  );
  let response;
  let data;
  try {
    response = await fetch(`${API_URL}/customer-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ references: [reference] }),
    });
    data = await response.json();
  } catch (requestError) {
    if (savedOrder) return { ...savedOrder, live: false };
    throw new Error(
      requestError.message || "Unable to connect to the order service.",
      { cause: requestError },
    );
  }

  if (!response.ok) {
    if (savedOrder) return { ...savedOrder, live: false };
    throw new Error(data.message || "Unable to load this order.");
  }
  if (!Array.isArray(data)) {
    throw new Error("The server returned an invalid order response.");
  }

  const liveOrder = data.find((order) => order.orderReference === reference);
  if (!liveOrder) {
    if (savedOrder) return { ...savedOrder, live: false };
    throw new Error("We couldn't find an order with that reference.");
  }

  const mergedOrder = mergeOrderData(savedOrder, liveOrder);
  const allOrders = readSavedOrders();
  const updatedOrders = [
    mergedOrder,
    ...allOrders.filter((order) => order.orderReference !== reference),
  ];
  saveOrders(updatedOrders);
  return { ...mergedOrder, live: true };
};

export const cancelCustomerOrder = async (reference, customerAccessToken) => {
  const response = await fetch(
    `${API_URL}/customer-orders/${encodeURIComponent(reference)}/cancel`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerAccessToken }),
    },
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to cancel this order.");
  }

  const allOrders = readSavedOrders();
  const updatedOrder = mergeOrderData(
    allOrders.find((order) => order.orderReference === reference),
    data.data,
  );
  saveOrders([
    updatedOrder,
    ...allOrders.filter((order) => order.orderReference !== reference),
  ]);
  return updatedOrder;
};

export const requestCustomerReturn = async (
  reference,
  customerAccessToken,
  reason,
) => {
  const response = await fetch(
    `${API_URL}/customer-orders/${encodeURIComponent(reference)}/return`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerAccessToken, reason }),
    },
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to send your return request.");
  }

  // Reload the order so items and shoe details stay populated
  return loadCustomerOrder(reference);
};