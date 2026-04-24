"use client";
import { useState } from "react";
import Link from "next/link";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function Layout({ children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#020617] overscroll-behavior-x-none touch-pan-y relative">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-200 md:hidden ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setMobileSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onOpenMenu={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
          <div className="p-3 sm:p-4 md:p-8">
            {children}
          </div>

          <footer className="border-t border-slate-200/80 px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-6 md:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>FinTrak legal information</p>

              <div className="flex items-center gap-4">
                <Link
                  href="/privacy"
                  className="transition hover:text-blue-600 dark:hover:text-blue-300"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="transition hover:text-blue-600 dark:hover:text-blue-300"
                >
                  Terms
                </Link>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
