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

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-10 border-t border-card-border bg-card">
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
