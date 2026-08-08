// client/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // qui vanno le direttive Tailwind (@tailwind base/components/utilities)

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
