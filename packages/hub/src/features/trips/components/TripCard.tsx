import { Trip } from "@/features/trips/types/trip";
import { useI18n } from "@/i18n/I18nProvider";
import { motion } from "framer-motion";
import { MapPin, Calendar, Plane, Hotel as HotelIcon } from "lucide-react";
import { differenceInDays } from "date-fns";
import { optimizeTripPhotoUrl } from "@/features/trips/utils/photo-url";
import { getLocalizedTripDestination, getLocalizedTripTitle } from "@/features/trips/utils/locations";
import { getTripTotal } from "@/features/trips/utils/totals";

interface TripCardProps {
  trip: Trip;
  biteThumbnails?: string[];
  onClick: () => void;
  index: number;
  prioritizeImage?: boolean;
}

export function TripCard({ trip, biteThumbnails = [], onClick, index, prioritizeImage = false }: TripCardProps) {
  const { t, formatMonthYear, formatCurrency, language } = useI18n();
  const photos = trip.photos.slice(0, 4);
  const days = differenceInDays(new Date(trip.endDate), new Date(trip.startDate));
  const isUpcoming = new Date(trip.startDate).getTime() > Date.now();
  const total = getTripTotal(trip);
  const localizedTitle = getLocalizedTripTitle(trip, language);
  const localizedDestination = getLocalizedTripDestination(trip.destination, language);

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
                <img
                  src={optimizeTripPhotoUrl(photo, { width: 600, quality: 68 })}
                  alt={`${localizedTitle} ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  loading={prioritizeImage && i === 0 ? "eager" : "lazy"}
                  fetchPriority={prioritizeImage && i === 0 ? "high" : "low"}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        ) : photos.length >= 2 ? (
          <div className="grid grid-cols-2 h-full gap-[2px]">
            {photos.slice(0, 2).map((photo, i) => (
              <div key={i} className="overflow-hidden">
                <img
                  src={optimizeTripPhotoUrl(photo, { width: 600, quality: 68 })}
                  alt={`${localizedTitle} ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  loading={prioritizeImage && i === 0 ? "eager" : "lazy"}
                  fetchPriority={prioritizeImage && i === 0 ? "high" : "low"}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        ) : photos[0] ? (
          <img
            src={optimizeTripPhotoUrl(photos[0], { width: 900, quality: 68 })}
            alt={localizedTitle}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            loading={prioritizeImage ? "eager" : "lazy"}
            fetchPriority={prioritizeImage ? "high" : "low"}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            decoding="async"
          />
        ) : isUpcoming ? (
          <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(160deg,hsl(var(--secondary))_0%,hsl(var(--background))_58%,hsl(var(--secondary)/0.85)_100%)]">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/30 via-white/10 to-transparent" />
            <div className="absolute -left-8 top-8 h-28 w-28 rounded-full bg-accent/18 blur-2xl" />
            <div className="absolute right-6 top-10 h-20 w-20 rounded-full bg-foreground/8 blur-2xl" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/55 to-transparent" />

            <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-background/35 px-3 py-1 text-[11px] font-body font-semibold uppercase tracking-[0.18em] text-foreground/80 backdrop-blur-sm">
                <Plane className="h-3.5 w-3.5" />
                {t("trips.upcoming")}
              </div>
              <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-background/35 text-foreground/70 backdrop-blur-sm">
                <MapPin className="h-7 w-7" />
              </div>
              <p className="mt-5 max-w-[14rem] font-display text-2xl font-semibold tracking-tight text-foreground/90">
                {localizedDestination}
              </p>
              <p className="mt-2 text-sm font-body text-foreground/60">
                {t("trips.upcomingSubtitle")}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <MapPin className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/45 to-transparent" />

      </div>

      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-1">
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
          {localizedTitle}
        </h3>
        <p className="text-muted-foreground font-body text-sm mt-1.5 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {localizedDestination}
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

        {biteThumbnails.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {biteThumbnails.slice(0, 4).map((thumbnail, imageIndex) => (
              <span
                key={`${trip.id}-bite-${imageIndex}`}
                className="h-8 w-8 overflow-hidden rounded-md border border-border/70 bg-secondary/40"
              >
                <img
                  src={thumbnail}
                  alt={`Journey bite ${imageIndex + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </span>
            ))}
            {biteThumbnails.length > 4 ? (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                +{biteThumbnails.length - 4}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatMonthYear(trip.startDate)}
          </span>
          {days > 0 && (
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{t(days === 1 ? "trips.tripsDurationOne" : "trips.tripsDurationMany", { count: days })}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {trip.travel && <Plane className="h-3.5 w-3.5" />}
          {trip.hotels.length > 0 && <HotelIcon className="h-3.5 w-3.5" />}
          {total > 0 ? (
            <span className="font-semibold text-foreground">{formatCurrency(total, "EUR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
