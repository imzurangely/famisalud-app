import { createContext } from 'react';
import { useAuthController } from '../../features/auth/hooks/useAuthController.js';

export const AuthContext = createContext(null);

/** Proveedor global de autenticación; la lógica permanece en un hook de la feature auth. */
export function AuthProvider({ children }) {
  const auth = useAuthController();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
