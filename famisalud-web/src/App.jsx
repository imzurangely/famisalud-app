import { useState } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Bell, CalendarDays, FileText, HeartPulse, Pill, UserRound, UsersRound } from 'lucide-react';
import Sidebar from './components/layout/Sidebar.jsx';
import Topbar from './components/layout/Topbar.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import ModulePlaceholder from './features/placeholders/ModulePlaceholder.jsx';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-h-screen lg:pl-69">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main key={location.pathname} className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-9 lg:py-9">
          <Outlet />
          <footer className="mt-9 flex flex-col gap-2 border-t border-slate-200/70 py-5 text-[10px] text-slate-400 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 FamiSalud · Hecho para cuidar en familia</span><span>Vista de desarrollo · datos de ejemplo</span></footer>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="familia" element={<ModulePlaceholder title="Mi familia" description="Administra los perfiles familiares, consulta las relaciones entre sus integrantes y accede a la información según tu rol." icon={UsersRound} features={['Perfiles familiares', 'Invitaciones', 'Roles y permisos', 'Información personal compartida']} />} />
        <Route path="historia-clinica" element={<ModulePlaceholder title="Historia clínica" description="Consulta la información de salud de forma organizada: antecedentes, alergias, vacunas, signos vitales y otros registros importantes." icon={HeartPulse} features={['Alergias y condiciones', 'Vacunas y signos vitales', 'Contactos de emergencia', 'Planes de salud']} />} />
        <Route path="medicamentos" element={<ModulePlaceholder title="Medicamentos y trámites" description="Organiza los medicamentos, horarios de toma, historial, autorizaciones, renovaciones y entregas." icon={Pill} features={['Medicamentos activos', 'Horarios y tomas', 'Autorizaciones', 'Renovaciones y recogidas']} />} />
        <Route path="citas" element={<ModulePlaceholder title="Citas médicas" description="Mantén las citas familiares organizadas y consulta los detalles de cada consulta." icon={CalendarDays} features={['Próximas citas', 'Historial de consultas', 'Recordatorios', 'Documentos relacionados']} />} />
        <Route path="documentos" element={<ModulePlaceholder title="Documentos" description="Organiza documentos clínicos importantes y relaciónalos con la persona y la cita correspondiente." icon={FileText} features={['Subir documentos', 'Consultar archivos', 'Relacionar con citas', 'Acceso según permisos']} />} />
        <Route path="notificaciones" element={<ModulePlaceholder title="Notificaciones" description="Consulta avisos y recordatorios sobre citas, medicamentos y trámites pendientes." icon={Bell} features={['Recordatorios', 'Avisos de citas', 'Estado de trámites', 'Preferencias de notificación']} />} />
        <Route path="perfil" element={<ModulePlaceholder title="Mi perfil" description="Consulta y actualiza tus datos personales y preferencias de la aplicación." icon={UserRound} features={['Datos personales', 'Zona horaria', 'Sesiones', 'Seguridad de la cuenta']} />} />
        <Route path="*" element={<ModulePlaceholder title="Página no encontrada" description="La sección que buscas no existe o todavía no forma parte de la navegación." icon={HeartPulse} />} />
      </Route>
    </Routes>
  );
}
