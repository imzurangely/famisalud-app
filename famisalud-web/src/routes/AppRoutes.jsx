import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../shared/components/layout/AppLayout.jsx';
import RouteLoadingFallback from '../shared/components/layout/RouteLoadingFallback.jsx';
import { GuestOnly, RequireAuth } from './RouteGuards.jsx';

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('../features/auth/pages/ForgotPasswordPage.jsx'));
const VerifyRecoveryCodePage = lazy(() => import('../features/auth/pages/VerifyRecoveryCodePage.jsx'));
const ResetPasswordPage = lazy(() => import('../features/auth/pages/ResetPasswordPage.jsx'));
const FamilySetupPage = lazy(() => import('../features/auth/pages/FamilySetupPage.jsx'));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage.jsx'));
const FamilyPage = lazy(() => import('../features/family/pages/FamilyPage.jsx'));
const InvitationResponsePage = lazy(() => import('../features/family/pages/InvitationResponsePage.jsx'));
const MedicalHistoryPage = lazy(() => import('../features/medical-history/pages/MedicalHistoryPage.jsx'));
const AppointmentsPage = lazy(() => import('../features/appointments/pages/AppointmentsPage.jsx'));
const DocumentsPage = lazy(() => import('../features/documents/pages/DocumentsPage.jsx'));
const MedicationsPage = lazy(() => import('../features/medications/pages/MedicationsPage.jsx'));
const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage.jsx'));
const PreferencesPage = lazy(() => import('../features/profile/pages/PreferencesPage.jsx'));
const NotificationsPage = lazy(() => import('../features/notifications/pages/NotificationsPage.jsx'));


export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
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
          <Route path="citas" element={<AppointmentsPage />} />
          <Route path="documentos" element={<DocumentsPage />} />
          <Route path="medicamentos" element={<MedicationsPage />} />
          <Route path="notificaciones" element={<NotificationsPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          {/* <Route path="preferencias" element={<PreferencesPage />} /> */}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
