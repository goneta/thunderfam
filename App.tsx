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
import QuoteRoute from "./pages/QuoteRoute";
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceDetail from "./pages/InvoiceDetail";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/portal" component={ClientPortal} />
      <Route path="/admin" component={AdminPortal} />

      {/* Authentification par mot de passe. Les deux dernières URL
          doivent rester identiques aux liens construits dans
          authEmails.ts, sinon les e-mails mènent à une 404. */}
      <Route path="/connexion" component={LoginPage} />
      <Route path="/auth/reinitialiser" component={ResetPasswordPage} />
      <Route path="/auth/verifier-email" component={VerifyEmailPage} />

      {/* Module documentaire — devis et factures */}
      <Route path="/devis" component={QuotesPage} />
      <Route path="/devis/nouveau" component={QuoteEditor} />
      {/* Éditeur ou vue lecture seule, selon les droits réels
          de l'utilisateur (voir QuoteRoute). */}
      <Route path="/devis/:id" component={QuoteRoute} />
      <Route path="/factures" component={InvoicesPage} />
      <Route path="/factures/:id" component={InvoiceDetail} />

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
