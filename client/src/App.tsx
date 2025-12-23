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
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/queue" component={QueuePage} />
      <ProtectedRoute path="/no-skips" component={NoSkipsPage} />
      <ProtectedRoute path="/list" component={ListPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/shared/:userId" component={SharedNoSkipsPage} />
      <Route path="/embed/list/:token" component={EmbedListPage} />
      <ProtectedRoute path="/settings" component={Settings} />
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