import { useState, useEffect } from "react";
import { Table, Button, Container, Modal, Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPen,
  faTrash,
  faRotateLeft,
  faSort,
  faFilter,
  faFileExcel,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import "./stockShoes.css";
// Works whether VITE_API_BASE_URL is "http://localhost:5000" or "http://localhost:5000/api"
const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/api\/?$/, "");
const API = `${API_ROOT}/api`;
/*import ListAllShoe from "./src/pages/category/listAllShoe";*/

export default function stockShoes() {
  const [shoes, setShoes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedShoe, setSelectedShoe] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [shoeToDelete, setShoeToDelete] = useState(null);
  const [inventoryView, setInventoryView] = useState("active");

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState();
  const [gender, setGender] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [sizes, setSizes] = useState("");
  const [description, setDescription] = useState("");
  const [productStatus, setProductStatus] = useState("");

  const [loading, setLoading] = useState(false);

  // Frontend-only search
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest-first");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const handleUpdate = async () => {
    if (Number(price) < 0 || Number(stock) < 0) {
      alert("Price and stock cannot be negative.");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API}/update/${selectedShoe._id}`,
        {
          name: name,
          brand: brand,
          price: price,
          stock: stock,
          gender: gender,
          category: category,
          color: color,
          sizes: sizes,
          description: description,
          productStatus: productStatus,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
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
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${API}/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setShowDeleteModal(false);
      setShoeToDelete(null);
      setLoading(false);
      fetchShoes();
    } catch (e) {
      console.error("Error deleting shoes", e);
      setLoading(false);
      alert(e.response?.data?.message || "Error deleting shoe.");
    }
  };

  const handleRestore = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API}/restore/${id}`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      fetchShoes();
    } catch (error) {
      console.error("Error restoring shoe", error);
      alert(error.response?.data?.message || "Error restoring shoe.");
    }
  };

  useEffect(() => {
    fetchShoes();
  }, [inventoryView]);

  const fetchShoes = async () => {
    try {
      const respond = await axios.get(
        inventoryView === "deleted" ? `${API}/all?deleted=true` : `${API}/all`,
      );
      setShoes(respond.data);
    } catch (err) {
      alert("Error fetching shoes:", err);
    }
  };

  const brands = [
    ...new Set(shoes.map((shoe) => shoe.brand).filter(Boolean)),
  ].sort();
  const categories = [
    ...new Set(shoes.map((shoe) => shoe.category).filter(Boolean)),
  ].sort();

  const filteredShoes = shoes
    .filter((shoe) =>
      `${shoe._id} ${shoe.name} ${shoe.brand} ${shoe.gender} ${shoe.category} ${shoe.color}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    )
    .filter((shoe) => !filterBrand || shoe.brand === filterBrand)
    .filter((shoe) => !filterCategory || shoe.category === filterCategory)
    .filter((shoe) => !filterGender || shoe.gender === filterGender)
    .sort((a, b) => {
      if (sortBy === "newest-first") {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === "oldest-first") {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
      }
      if (sortBy === "name-desc")
        return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "price-asc")
        return Number(a.price || 0) - Number(b.price || 0);
      if (sortBy === "price-desc")
        return Number(b.price || 0) - Number(a.price || 0);
      if (sortBy === "stock-asc")
        return Number(a.stock || 0) - Number(b.stock || 0);
      if (sortBy === "stock-desc")
        return Number(b.stock || 0) - Number(a.stock || 0);
      return (a.name || "").localeCompare(b.name || "");
    });

  const handleExportExcel = () => {
    const rows = filteredShoes.map((shoe) => ({
      "Shoe ID": shoe._id,
      "Shoe Name": shoe.name || "",
      Brand: shoe.brand || "",
      Price: shoe.price ?? "",
      Category: shoe.category || "",
      Gender: shoe.gender || "",
      Color: shoe.color || "",
      Sizes: Array.isArray(shoe.sizes) ? shoe.sizes.join(", ") : "",
      Stock: shoe.stock ?? 0,
      Status: inventoryView === "deleted" ? "Trashed" : "Active",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 26 },
      { wch: 24 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 10 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(
      workbook,
      `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

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
            <Link to="/admin/add" className="admin-add-btn">
              <span className="admin-add-icon">+</span>
              Add Product
            </Link>
          </div>
        </div>

        <div className="inventory-view-row">
          <div className="inventory-toolbar">
            <div className="inventory-toolbar-control">
              <button
                type="button"
                className={`inventory-tool-btn ${showSortMenu ? "active" : ""}`}
                onClick={() => {
                  setShowSortMenu((current) => !current);
                  setShowFilterMenu(false);
                }}
              >
                <FontAwesomeIcon icon={faSort} />
                Sort
              </button>
              {showSortMenu && (
                <div className="inventory-popover inventory-sort-popover">
                  <Form.Label>Sort inventory by</Form.Label>
                  <Form.Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest-first">Newest First</option>
                    <option value="oldest-first">Oldest First</option>
                    <option value="name-asc">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="stock-asc">Stock: Low to High</option>
                    <option value="stock-desc">Stock: High to Low</option>
                  </Form.Select>
                </div>
              )}
            </div>

            <div className="inventory-toolbar-control">
              <button
                type="button"
                className={`inventory-tool-btn ${
                  showFilterMenu ||
                  filterBrand ||
                  filterCategory ||
                  filterGender
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setShowFilterMenu((current) => !current);
                  setShowSortMenu(false);
                }}
              >
                <FontAwesomeIcon icon={faFilter} />
                Filter
              </button>
              {showFilterMenu && (
                <div className="inventory-popover inventory-filter-popover">
                  <div className="inventory-filter-grid">
                    <Form.Group>
                      <Form.Label>Brand</Form.Label>
                      <Form.Select
                        value={filterBrand}
                        onChange={(e) => setFilterBrand(e.target.value)}
                      >
                        <option value="">All brands</option>
                        {brands.map((brandName) => (
                          <option key={brandName} value={brandName}>
                            {brandName}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Category</Form.Label>
                      <Form.Select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                      >
                        <option value="">All categories</option>
                        {categories.map((categoryName) => (
                          <option key={categoryName} value={categoryName}>
                            {categoryName.charAt(0).toUpperCase() +
                              categoryName.slice(1)}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Gender</Form.Label>
                      <Form.Select
                        value={filterGender}
                        onChange={(e) => setFilterGender(e.target.value)}
                      >
                        <option value="">All genders</option>
                        <option value="men">Men</option>
                        <option value="women">Women</option>
                      </Form.Select>
                    </Form.Group>
                  </div>
                  <button
                    type="button"
                    className="inventory-clear-filter"
                    onClick={() => {
                      setFilterBrand("");
                      setFilterCategory("");
                      setFilterGender("");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="inventory-tool-btn inventory-export-btn"
              onClick={handleExportExcel}
            >
              <FontAwesomeIcon icon={faFileExcel} />
              Export
            </button>

            <button
              type="button"
              className={`inventory-trashed-btn ${
                inventoryView === "deleted" ? "active" : ""
              }`}
              onClick={() =>
                setInventoryView((current) =>
                  current === "deleted" ? "active" : "deleted",
                )
              }
            >
              <FontAwesomeIcon icon={faTrash} />
              With Trashed
            </button>
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
                  <th>Gender</th>
                  <th>Color</th>
                  <th>Sizes</th>
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

                      <td className="admin-cell-capitalize">
                        {shoe.gender || "-"}
                      </td>

                      <td>{shoe.color || "-"}</td>

                      <td className="admin-cell-sizes">
                        {Array.isArray(shoe.sizes) && shoe.sizes.length > 0
                          ? shoe.sizes.join(", ")
                          : "-"}
                      </td>

                      <td className="admin-cell-stock">{shoe.stock}</td>

                      <td className="admin-cell-actions">
                        {inventoryView === "deleted" ? (
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn-update"
                            onClick={() => handleRestore(shoe._id)}
                            title="Restore product"
                            aria-label={`Restore ${shoe.name}`}
                          >
                            <FontAwesomeIcon icon={faRotateLeft} />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="admin-icon-btn admin-icon-btn-update"
                              onClick={() => {
                                setSelectedShoe(shoe);
                                setName(shoe.name);
                                setBrand(shoe.brand || "");
                                setPrice(shoe.price);
                                setStock(shoe.stock);
                                setGender(shoe.gender || "");
                                setCategory(shoe.category || "");
                                setColor(shoe.color || "");
                                setSizes(
                                  Array.isArray(shoe.sizes)
                                    ? shoe.sizes.join(", ")
                                    : "",
                                );
                                setDescription(shoe.description || "");
                                setProductStatus(shoe.productStatus || "");
                                setShowModal(true);
                              }}
                              title="Update product"
                              aria-label={`Update ${shoe.name}`}
                            >
                              <FontAwesomeIcon icon={faPen} />
                            </button>

                            <button
                              type="button"
                              className="admin-icon-btn admin-icon-btn-delete"
                              onClick={() => {
                                setShoeToDelete(shoe);
                                setShowDeleteModal(true);
                              }}
                              title="Delete product"
                              aria-label={`Delete ${shoe.name}`}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="admin-empty">
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
            <Form.Label>Shoe ID</Form.Label>
            <Form.Control
              type="text"
              value={selectedShoe?._id || ""}
              readOnly
            />
          </Form.Group>

          <Form.Group className="admin-field">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              as="textarea"
              rows={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="admin-field">
            <Form.Label>Price</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
            />
          </Form.Group>

          <Form.Group className="admin-field">
            <Form.Label>Stock</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
            />
          </Form.Group>

          <Form.Group className="admin-field">
            <Form.Label>Brand</Form.Label>
            <Form.Control
              type="text"
              as="textarea"
              rows={2}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="admin-field">
            <Form.Label>Category</Form.Label>
            <Form.Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select category</option>
              <option value="running">Running</option>
              <option value="sports">Sports</option>
              <option value="casual">Casual</option>
              <option value="lifestyle">Lifestyle</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="admin-field">
            <Form.Label>Gender</Form.Label>
            <Form.Select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Select gender</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="admin-field">
            <Form.Label>Color</Form.Label>
            <Form.Control
              type="text"
              as="textarea"
              rows={2}
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="admin-field">
            <Form.Label>Sizes</Form.Label>
            <Form.Control
              type="text"
              as="textarea"
              rows={2}
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
              placeholder="4, 5, 6, 7"
            />
          </Form.Group>

          <Form.Group className="admin-field">
            <Form.Label>Product Status</Form.Label>
            <Form.Select
              value={productStatus}
              onChange={(e) => setProductStatus(e.target.value)}
            >
              <option value="">None</option>
              <option value="new">New</option>
              <option value="popular">Popular</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="admin-field admin-field-full">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

      <Modal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false);
          setShoeToDelete(null);
        }}
        centered
        dialogClassName="admin-delete-modal"
      >
        <Modal.Header closeButton className="admin-modal-header">
          <Modal.Title className="admin-modal-title">
            Delete Product
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="admin-delete-modal-body">
          <p>
            Are you sure you want to delete{" "}
            <strong>{shoeToDelete?.name || "this product"}</strong>?
          </p>
          <span>You can restore it later from With Trashed.</span>
        </Modal.Body>
        <Modal.Footer className="admin-modal-footer">
          <Button
            className="admin-delete-cancel-btn"
            onClick={() => {
              setShowDeleteModal(false);
              setShoeToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button
            className="admin-delete-confirm-btn"
            onClick={() => handleDeleteShoes(shoeToDelete._id)}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
