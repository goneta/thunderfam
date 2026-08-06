import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import ClientPortal from "./pages/ClientPortal";
import AdminPortal from "./pages/AdminPortal";
import QuotesPage from "./pages/QuotesPage";
import QuoteEditor from "./pages/QuoteEditor";
import InvoicesPage from "./pages/InvoicesPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/portal" component={ClientPortal} />
      <Route path="/admin" component={AdminPortal} />
      {/* Module de gestion documentaire — devis et factures */}
      <Route path="/devis" component={QuotesPage} />
      <Route path="/devis/nouveau" component={QuoteEditor} />
      <Route path="/devis/:id" component={QuoteEditor} />
      <Route path="/factures" component={InvoicesPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
