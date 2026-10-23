import { Navigate, Route, Routes } from 'react-router-dom';
import { CalendarDays, FileText, Bell, Pill, UserRound, SlidersHorizontal } from 'lucide-react';
import AppLayout from '../shared/components/layout/AppLayout.jsx';
import ModulePlaceholder from './ModulePlaceholder.jsx';
import { GuestOnly, RequireAuth } from './RouteGuards.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import RegisterPage from '../features/auth/pages/RegisterPage.jsx';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage.jsx';
import VerifyRecoveryCodePage from '../features/auth/pages/VerifyRecoveryCodePage.jsx';
import FamilySetupPage from '../features/auth/pages/FamilySetupPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import FamilyPage from '../features/family/pages/FamilyPage.jsx';
import MedicalHistoryPage from '../features/medical-history/pages/MedicalHistoryPage.jsx';
import InvitationResponsePage from '../features/family/pages/InvitationResponsePage.jsx';

function PlaceholderRoute({ title, description, icon: Icon, features }) {
  return <ModulePlaceholder title={title} description={description} icon={Icon} features={features} />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/registro" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/recuperar-contrasena" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
      <Route path="/verificar-codigo-recuperacion" element={<GuestOnly><VerifyRecoveryCodePage /></GuestOnly>} />
      <Route path="/restablecer-contrasena" element={<GuestOnly><ResetPasswordPage /></GuestOnly>} />
      <Route path="/configurar-familia" element={<RequireAuth setupOnly><FamilySetupPage /></RequireAuth>} />
      <Route path="/invitations/accept" element={<RequireAuth allowSetupIncomplete><InvitationResponsePage /></RequireAuth>} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="familia" element={<FamilyPage />} />
        <Route path="historia-clinica" element={<MedicalHistoryPage />} />
        <Route path="medicamentos" element={<PlaceholderRoute title="Medicamentos y trámites" description="El módulo conectará los medicamentos, horarios, tomas, autorizaciones, renovaciones y entregas con los endpoints ya probados del backend." icon={Pill} features={['Horarios y registro de tomas', 'Autorizaciones y renovaciones', 'Entregas y recogidas']} />} />
        <Route path="citas" element={<PlaceholderRoute title="Citas médicas" description="Organiza citas y consulta sus recordatorios desde la historia clínica compartida." icon={CalendarDays} features={['Próximas citas', 'Historial de citas', 'Recordatorios']} />} />
        <Route path="documentos" element={<PlaceholderRoute title="Documentos" description="Aquí conectaremos los documentos clínicos y soportes almacenados por la API." icon={FileText} features={['Documentos personales', 'Documentos asociados a citas', 'Archivos clínicos']} />} />
        <Route path="notificaciones" element={<PlaceholderRoute title="Notificaciones" description="El centro de notificaciones se conectará con el backend para mostrar avisos, estados de lectura y recordatorios." icon={Bell} features={['Recordatorios', 'Avisos de citas', 'Avisos de medicamentos']} />} />
        <Route path="perfil" element={<PlaceholderRoute title="Mi perfil" description="Aquí se administrarán los datos personales y las preferencias de tu cuenta." icon={UserRound} features={['Datos personales', 'Preferencias', 'Sesiones']} />} />
        <Route path="preferencias" element={<PlaceholderRoute title="Preferencias" description="Próximamente reuniremos aquí las preferencias de visualización y las opciones disponibles para tu cuenta." icon={SlidersHorizontal} features={['Tema de la aplicación', 'Preferencias de avisos', 'Configuración de cuenta']} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
