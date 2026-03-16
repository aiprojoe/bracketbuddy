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
import PrintBracket from "./pages/PrintBracket";
import Login from "./pages/Login";
import BracketView from "./pages/BracketView";
import UBSFooter from "./components/UBSFooter";

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
      <Route path={"/bracket/print"} component={PrintBracket} />
      <Route path={"/bracket/view/:bracketId"} component={BracketView} />
      <Route path={"/login"} component={Login} />
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
          <div className="flex flex-col min-h-screen">
            <Router />
            <UBSFooter />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
