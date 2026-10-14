import { createRoot, hydrateRoot } from "react-dom/client";
import Root from "./Root.jsx";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing from index.html");

// The build prerenders the page into #root (so Google and link previews see
// every word). If it's there, attach to it; otherwise draw from scratch.
if (root.firstElementChild) hydrateRoot(root, <Root />);
else createRoot(root).render(<Root />);
