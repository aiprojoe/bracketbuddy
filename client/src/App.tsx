import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Bracket from "./pages/Bracket";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import SharedBracket from "./pages/SharedBracket";
import ChallengeInvite from "./pages/ChallengeInvite";
import ChallengeH2H from "./pages/ChallengeH2H";
import Challenges from "./pages/Challenges";
import Admin from "./pages/Admin";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/bracket"} component={Bracket} />
      <Route path={"/leaderboard"} component={Leaderboard} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/share/:token"} component={SharedBracket} />
      <Route path={"/challenges"} component={Challenges} />
      <Route path={"/challenge/invite/:token"} component={ChallengeInvite} />
      <Route path={"/challenge/:id/h2h"} component={ChallengeH2H} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
