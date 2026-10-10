import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { SITE } from "./config.js";
import "./styles.css";

// If anything ever crashes, visitors still see how to reach the business.
class SafetyNet extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(err) {
    console.error("[site] render error:", err);
  }
  render() {
    if (!this.state.crashed) return this.props.children;
    const tel = "tel:" + SITE.phone.replace(/[^\d+]/g, "");
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", marginBottom: "1rem" }}>{SITE.company}</h1>
          <p style={{ color: "#9CA3AF", marginBottom: "1.5rem" }}>Something went wrong loading this page. Reach us directly:</p>
          <p style={{ fontSize: "1.1rem", lineHeight: 2 }}>
            <a href={tel} style={{ color: "#60A5FA" }}>{SITE.phone}</a>
            <br />
            <a href={"mailto:" + SITE.email} style={{ color: "#60A5FA" }}>{SITE.email}</a>
          </p>
        </div>
      </div>
    );
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing from index.html");

createRoot(root).render(
  <React.StrictMode>
    <SafetyNet>
      <App />
    </SafetyNet>
  </React.StrictMode>
);
