import { NavLink } from "react-router-dom";
import {
  DumbbellIcon,
  HistoryIcon,
  HomeIcon,
  PlanIcon,
  SettingsIcon,
  StudyIcon,
} from "./icons";

const tabs = [
  { to: "/", label: "Home", Icon: HomeIcon, end: true },
  { to: "/plan", label: "Plan", Icon: PlanIcon, end: false },
  { to: "/study", label: "Study", Icon: StudyIcon, end: false },
  { to: "/workout", label: "Workout", Icon: DumbbellIcon, end: false },
  { to: "/history", label: "History", Icon: HistoryIcon, end: false },
  { to: "/settings", label: "Settings", Icon: SettingsIcon, end: false },
];

/** Tab bar pinned to the bottom of the screen on phones; hidden on larger screens. */
export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-10 border-t border-card-border bg-card md:hidden">
      <div className="mx-auto flex max-w-[480px] items-stretch justify-between px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors ${
                isActive ? "text-ink" : "text-ink-soft-42"
              }`
            }
          >
            <Icon width={22} height={22} />
            <span className="text-[10.5px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Sidebar navigation for tablet and desktop widths; hidden on phones. */
export function SideNav() {
  return (
    <nav className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-card-border bg-card px-4 py-6 md:flex">
      <NavLink to="/" className="mb-8 flex items-center gap-3 px-2">
        <img src="/logo.jpg" alt="" className="h-11 w-11 rounded-xl object-cover" />
        <span className="font-display text-[20px] font-medium text-ink">Morning</span>
      </NavLink>
      <div className="flex flex-col gap-1">
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors ${
                isActive
                  ? "bg-accent/45 text-ink"
                  : "text-ink-soft-55 hover:bg-divider hover:text-ink"
              }`
            }
          >
            <Icon width={20} height={20} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
