import { Trip } from "@/features/trips/types/trip";
import { motion } from "framer-motion";
import { MapPin, Calendar, Plane, Hotel as HotelIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface TripCardProps {
  trip: Trip;
  onClick: () => void;
  index: number;
}

export function TripCard({ trip, onClick, index }: TripCardProps) {
  const photos = trip.photos.slice(0, 4);
  const days = differenceInDays(new Date(trip.endDate), new Date(trip.startDate));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      onClick={onClick}
      className="group cursor-pointer rounded-3xl overflow-hidden bg-card shadow-sm hover:shadow-2xl transition-all duration-500 border border-border/30"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {photos.length >= 4 ? (
          <div className="grid grid-cols-2 grid-rows-2 h-full gap-[2px]">
            {photos.map((photo, i) => (
              <div key={i} className="overflow-hidden">
                <img src={photo} alt={`${trip.title} ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy" />
              </div>
            ))}
          </div>
        ) : photos.length >= 2 ? (
          <div className="grid grid-cols-2 h-full gap-[2px]">
            {photos.slice(0, 2).map((photo, i) => (
              <div key={i} className="overflow-hidden">
                <img src={photo} alt={`${trip.title} ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy" />
              </div>
            ))}
          </div>
        ) : photos[0] ? (
          <img src={photos[0]} alt={trip.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <MapPin className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/45 to-transparent" />

      </div>

      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-1">
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
          {trip.title}
        </h3>
        <p className="text-muted-foreground font-body text-sm mt-1.5 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {trip.destination}
        </p>

        {trip.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {trip.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-body font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-secondary text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(trip.startDate), "MMM yyyy")}
          </span>
          {days > 0 && (
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{days} dias</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {trip.travel && <Plane className="h-3.5 w-3.5" />}
          {trip.hotels.length > 0 && <HotelIcon className="h-3.5 w-3.5" />}
          {trip.cost > 0 ? (
            <span className="font-semibold text-foreground">{trip.cost.toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€</span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
