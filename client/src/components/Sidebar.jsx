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

const STAFF_NAV_GROUPS = [
  {
    label: "WORKSPACE",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        available: true,
      },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      {
        id: "new-order",
        label: "New Order",
        icon: ShoppingCart,
        available: true,
      },
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
      {
        id: "schedule",
        label: "Schedule",
        icon: CalendarDays,
        available: true,
      },
    ],
  },
  {
    label: "ACCOUNTABILITY",
    items: [
      {
        id: "activity-logs",
        label: "Activity Logs",
        icon: History,
        available: true,
      },
    ],
  },
];

const BRANCH_NAV_GROUPS = [
  {
    label: "WORKSPACE",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        available: true,
      },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      {
        id: "new-order",
        label: "New Order",
        icon: ShoppingCart,
        available: true,
      },
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
      {
        id: "schedule",
        label: "Schedule",
        icon: CalendarDays,
        available: true,
      },
      {
        id: "reconciliation",
        label: "Shift Reconciliation",
        icon: ClipboardCheck,
        available: true,
      },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { id: "reports", label: "Reports", icon: BarChart3, available: true },
      { id: "staff", label: "Staff", icon: Users, available: true },
      { id: "menu", label: "Menu", icon: UtensilsCrossed, available: true },
    ],
  },
  {
    label: "RESOURCES",
    items: [
      { id: "drive", label: "YourDrive", icon: HardDrive, available: true },
    ],
  },
];

const ADMIN_NAV_GROUPS = [
  {
    label: "WORKSPACE",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        available: true,
      },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { id: "orders", label: "Orders", icon: ShoppingBag, available: true },
      {
        id: "schedule",
        label: "Schedule",
        icon: CalendarDays,
        available: true,
      },
      { id: "reports", label: "Reports", icon: BarChart3, available: true },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { id: "menu", label: "Menu", icon: UtensilsCrossed, available: true },
      { id: "management", label: "Management", icon: Users, available: true },
    ],
  },
  {
    label: "RESOURCES",
    items: [
      {
        id: "activity-logs",
        label: "Activity Logs",
        icon: History,
        available: true,
      },
      { id: "drive", label: "YourDrive", icon: HardDrive, available: true },
    ],
  },
];

const SIDEBAR_ACTIONS = [
  { id: "settings", label: "Settings", icon: Settings },
  { id: "logout", label: "Log out", icon: LogOut },
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
  const navGroups =
    {
      admin: ADMIN_NAV_GROUPS,
      branch: BRANCH_NAV_GROUPS,
      staff: STAFF_NAV_GROUPS,
    }[userRole?.toLowerCase()] || [];
  const iconRail = collapsed && showIcons;
  const labelsHidden = iconRail;
  const fullyCollapsed = collapsed && !showIcons;
  const hiddenOnMobile = !mobileOpen;
  const itemLayout = iconRail
    ? "grid-cols-1 justify-items-center px-0"
    : "grid-cols-[32px_minmax(0,1fr)] pl-3 pr-4";

  return (
    <aside
      inert={fullyCollapsed || hiddenOnMobile}
      aria-hidden={fullyCollapsed || hiddenOnMobile || undefined}
      className={`fixed inset-y-0 left-0 z-50 flex w-64 min-w-0 flex-col overflow-hidden border-r border-border bg-card transition-transform duration-300 ease-in-out motion-reduce:transition-none md:relative md:inset-auto md:z-auto md:h-full md:shrink-0 md:translate-x-0 md:transition-[width] xl:duration-300 ${
        hiddenOnMobile ? "-translate-x-full" : "translate-x-0"
      } ${
        collapsed ? (showIcons ? "md:w-18" : "md:w-0 md:border-r-0") : "md:w-64"
      } dark:bg-neutral-900`}
    >
      <div
        className={`flex h-full shrink-0 flex-col overflow-hidden ${
          iconRail ? "w-18" : "w-64"
        }`}
      >
        <div
          className={`flex shrink-0 items-center gap-3 px-4 pb-5 pt-6 ${iconRail ? "justify-center px-2" : ""}`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-[0_5px_12px_rgba(11,138,138,0.22)] ring-1 ring-white/20 dark:bg-[#0A8B8E]">
              <img
                src="/android-chrome-512x512.png"
                alt="Cremoso icon"
                className="h-6 w-6 brightness-0 invert"
              />
            </div>
          </div>
          {!labelsHidden && (
            <div className="min-w-0 overflow-hidden whitespace-nowrap">
              <div className="font-serif text-lg font-bold tracking-[0.12em] text-primary-strong dark:text-white">
                CREMOSO
              </div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">
                Operations
              </div>
            </div>
          )}
        </div>

        <nav
          className={`min-h-0 flex-1 space-y-4 overflow-y-auto py-2 ${
            iconRail ? "px-2" : "px-3"
          }`}
          aria-label="Main navigation"
        >
          {navGroups.map(({ label: groupLabel, items }) => (
            <div key={groupLabel} className="space-y-1.5">
              {!labelsHidden && (
                <p className="px-4 pb-1 pt-2 text-[9px] font-bold tracking-[0.18em] text-muted/80">
                  {groupLabel}
                </p>
              )}
              {items.map(({ id, label, icon: Icon, available = false }) => {
                const isActive = id === activeId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelect(id)}
                    disabled={!available}
                    title={iconRail ? label : undefined}
                    aria-label={iconRail ? label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative grid min-h-10 w-full items-center rounded-xl text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none ${itemLayout} ${
                      isActive
                        ? "bg-primary/10 font-semibold text-primary-strong ring-1 ring-inset ring-primary/15 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-primary dark:bg-[#0A8B8E]/10 dark:text-white dark:ring-[#0A8B8E]/20"
                        : available
                          ? "text-muted hover:bg-background hover:text-primary-strong dark:text-gray-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                          : "cursor-not-allowed text-gray-400 dark:text-neutral-600"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`shrink-0 justify-self-center ${
                        isActive ? "text-primary dark:text-[#0A8B8E]" : ""
                      }`}
                    />
                    {!labelsHidden && (
                      <span className="min-w-0 overflow-hidden whitespace-nowrap">
                        {label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-border px-3 py-3 dark:border-neutral-800">
          {SIDEBAR_ACTIONS.map(({ id, label, icon: Icon }) => {
            const isSettings = id === "settings";
            const isActive = isSettings && activeId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => (isSettings ? onSelect(id) : onLogout())}
                title={iconRail ? label : undefined}
                aria-label={iconRail ? label : undefined}
                aria-current={isActive ? "page" : undefined}
                className={`relative grid min-h-10 w-full items-center rounded-xl text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none ${itemLayout} ${
                  isActive
                    ? "bg-primary/10 font-semibold text-primary-strong ring-1 ring-inset ring-primary/15 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-primary dark:bg-[#0A8B8E]/10 dark:text-white dark:ring-[#0A8B8E]/20"
                    : isSettings
                      ? "text-muted hover:bg-background hover:text-primary-strong dark:text-gray-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                      : "text-muted hover:bg-rose-50 hover:text-rose-700 dark:text-gray-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                }`}
              >
                <Icon
                  size={18}
                  className={`shrink-0 justify-self-center ${
                    isActive ? "text-primary dark:text-[#0A8B8E]" : ""
                  }`}
                />
                {!labelsHidden && (
                  <span className="min-w-0 overflow-hidden whitespace-nowrap">
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
