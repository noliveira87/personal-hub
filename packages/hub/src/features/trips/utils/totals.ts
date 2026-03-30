import { Trip, TripTicket } from "@/features/trips/types/trip";

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getTicketsTotal = (tickets?: TripTicket[]) =>
  (tickets ?? []).reduce((sum, ticket) => sum + toNumber(ticket.cost), 0);

export const getFlightsTotal = (trip?: Pick<Trip, "travel">) =>
  toNumber(trip?.travel?.cost);

export const getExpensesSubtotal = (trip: Pick<Trip, "expenses" | "hotels">) => {
  if (trip.expenses && trip.expenses.length > 0) {
    return trip.expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  }

  // Fallback for legacy rows that might not have merged expenses.
  return (trip.hotels ?? []).reduce((sum, hotel) => sum + toNumber(hotel.cost), 0);
};

export const getComputedTripTotal = (trip: Pick<Trip, "expenses" | "hotels" | "travel" | "tickets">) =>
  getExpensesSubtotal(trip) + getFlightsTotal(trip) + getTicketsTotal(trip.tickets);

export const getTripTotal = (trip: Pick<Trip, "cost" | "expenses" | "hotels" | "travel" | "tickets">) => {
  const computed = getComputedTripTotal(trip);
  return computed > 0 ? computed : toNumber(trip.cost);
};
