import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
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
    <div className="flex min-h-screen flex-col bg-page">
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomNav />
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
