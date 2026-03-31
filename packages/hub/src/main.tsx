import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "@shared-ui/use-dark-mode";
import { setHideAmountsPreference } from "@/lib/moneyPrivacy";

initializeTheme();

// Initialize privacy toggle from localStorage
const hideAmounts = window.localStorage.getItem("personal-hub-hide-amounts") === "true";
setHideAmountsPreference(hideAmounts);

createRoot(document.getElementById("root")!).render(<App />);
