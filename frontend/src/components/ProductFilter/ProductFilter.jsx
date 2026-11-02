import { Button, Dropdown, Navbar, Container } from "react-bootstrap";
import "./ProductFilter.css";

export default function ProductFilter({
  activeFilter,
  setActiveFilter,
  selectedCategory,
  setSelectedCategory,
  categories,
}) {
  // Capitalize category labels for display
  const formatLabel = (value) => {
    if (!value) return "";

    return value
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  return (
    <Navbar className="category-navbar">
      <Container>
        {/* ALL, POPULAR, AND NEW BUTTONS */}
        <div className="category-buttons">
          <Button
            className={`category-button ${
              activeFilter === "all" ? "active" : ""
            }`}
            onClick={() => setActiveFilter("all")}
          >
            All
          </Button>

          <Button
            className={`category-button ${
              activeFilter === "popular" ? "active" : ""
            }`}
            onClick={() => setActiveFilter("popular")}
          >
            Popular
          </Button>

          <Button
            className={`category-button ${
              activeFilter === "new" ? "active" : ""
            }`}
            onClick={() => setActiveFilter("new")}
          >
            New
          </Button>
        </div>

        {/* CATEGORY DROPDOWN */}
        <Dropdown>
          <Dropdown.Toggle className="category-dropdown">
            {selectedCategory === "all"
              ? "Category"
              : formatLabel(selectedCategory)}
          </Dropdown.Toggle>

          <Dropdown.Menu className="category-dropdown-option">
            <Dropdown.Item
              active={selectedCategory === "all"}
              onClick={() => setSelectedCategory("all")}
            >
              All Categories
            </Dropdown.Item>

            {categories.map((category) => (
              <Dropdown.Item
                key={category}
                active={
                  selectedCategory.toLowerCase() === category.toLowerCase()
                }
                onClick={() => setSelectedCategory(category)}
              >
                {formatLabel(category)}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </Container>
    </Navbar>
  );
}
