import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
  UtensilsCrossed,
} from "lucide-react";

const STAFF_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, available: true },
  { id: "new-order", label: "New Order", icon: ShoppingCart, available: true },
  { id: "order-queue", label: "Order Queue", icon: ClipboardList },
  { id: "transactions", label: "Transactions", icon: ShoppingBag },
  { id: "reconciliation", label: "Shift Reconciliation", icon: ClipboardCheck },
  { id: "staff", label: "Staff", icon: Users, available: true },
];

const ADMIN_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, available: true },
  { id: "orders", label: "Orders", icon: ShoppingBag, available: true },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "menu", label: "Menu", icon: UtensilsCrossed, available: true },
  { id: "management", label: "Management", icon: Users, available: true },
];

export default function SidebarNav({ activeId, onSelect, onLogout, userRole }) {
  const isAdmin = userRole?.toLowerCase() === "admin";
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : STAFF_NAV_ITEMS;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A8B8E]">
          <img
            src="/android-chrome-512x512.png"
            alt="Cremoso icon"
            className="h-6 w-6 brightness-0 invert"
          />
        </div>
        <span className="font-serif text-xl font-bold tracking-wide text-[#0A3B3D] dark:text-white">
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
              aria-current={isActive ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                isActive
                  ? "bg-[#0A8B8E]/10 font-medium text-[#0A8B8E]"
                  : available
                    ? "text-gray-600 hover:bg-[#FBF6EF] hover:text-[#0A3B3D] dark:text-gray-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                    : "cursor-not-allowed text-gray-400 dark:text-neutral-600"
              }`}
            >
              <Icon size={18} />
              {label}
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#F2C879]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-gray-200 p-3 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => onSelect("settings")}
          aria-current={activeId === "settings" ? "page" : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            activeId === "settings"
              ? "bg-[#0A8B8E]/10 font-medium text-[#0A8B8E]"
              : "text-gray-600 hover:bg-[#FBF6EF] hover:text-[#0A3B3D] dark:text-gray-300 dark:hover:bg-neutral-800 dark:hover:text-white"
          }`}
        >
          <Settings size={18} />
          Settings
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 transition hover:bg-[#FBF6EF] hover:text-[#0A3B3D] dark:text-gray-300 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
