export interface TripFood {
  name: string;
  description?: string;
  image?: string;
  reviewUrl?: string;
}

export interface TripHotel {
  name: string;
  link?: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  cost?: number;
  confirmationNumber?: string;
  phone?: string;
}

export interface FlightLeg {
  from: string;
  to: string;
  departure: string;
  arrival: string;
  carrier?: string;
  flightNumber?: string;
}

export interface TripTravel {
  outbound: FlightLeg[];
  returnTrip: FlightLeg[];
  cost?: number;
}

export interface TripTicket {
  name: string;
  venue?: string;
  address?: string;
  seats?: string;
  cost?: number;
}

export interface TripExpense {
  label: string;
  amount: number;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  destinations?: string[];
  startDate: string;
  endDate: string;
  cost: number;
  photos: string[];
  hotels: TripHotel[];
  foods: TripFood[];
  notes: string;
  tags: string[];
  travel?: TripTravel;
  tickets?: TripTicket[];
  expenses?: TripExpense[];
  createdAt: string;
  updatedAt: string;
}

export function formatTripDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} - ${endDate}`;
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(start) + " - " + new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(end);
}
