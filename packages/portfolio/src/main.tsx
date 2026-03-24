import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "@shared-ui/use-dark-mode";

initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);
