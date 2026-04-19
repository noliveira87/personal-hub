import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeTheme } from "@shared-ui/use-dark-mode";
import { setHideAmountsPreference } from "@/lib/moneyPrivacy";

initializeTheme();

// Initialize privacy toggle from localStorage
const hideAmounts = window.localStorage.getItem("personal-hub-hide-amounts") === "true";
setHideAmountsPreference(hideAmounts);

const NO_LISTENER_REGEX = /No Listener:\s*tabs:outgoing\.message\.ready/i;

function getErrorLikeMessage(value: unknown): string {
	if (typeof value === "string") return value;
	if (value && typeof value === "object" && "message" in value) {
		return String((value as { message?: unknown }).message ?? "");
	}
	return "";
}

window.addEventListener("unhandledrejection", (event) => {
	const message = getErrorLikeMessage(event.reason);

	if (NO_LISTENER_REGEX.test(message)) {
		event.preventDefault();
	}
});

window.addEventListener(
	"error",
	(event) => {
		const message = getErrorLikeMessage(event.error) || event.message || "";
		if (NO_LISTENER_REGEX.test(message)) {
			event.preventDefault();
		}
	},
	true,
);

createRoot(document.getElementById("root")!).render(<App />);
