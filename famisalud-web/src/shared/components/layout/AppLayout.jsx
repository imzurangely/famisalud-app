import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app-shell min-h-screen bg-slate-50 text-slate-800 antialiased transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-h-screen lg:pl-69">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main key={location.pathname} className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-9 lg:py-9">
          <Outlet />
          <footer className="mt-9 flex flex-col gap-2 border-t border-slate-200/70 py-5 text-[10px] text-slate-400 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 FamiSalud · Hecho para cuidar en familia</span>
            <span>Vista de desarrollo · algunas secciones aún están en preparación</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
