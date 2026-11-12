// Shared constants + helpers for the representative pages
// (used by RepresentativeDashboard and RepresentativeProductOrders)
export const STATUSES = ["pending", "processing", "shipped", "delivered"];
export const DAY = 24 * 60 * 60 * 1000;

export const RETURN_LABELS = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  refunded: "Refunded",
};

export const formatPrice = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    Number(value || 0),
  );

export const formatStatus = (status) =>
  status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : "Pending";

export const getOrderTime = (order) =>
  new Date(order.orderDate || order.createdAt || 0).getTime() || 0;

export const formatDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const getCustomerName = (order) =>
  order.customerInfo
    ? `${order.customerInfo.firstName || ""} ${order.customerInfo.lastName || ""}`.trim() ||
      "Customer"
    : "Customer";

export const getItemCount = (order) =>
  order.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) ||
  0;

export const getProductName = (item) =>
  (item.shoeId && item.shoeId.name) || item.name || "Product";