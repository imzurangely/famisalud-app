import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import { NotificationsProvider } from "../../../features/notifications/context/NotificationsContext.jsx";

function AppLayoutContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="app-shell min-h-screen bg-slate-50 text-slate-800 antialiased transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className={`min-h-screen transition-all duration-300 pb-16 ${sidebarOpen ? "lg:pl-69" : "lg:pl-0"}`}
      >
        <Topbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        <main
          key={location.pathname}
          className="mx-auto w-full max-w-[2100px] px-4 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-9"
        >
          <Outlet />
        </main>

        <footer
          className={`fixed bottom-0 right-0 left-0 transition-all duration-300 ${sidebarOpen ? "lg:left-69" : "lg:left-0"} z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md px-4 lg:px-9 py-3 border-t border-slate-200/70 text-[10px] text-slate-400 dark:border-slate-800 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}
        >
          <span>© 2026 FamiSalud · Hecho para cuidar en familia</span>
          <span>
            Vista de desarrollo · algunas secciones aún están en preparación
          </span>
        </footer>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <NotificationsProvider>
      <AppLayoutContent />
    </NotificationsProvider>
  );
}
