import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const App = () => (
  <BrowserRouter>
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-sm text-muted-foreground">
          Loading portfolio…
        </div>
      }
    >
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
