import { Trip, TripTicket } from "@/features/trips/types/trip";

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const FLIGHT_LABEL_REGEX = /(flight|flights|voo|voos)/i;

export const isFlightExpenseLabel = (label?: string) => FLIGHT_LABEL_REGEX.test((label ?? "").trim());

export const getTicketsTotal = (tickets?: TripTicket[]) =>
  (tickets ?? []).reduce((sum, ticket) => sum + toNumber(ticket.cost), 0);

export const getFlightsTotal = (trip?: Pick<Trip, "travel">) =>
  toNumber(trip?.travel?.cost);

export const withFlightsInExpenses = (trip: Pick<Trip, "expenses" | "travel">) => {
  const baseExpenses = [...(trip.expenses ?? [])];
  const flightsTotal = getFlightsTotal(trip);
  const hasFlightsExpense = baseExpenses.some((expense) => isFlightExpenseLabel(expense.label));

  if (flightsTotal > 0 && !hasFlightsExpense) {
    baseExpenses.unshift({ label: "Flights", amount: flightsTotal });
  }

  return baseExpenses;
};

export const getExpensesSubtotal = (trip: Pick<Trip, "expenses" | "hotels" | "travel">) => {
  if (trip.expenses && trip.expenses.length > 0) {
    const expensesBase = trip.expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
    const hasFlightsInsideExpenses = trip.expenses.some((expense) => isFlightExpenseLabel(expense.label));
    const flightsOutsideExpenses = hasFlightsInsideExpenses ? 0 : getFlightsTotal(trip);
    return expensesBase + flightsOutsideExpenses;
  }

  // Fallback for legacy rows that might not have merged expenses.
  return (trip.hotels ?? []).reduce((sum, hotel) => sum + toNumber(hotel.cost), 0) + getFlightsTotal(trip);
};

export const getComputedTripTotal = (trip: Pick<Trip, "expenses" | "hotels" | "travel" | "tickets">) => {
  const expensesSubtotal = getExpensesSubtotal(trip);
  return expensesSubtotal + getTicketsTotal(trip.tickets);
};

export const getTripTotal = (trip: Pick<Trip, "cost" | "expenses" | "hotels" | "travel" | "tickets">) => {
  const computed = getComputedTripTotal(trip);
  return computed > 0 ? computed : toNumber(trip.cost);
};
