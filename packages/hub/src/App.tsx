import { Suspense, lazy, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ContractProvider } from "@/features/contracts/context/ContractContext";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";
import Layout from "@/components/Layout";
import AppLoadingState from "@/components/AppLoadingState";
import { DataProvider } from "@/features/home-expenses/lib/DataContext";
import HomeExpensesLayout from "@/features/home-expenses/components/Layout";
import { hydrateContractAlertReadState } from "@/features/contracts/lib/alertReadState";

const Index = lazy(() => import("@/pages/Index"));
const Dashboard = lazy(() => import("@/pages/hub/Dashboard"));
const ContractsList = lazy(() => import("@/features/contracts/pages/ContractsList"));
const ContractDetail = lazy(() => import("@/features/contracts/pages/ContractDetail"));
const ContractForm = lazy(() => import("@/features/contracts/pages/ContractForm"));
const CalendarPage = lazy(() => import("@/features/contracts/pages/CalendarPage"));
const AlertsPage = lazy(() => import("@/features/contracts/pages/AlertsPage"));
const InsightsPage = lazy(() => import("@/features/contracts/pages/InsightsPage"));
const QuotesPage = lazy(() => import("@/features/contracts/pages/QuotesPage"));
const QuoteDetailPage = lazy(() => import("@/features/contracts/pages/QuoteDetailPage"));
const PaymentsBreakdownPage = lazy(() => import("@/features/contracts/pages/PaymentsBreakdownPage"));
const PortfolioPage = lazy(() => import("@/pages/portfolio/PortfolioPage"));
const PortfolioMonthlyInsightsPage = lazy(() => import("@/pages/portfolio/PortfolioMonthlyInsightsPage"));
const CashbackHeroPage = lazy(() => import("@/pages/CashbackHeroPage"));
const TripsPage = lazy(() => import("@/pages/trips/TripsPage"));
const JourneyBitesPage = lazy(() => import("@/pages/trips/JourneyBitesPage"));
const JourneyBitesMapPage = lazy(() => import("@/pages/trips/JourneyBitesMapPage"));
const JourneyBiteDetailPage = lazy(() => import("@/pages/trips/JourneyBiteDetailPage"));
const HealthPage = lazy(() => import("@/features/health/pages/HealthPage"));
const WarrantiesPage = lazy(() => import("@/pages/warranties/WarrantiesPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const HomeExpensesIndexPage = lazy(() => import("@/features/home-expenses/pages/Index"));
const HomeExpensesTransactionsPage = lazy(() => import("@/features/home-expenses/pages/Transactions"));
const HomeExpensesMonthlyPage = lazy(() => import("@/features/home-expenses/pages/Monthly"));
const HomeExpensesInsightsPage = lazy(() => import("@/features/home-expenses/pages/Insights"));
const HomeExpensesChecklistPage = lazy(() => import("@/features/home-expenses/pages/Checklist"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const HomeExpensesScope = () => (
  <DataProvider>
    <HomeExpensesLayout>
      <Outlet />
    </HomeExpensesLayout>
  </DataProvider>
);

const RepositoriesScope = () => (
  <ContractProvider>
    <Outlet />
  </ContractProvider>
);

const AppRoutes = () => {
  const { t } = useI18n();

  useEffect(() => {
    void hydrateContractAlertReadState();
  }, []);

  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<div className="container py-10"><AppLoadingState label={t("app.loadingRoute")} variant="dashboard" /></div>}>
          <Routes>
            {/* Hub */}
            <Route path="/" element={<Index />} />

            {/* All routes that need ContractProvider (Contracts, Dashboard, HomeExpenses, Reward Wallet) */}
            <Route element={<RepositoriesScope />}>
              {/* Dashboard (needs ContractProvider) */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Contracts */}
              <Route path="/contracts" element={<ContractsList />} />
              <Route path="/contracts/new" element={<ContractForm />} />
              <Route path="/contracts/edit/:id" element={<ContractForm />} />
              <Route path="/contracts/:id" element={<ContractDetail />} />
              <Route path="/contracts/calendar" element={<CalendarPage />} />
              <Route path="/contracts/alerts" element={<AlertsPage />} />
              <Route path="/contracts/insights" element={<InsightsPage />} />
              <Route path="/contracts/quotes" element={<QuotesPage />} />
              <Route path="/contracts/quotes/:id" element={<QuoteDetailPage />} />
              <Route path="/contracts/payments" element={<PaymentsBreakdownPage />} />

              {/* Home Expenses (needs ContractProvider for income from contracts) */}
              <Route element={<HomeExpensesScope />}>
                <Route path="/home-expenses" element={<HomeExpensesIndexPage />} />
                <Route path="/home-expenses/transactions" element={<HomeExpensesTransactionsPage />} />
                <Route path="/home-expenses/monthly" element={<HomeExpensesMonthlyPage />} />
                <Route path="/home-expenses/insights" element={<HomeExpensesInsightsPage />} />
                <Route path="/home-expenses/checklist" element={<HomeExpensesChecklistPage />} />
              </Route>

              {/* Reward Wallet (needs ContractProvider for optional home-expense linking) */}
              <Route path="/cashback-hero" element={<CashbackHeroPage />} />
            </Route>

            {/* Portfolio */}
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/portfolio/insights" element={<PortfolioMonthlyInsightsPage />} />

            {/* Trips */}
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/journey-bites" element={<JourneyBitesPage />} />
            <Route path="/journey-bites/map" element={<JourneyBitesMapPage />} />
            <Route path="/journey-bites/:id" element={<JourneyBiteDetailPage />} />

            {/* Health */}
            <Route path="/health" element={<HealthPage />} />

            {/* Warranties */}
            <Route path="/warranties" element={<WarrantiesPage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Not found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
