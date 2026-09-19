import React from "react";
import { createRoot } from "react-dom/client";

import { Gallery } from "./Gallery";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");
createRoot(root).render(
  <React.StrictMode>
    <Gallery />
  </React.StrictMode>
);
