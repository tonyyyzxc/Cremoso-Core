import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  HardDrive,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
  UtensilsCrossed,
} from "lucide-react";

const STAFF_NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    available: true,
  },
  { id: "new-order", label: "New Order", icon: ShoppingCart, available: true },
  {
    id: "order-queue",
    label: "Order Queue",
    icon: ClipboardList,
    available: true,
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: ShoppingBag,
    available: true,
  },
  { id: "schedule", label: "Schedule", icon: CalendarDays, available: true },
  { id: "activity-logs", label: "Activity Logs", icon: History, available: true },
];

const BRANCH_NAV_ITEMS = [
  ...STAFF_NAV_ITEMS,
  { id: "reports", label: "Reports", icon: BarChart3, available: true },
  { id: "schedule", label: "Schedule", icon: CalendarDays, available: true },
  {
    id: "reconciliation",
    label: "Shift Reconciliation",
    icon: ClipboardCheck,
    available: true,
  },
  { id: "staff", label: "Staff", icon: Users, available: true },
  { id: "drive", label: "YourDrive", icon: HardDrive, available: true },
  { id: "menu", label: "Menu", icon: UtensilsCrossed, available: true },
];

const ADMIN_NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    available: true,
  },
  { id: "orders", label: "Orders", icon: ShoppingBag, available: true },
  { id: "reports", label: "Reports", icon: BarChart3, available: true },
  { id: "schedule", label: "Schedule", icon: CalendarDays, available: true },
  { id: "menu", label: "Menu", icon: UtensilsCrossed, available: true },
  { id: "management", label: "Management", icon: Users, available: true },
  { id: "activity-logs", label: "Activity Logs", icon: History, available: true },
  { id: "drive", label: "YourDrive", icon: HardDrive, available: true },
];

export default function SidebarNav({
  activeId,
  onSelect,
  onLogout,
  userRole,
  collapsed,
  mobileOpen,
  showIcons,
}) {
  const navItems = {
    admin: ADMIN_NAV_ITEMS,
    branch: BRANCH_NAV_ITEMS,
    staff: STAFF_NAV_ITEMS,
  }[userRole?.toLowerCase()] || [];
  const iconRail = collapsed && showIcons;
  const labelsHidden = collapsed;
  const fullyCollapsed = collapsed && !showIcons;
  const hiddenOnMobile = !mobileOpen;

  return (
    <aside
      inert={fullyCollapsed || hiddenOnMobile}
      aria-hidden={fullyCollapsed || hiddenOnMobile || undefined}
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-hidden bg-white shadow-[inset_-1px_0_0_#e5e7eb] transition-transform duration-300 ease-in-out motion-reduce:transition-none md:relative md:inset-auto md:z-auto md:h-full md:shrink-0 md:translate-x-0 md:transition-[width] xl:duration-300 ${
        hiddenOnMobile ? "-translate-x-full" : "translate-x-0"
      } ${
        collapsed
          ? showIcons
            ? "md:w-18"
            : "md:w-0 md:shadow-none"
          : "md:w-64"
      } dark:bg-neutral-900 dark:shadow-[inset_-1px_0_0_#262626]`}
    >
      <div className="flex shrink-0 items-center gap-3 px-3 py-5">
        <div className="flex h-10 w-12 shrink-0 items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A8B8E]">
            <img
              src="/android-chrome-512x512.png"
              alt="Cremoso icon"
              className="h-6 w-6 brightness-0 invert"
            />
          </div>
        </div>
        <span
          aria-hidden={labelsHidden || undefined}
          className={`overflow-hidden whitespace-nowrap font-serif text-xl font-bold tracking-wide text-[#0A3B3D] transition-opacity duration-200 motion-reduce:transition-none dark:text-white ${
            labelsHidden ? "opacity-0" : "opacity-100 delay-100"
          }`}
        >
          CREMOSO
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Main navigation">
        {navItems.map(({ id, label, icon: Icon, available = false }) => {
          const isActive = id === activeId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              disabled={!available}
              title={iconRail ? label : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`relative grid w-full grid-cols-[30px_minmax(0,1fr)] items-center rounded-xl py-2.5 pl-3 pr-6 text-left text-sm transition ${
                isActive
                  ? "bg-[#0A8B8E]/10 font-medium text-[#0A8B8E]"
                  : available
                    ? "text-gray-600 hover:bg-[#FBF6EF] hover:text-[#0A3B3D] dark:text-gray-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    : "cursor-not-allowed text-gray-400 dark:text-neutral-600"
              }`}
            >
              <Icon
                size={18}
                className="shrink-0 -translate-x-1 justify-self-center"
              />
              <span
                aria-hidden={labelsHidden || undefined}
                className={`min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none ${
                  labelsHidden ? "opacity-0" : "opacity-100 delay-100"
                }`}
              >
                {label}
              </span>
              <span
                aria-hidden="true"
                className={`absolute right-3 h-1.5 w-1.5 rounded-full bg-[#F2C879] transition-opacity duration-150 motion-reduce:transition-none ${
                  isActive && !iconRail ? "opacity-100" : "opacity-0"
                }`}
              />
            </button>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-1 px-3 py-3 shadow-[inset_0_1px_0_#e5e7eb] dark:shadow-[inset_0_1px_0_#262626]">
        <button
          type="button"
          onClick={() => onSelect("settings")}
          title={iconRail ? "Settings" : undefined}
          aria-current={activeId === "settings" ? "page" : undefined}
          className={`grid w-full grid-cols-[30px_minmax(0,1fr)] items-center rounded-xl py-2.5 pl-3 text-left text-sm transition ${
            activeId === "settings"
              ? "bg-[#0A8B8E]/10 font-medium text-[#0A8B8E]"
              : "text-gray-600 hover:bg-[#FBF6EF] hover:text-[#0A3B3D] dark:text-gray-300 dark:hover:bg-neutral-800 dark:hover:text-white"
          }`}
        >
          <Settings
            size={18}
            className="shrink-0 -translate-x-1 justify-self-center"
          />
          <span
            aria-hidden={labelsHidden || undefined}
            className={`min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none ${
              labelsHidden ? "opacity-0" : "opacity-100 delay-100"
            }`}
          >
            Settings
          </span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          title={iconRail ? "Log out" : undefined}
          className="grid w-full grid-cols-[30px_minmax(0,1fr)] items-center rounded-xl py-2.5 pl-3 text-left text-sm text-gray-600 transition hover:bg-[#FBF6EF] hover:text-[#0A3B3D] dark:text-gray-300 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          <LogOut
            size={18}
            className="shrink-0 -translate-x-1 justify-self-center"
          />
          <span
            aria-hidden={labelsHidden || undefined}
            className={`min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none ${
              labelsHidden ? "opacity-0" : "opacity-100 delay-100"
            }`}
          >
            Log out
          </span>
        </button>
      </div>
    </aside>
  );
}
