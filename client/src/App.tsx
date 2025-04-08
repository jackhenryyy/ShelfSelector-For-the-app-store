import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import LandingPage from "@/pages/landing";
import HomePage from "@/pages/home";
import QueuePage from "@/pages/queue";
import NoSkipsPage from "@/pages/no-skips";
import ListPage from "@/pages/list";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LandingPage} />
      <Route path="/" component={HomePage} />
      <Route path="/queue" component={QueuePage} />
      <Route path="/no-skips" component={NoSkipsPage} />
      <Route path="/list" component={ListPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
