import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20"><span className="size-6 animate-pulse rounded-full border-[3px] border-white/40 border-t-white" /></span>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Preparando tu espacio de salud…</p>
      </div>
    </main>
  );
}

export function RequireAuth({ children, setupOnly = false }) {
  const { status, isAuthenticated, familySetupRequired } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (setupOnly && !familySetupRequired) return <Navigate to="/" replace />;
  if (!setupOnly && familySetupRequired) return <Navigate to="/configurar-familia" replace />;
  return children;
}

export function GuestOnly({ children }) {
  const { status, isAuthenticated, familySetupRequired } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingScreen />;
  if (isAuthenticated) {
    return <Navigate to={familySetupRequired ? '/configurar-familia' : location.state?.from?.pathname || '/'} replace />;
  }
  return children;
}
