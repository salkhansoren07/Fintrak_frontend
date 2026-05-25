import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BookUser,
  Calendar,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  ListRestart,
  LogOut,
  MessageSquareQuote,
  PiggyBank,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTransactions } from "../context/TransactionContext";

function formatMonthLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function describeDateFilter(dateFilter) {
  if (dateFilter.type === "all") {
    return "All transactions";
  }

  if (dateFilter.type === "custom") {
    if (dateFilter.start && dateFilter.end) {
      return `${dateFilter.start} to ${dateFilter.end}`;
    }
    return "Custom range";
  }

  if (dateFilter.month) {
    return dateFilter.month;
  }

  return "This month";
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.5)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/70">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        <Icon size={14} />
        {title}
      </div>
      {children}
    </section>
  );
}

function NavLink({ href, icon: Icon, label, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center justify-between rounded-2xl px-3 py-3 transition-all ${
        active
          ? "bg-linear-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
            active
              ? "bg-white/15"
              : "bg-slate-100 text-slate-600 group-hover:bg-white dark:bg-slate-900 dark:text-slate-300 dark:group-hover:bg-slate-800"
          }`}
        >
          <Icon size={18} />
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </span>
      <ChevronRight
        size={16}
        className={
          active
            ? "opacity-100"
            : "opacity-0 transition-opacity group-hover:opacity-100"
        }
      />
    </Link>
  );
}

function PresetButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
    >
      {children}
    </button>
  );
}

export default function Sidebar({ onClose }) {
  const { logout, user } = useAuth();
  const { dateFilter, setDateFilter } = useTransactions();
  const pathname = usePathname();

  const now = new Date();
  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      href: "/#transactions",
      label: "Transactions",
      icon: CreditCard,
      active: pathname === "/",
    },
    {
      href: "/individual",
      label: "Individual",
      icon: BookUser,
      active: pathname.startsWith("/individual"),
    },
    {
      href: "/budget",
      label: "Budget Tracking",
      icon: PiggyBank,
      active: pathname.startsWith("/budget"),
    },
    {
      href: "/insights",
      label: "FinTrak Insights",
      icon: Sparkles,
      active: pathname.startsWith("/insights"),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: UserRound,
      active: pathname.startsWith("/profile"),
    },
    ...(user?.isAdmin
      ? [
          {
            href: "/admin/testimonials",
            label: "Admin Testimonials",
            icon: MessageSquareQuote,
            active: pathname.startsWith("/admin/testimonials"),
          },
        ]
      : []),
  ];

  const setThisMonth = () => {
    setDateFilter({
      type: "month",
      month: formatMonthLocal(now),
    });
  };

  const setLastMonth = () => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    setDateFilter({
      type: "month",
      month: formatMonthLocal(d),
    });
  };

  const setLast3Months = () => {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    setDateFilter({
      type: "custom",
      start: formatDateLocal(start),
      end: formatDateLocal(now),
    });
  };

  const setThisYear = () => {
    const start = new Date(now.getFullYear(), 0, 1);
    setDateFilter({
      type: "custom",
      start: formatDateLocal(start),
      end: formatDateLocal(now),
    });
  };

  const setAllTime = () => {
    setDateFilter({ type: "all" });
  };

  return (
    <aside className="flex h-full flex-1 flex-col overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_38%),linear-gradient(180deg,_#f8fbff_0%,_#eef5ff_45%,_#f8fafc_100%)] p-4 text-slate-900 shadow-2xl dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#081225_50%,_#020617_100%)] dark:text-slate-100 md:w-72 md:p-5">
      <div className="flex flex-1 flex-col gap-4">
        <div className="rounded-[32px] border border-white/60 bg-white/85 p-4 shadow-[0_24px_60px_-30px_rgba(59,130,246,0.45)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/75">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image
                src="/fintrak-logo.png"
                alt="FinTrak logo"
                width={52}
                height={52}
                className="h-[52px] w-[52px] rounded-2xl object-cover shadow-md"
                priority
              />
              <div>
                <h1 className="text-xl font-bold leading-none text-slate-100">
                  FinTrak
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Smart expense tracking
                </p>
              </div>
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white md:hidden"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>

          
        </div>

        <SectionCard title="Navigation" icon={LayoutDashboard}>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={item.active}
                onClick={onClose}
              />
            ))}
          </nav>
        </SectionCard>

        <SectionCard title="Date Filter" icon={Calendar}>
          <div className="rounded-2xl bg-slate-100 px-3 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Active View
            </p>
            <p className="mt-1 font-semibold">{describeDateFilter(dateFilter)}</p>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                <SlidersHorizontal size={13} />
                Filter Type
              </span>
              <select
                id="sidebar-filter-type"
                name="filterType"
                value={dateFilter.type}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, type: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="month">Month</option>
                <option value="custom">Custom Range</option>
                <option value="all">All Time</option>
              </select>
            </label>

            {dateFilter.type === "month" ? (
              <input
                id="sidebar-filter-month"
                name="filterMonth"
                type="month"
                value={dateFilter.month || ""}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, month: e.target.value })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
            ) : null}

            {dateFilter.type === "custom" ? (
              <div className="grid gap-3">
                <input
                  id="sidebar-filter-start"
                  name="filterStart"
                  type="date"
                  value={dateFilter.start || ""}
                  onChange={(e) =>
                    setDateFilter({ ...dateFilter, start: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
                <input
                  id="sidebar-filter-end"
                  name="filterEnd"
                  type="date"
                  value={dateFilter.end || ""}
                  onChange={(e) =>
                    setDateFilter({ ...dateFilter, end: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Quick Presets" icon={ListRestart}>
          <div className="grid grid-cols-1 gap-2">
            <PresetButton onClick={setThisMonth}>This Month</PresetButton>
            <PresetButton onClick={setLastMonth}>Last Month</PresetButton>
            <PresetButton onClick={setLast3Months}>Last 3 Months</PresetButton>
            <PresetButton onClick={setThisYear}>This Year</PresetButton>
            <PresetButton onClick={setAllTime}>All Time</PresetButton>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 rounded-[28px] border border-slate-200/80 bg-white/90 p-3 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.5)] backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/70">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-950/20 dark:hover:text-rose-300"
        >
          <span className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900">
              <LogOut size={18} />
            </span>
            Sign Out
          </span>
          <ChevronRight size={16} />
        </button>
      </div>
    </aside>
  );
}
