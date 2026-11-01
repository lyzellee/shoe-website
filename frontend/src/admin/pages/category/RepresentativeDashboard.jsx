import React from "react";

export default function RepresentativeHeader({
  name = "Representative",
  title = "Representative Dashboard",
}) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 1.5rem",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: "0.25rem 0 0 0",
            fontSize: "0.875rem",
            color: "#6b7280",
          }}
        >
          Welcome back,{" "}
          <span style={{ fontWeight: 600, color: "#374151" }}>{name}</span>.
          Here is an overview of your activity and performance metrics.
        </p>
      </div>
    </header>
  );
}
