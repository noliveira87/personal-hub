export const MONEY_PRIVACY_STORAGE_KEY = "personal-hub-hide-amounts";

const MONEY_PRIVACY_ATTRIBUTE = "data-hide-amounts";

export function getInitialHideAmounts(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MONEY_PRIVACY_STORAGE_KEY) === "true";
}

export function setHideAmountsPreference(hidden: boolean): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MONEY_PRIVACY_STORAGE_KEY, hidden ? "true" : "false");
  }

  if (typeof document !== "undefined") {
    document.documentElement.setAttribute(MONEY_PRIVACY_ATTRIBUTE, hidden ? "true" : "false");
  }
}

export function isHideAmountsEnabled(): boolean {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute(MONEY_PRIVACY_ATTRIBUTE);
    if (attr === "true") return true;
    if (attr === "false") return false;
  }

  if (typeof window !== "undefined") {
    return window.localStorage.getItem(MONEY_PRIVACY_STORAGE_KEY) === "true";
  }

  return false;
}

export function formatHiddenAmount(currency?: string): string {
  if (!currency) return "****";
  return `${currency} ****`;
}
