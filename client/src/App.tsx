import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

import HomePage from "@/pages/home";
import QueuePage from "@/pages/queue";
import NoSkipsPage from "@/pages/no-skips";
import ListPage from "@/pages/list";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import SharedNoSkipsPage from "@/pages/shared-no-skips";
import EmbedListPage from "@/pages/embed-list";
import SupportPage from "@/pages/support";
import Top25Page, { Top25YearPage, SharedTop25Page } from "@/pages/top25";
import SpotifySuccessPage from "@/pages/spotify-success";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

function ProtectedTop25Year({ params }: { params: { year: string } }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 animate-spin border-2 border-black border-t-transparent rounded-full" /></div>;
  if (!user) return <Redirect to="/auth" />;
  return <Top25YearPage params={params} />;
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/queue" component={QueuePage} />
      <ProtectedRoute path="/no-skips" component={NoSkipsPage} />
      <ProtectedRoute path="/list" component={ListPage} />
      <ProtectedRoute path="/top25" component={Top25Page} />
      <Route path="/top25/:year" component={ProtectedTop25Year} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/spotify-success" component={SpotifySuccessPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/shared/top25/:token" component={SharedTop25Page} />
      <Route path="/shared/:userId" component={SharedNoSkipsPage} />
      <Route path="/embed/list/:token" component={EmbedListPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
