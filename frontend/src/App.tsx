import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { BottomNav, SideNav } from "./components/BottomNav";
import { useCurrentUser } from "./lib/auth";
import { History } from "./pages/History";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Plan } from "./pages/Plan";
import { Settings } from "./pages/Settings";
import { Study } from "./pages/Study";
import { Workout } from "./pages/Workout";

function RequireAuth() {
  const { data: user, isPending, isError } = useCurrentUser();
  const { pathname } = useLocation();
  // Home is a dashboard and uses the full width; other pages read better narrower.
  const desktopWidth = pathname === "/" ? "md:max-w-[1040px]" : "md:max-w-[720px]";

  if (isPending) return <div className="min-h-screen bg-page" />;
  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-8 text-center text-[14px] text-ink-soft-62">
        Couldn't reach the server. Check that the backend is running.
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-page">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className={`mx-auto w-full max-w-[480px] flex-1 md:px-4 md:pt-4 lg:px-8 ${desktopWidth}`}>
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

function LoginRoute() {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return <div className="min-h-screen bg-page" />;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Home />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/study" element={<Study />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
