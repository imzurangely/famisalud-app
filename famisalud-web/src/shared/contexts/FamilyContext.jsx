import { createContext } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useFamilyCollection } from '../../features/family/hooks/useFamilyCollection.js';

export const FamilyContext = createContext(null);

/** Proveedor global para la familia seleccionada; la petición y estados viven en la feature family. */
export function FamilyProvider({ children }) {
  const { status, isAuthenticated, familySetupRequired, user } = useAuth();
  const familyState = useFamilyCollection({
    status,
    isAuthenticated,
    familySetupRequired,
    userId: user?.id,
  });

  return <FamilyContext.Provider value={familyState}>{children}</FamilyContext.Provider>;
}
