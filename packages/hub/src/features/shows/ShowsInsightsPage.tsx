import { useEffect, useMemo, useState } from "react";
import { BarChart3, Calendar, MapPin, Star } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppSectionHeader from "@/components/AppSectionHeader";
import AppLoadingState from "@/components/AppLoadingState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nProvider";
import { chartAxisTickStyleCompact, chartTooltipContentStyle, chartTooltipItemStyle, chartTooltipLabelStyle } from "@/lib/chartTheme";
import { Show, loadShows } from "@/lib/shows";

const getTodayLocalIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const hasShowHappened = (showDate: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(showDate)) return false;
  return showDate < getTodayLocalIsoDate();
};

export default function ShowsInsightsPage() {
  const { t, formatDate, locale } = useI18n();

  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { items, setupRequired } = await loadShows();
      setShows(items);
      setSetupRequired(setupRequired);
      setIsLoading(false);
    };

    void fetchData();
  }, []);

  const availableYears = useMemo(() => {
    return Array.from(
      new Set(
        shows
          .map((show) => show.date.slice(0, 4))
          .filter((year) => /^\d{4}$/.test(year))
      )
    ).sort((a, b) => b.localeCompare(a));
  }, [shows]);

  useEffect(() => {
    if (!availableYears.length) {
      setSelectedYear("");
      return;
    }

    if (!selectedYear || !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const yearShows = useMemo(() => {
    if (!selectedYear) return [];

    return shows
      .filter((show) => show.date.startsWith(`${selectedYear}-`))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [shows, selectedYear]);

  const insightsStats = useMemo(() => {
    const total = yearShows.length;
    const happened = yearShows.filter((show) => hasShowHappened(show.date)).length;
    const upcoming = total - happened;
    const uniqueVenues = new Set(yearShows.map((show) => show.venue.trim()).filter(Boolean));
    const uniqueCities = new Set(yearShows.map((show) => show.city.trim()).filter(Boolean));

    const venueCount = new Map<string, number>();
    const cityCount = new Map<string, number>();
    const monthCount = new Map<number, number>();

    for (const show of yearShows) {
      const venue = show.venue.trim();
      const city = show.city.trim();

      if (venue) {
        venueCount.set(venue, (venueCount.get(venue) ?? 0) + 1);
      }

      if (city) {
        cityCount.set(city, (cityCount.get(city) ?? 0) + 1);
      }

      const monthIndex = Number(show.date.slice(5, 7)) - 1;
      if (Number.isInteger(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
        monthCount.set(monthIndex, (monthCount.get(monthIndex) ?? 0) + 1);
      }
    }

    const pickTop = (counter: Map<string, number>) => {
      return Array.from(counter.entries()).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0], undefined, { sensitivity: "base" });
      })[0];
    };

    const monthFormatter = new Intl.DateTimeFormat(locale, { month: "short" });
    const monthlyBreakdown = Array.from({ length: 12 }, (_, monthIndex) => ({
      monthIndex,
      label: monthFormatter.format(new Date(2026, monthIndex, 1)),
      count: monthCount.get(monthIndex) ?? 0,
    })).filter((entry) => entry.count > 0);

    return {
      total,
      happened,
      upcoming,
      venues: uniqueVenues.size,
      cities: uniqueCities.size,
      topVenue: pickTop(venueCount),
      topCity: pickTop(cityCount),
      monthlyBreakdown,
    };
  }, [yearShows, locale]);

  const monthlyChartData = useMemo(() => {
    const monthlyCountMap = new Map<number, number>();

    for (const show of yearShows) {
      const monthIndex = Number(show.date.slice(5, 7)) - 1;
      if (Number.isInteger(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
        monthlyCountMap.set(monthIndex, (monthlyCountMap.get(monthIndex) ?? 0) + 1);
      }
    }

    const monthFormatter = new Intl.DateTimeFormat(locale, { month: "short" });

    return Array.from({ length: 12 }, (_, monthIndex) => ({
      monthIndex,
      month: monthFormatter.format(new Date(2026, monthIndex, 1)),
      count: monthlyCountMap.get(monthIndex) ?? 0,
    }));
  }, [yearShows, locale]);

  const monthlyChartSeries = useMemo(() => {
    return monthlyChartData
      .map((entry) => ({
        month: entry.month || "",
        count: Number.isFinite(entry.count) ? entry.count : 0,
      }))
      .filter((entry) => entry.month.length > 0);
  }, [monthlyChartData]);

  const hasMonthlyData = monthlyChartData.some((item) => item.count > 0);

  if (isLoading) {
    return <AppLoadingState label={t("common.loading")} variant="cards" />;
  }

  if (setupRequired) {
    return (
      <>
        <AppSectionHeader icon={BarChart3} title={t("shows.insights.title")} backTo="/shows" backLabel={t("shows.title")} />
        <div className="h-16" aria-hidden="true" />
        <div className="container max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-900">{t("shows.setup.title")}</CardTitle>
              <CardDescription className="text-yellow-800">{t("shows.setup.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-yellow-700">{t("shows.setup.helper")}</p>
              <ul className="ml-2 list-inside list-disc space-y-1 text-sm text-yellow-700">
                <li>{t("shows.setup.bucketItem")}</li>
                <li>{t("shows.setup.tableItem")}</li>
                <li>{t("shows.setup.schemaItem")}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AppSectionHeader icon={BarChart3} title={t("shows.insights.title")} backTo="/shows" backLabel={t("shows.title")} />
      <div className="h-16" aria-hidden="true" />

      <main className="container max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <Card className="rounded-3xl border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-balance">{t("shows.insights.title")}</CardTitle>
              <CardDescription className="text-muted-foreground/90">{t("shows.insights.subtitle")}</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:max-w-xs">
              <label htmlFor="shows-insights-year" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("shows.insights.yearLabel")}
              </label>
              <select
                id="shows-insights-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                disabled={availableYears.length === 0}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 sm:space-y-4">
            {yearShows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("shows.insights.noData")}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                  <div className="rounded-2xl border border-border/70 bg-background/90 px-3 py-2.5 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground">{t("shows.insights.totalShows")}</p>
                    <p className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">{insightsStats.total}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/90 px-3 py-2.5 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground">{t("shows.insights.happened")}</p>
                    <p className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">{insightsStats.happened}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/90 px-3 py-2.5 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground">{t("shows.insights.upcoming")}</p>
                    <p className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">{insightsStats.upcoming}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/90 px-3 py-2.5 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground">{t("shows.insights.cities")}</p>
                    <p className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">{insightsStats.cities}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/90 px-3 py-2.5 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground">{t("shows.insights.venues")}</p>
                    <p className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">{insightsStats.venues}</p>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                  <div className="rounded-2xl border border-border/70 bg-background/90 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">{t("shows.insights.topVenue")}</p>
                    <p className="mt-0.5 text-sm font-medium">
                      {insightsStats.topVenue
                        ? t("shows.insights.topValue", { name: insightsStats.topVenue[0], count: insightsStats.topVenue[1] })
                        : t("shows.insights.topValueEmpty")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/90 px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">{t("shows.insights.topCity")}</p>
                    <p className="mt-0.5 text-sm font-medium">
                      {insightsStats.topCity
                        ? t("shows.insights.topValue", { name: insightsStats.topCity[0], count: insightsStats.topCity[1] })
                        : t("shows.insights.topValueEmpty")}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/90 px-3 py-2.5 sm:p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{t("shows.insights.monthlyBreakdown")}</p>
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {selectedYear || "-"}
                    </span>
                  </div>

                  {hasMonthlyData ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyChartSeries} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.55)" />
                          <XAxis
                            dataKey="month"
                            tick={chartAxisTickStyleCompact}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => String(value ?? "")}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={chartAxisTickStyleCompact}
                            axisLine={false}
                            tickLine={false}
                            width={26}
                            tickFormatter={(value) => String(value ?? 0)}
                          />
                          <Tooltip
                            contentStyle={chartTooltipContentStyle}
                            labelStyle={chartTooltipLabelStyle}
                            itemStyle={chartTooltipItemStyle}
                            labelFormatter={(label) => String(label ?? "")}
                            formatter={(value) => [String(value ?? 0), t("shows.insights.tooltipLabel")]}
                          />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 2, 2]} maxBarSize={34} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("shows.insights.noMonthData")}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {insightsStats.monthlyBreakdown.map((entry) => (
                      <span key={entry.monthIndex} className="inline-flex items-center rounded-full border border-border/70 bg-muted px-2.5 py-1 text-xs">
                        {t("shows.insights.monthlyItem", { month: entry.label, count: entry.count })}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>{t("shows.insights.listTitle", { year: selectedYear })}</CardTitle>
            <CardDescription>{t("shows.insights.listSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {yearShows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("shows.insights.noData")}</p>
            ) : (
              <div className="space-y-2">
                {yearShows.map((show) => {
                  const happened = hasShowHappened(show.date);

                  return (
                    <div key={show.id} className="rounded-xl border border-border/70 bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium leading-tight">{show.title}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(show.date)}
                          </p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-2.5 py-1 text-xs font-medium">
                          {happened ? t("shows.status.happened") : t("shows.status.upcoming")}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5" />
                          {show.venue}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {show.city}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
