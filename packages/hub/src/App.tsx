import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ContractProvider } from "@/context/ContractContext";
import { I18nProvider, useI18n } from "@/i18n/I18nProvider";
import Layout from "@/components/Layout";

const Index = lazy(() => import("@/pages/Index"));
const Dashboard = lazy(() => import("@/pages/hub/Dashboard"));
const ContractsList = lazy(() => import("@/pages/contracts/ContractsList"));
const ContractDetail = lazy(() => import("@/pages/contracts/ContractDetail"));
const ContractForm = lazy(() => import("@/pages/contracts/ContractForm"));
const CalendarPage = lazy(() => import("@/pages/contracts/CalendarPage"));
const AlertsPage = lazy(() => import("@/pages/contracts/AlertsPage"));
const InsightsPage = lazy(() => import("@/pages/contracts/InsightsPage"));
const PortfolioPage = lazy(() => import("@/pages/portfolio/PortfolioPage"));
const PortfolioMonthlyInsightsPage = lazy(() => import("@/pages/portfolio/PortfolioMonthlyInsightsPage"));
const TripsPage = lazy(() => import("@/pages/trips/TripsPage"));
const WarrantiesPage = lazy(() => import("@/pages/warranties/WarrantiesPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const WorkInProgress = lazy(() => import("@/pages/WorkInProgress"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { t } = useI18n();

  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<div className="container py-10 text-sm text-muted-foreground">{t("app.loadingRoute")}</div>}>
          <Routes>
            {/* Hub */}
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Contracts */}
            <Route path="/contracts" element={<ContractsList />} />
            <Route path="/contracts/new" element={<ContractForm />} />
            <Route path="/contracts/edit/:id" element={<ContractForm />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/insights" element={<InsightsPage />} />

            {/* Portfolio */}
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/portfolio/insights" element={<PortfolioMonthlyInsightsPage />} />

            {/* Trips */}
            <Route path="/trips" element={<TripsPage />} />

            {/* Warranties */}
            <Route path="/warranties" element={<WarrantiesPage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Work in Progress */}
            <Route path="/home-expenses" element={<WorkInProgress />} />

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
        <ContractProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </ContractProvider>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
