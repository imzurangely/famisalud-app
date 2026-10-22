import { useContext } from 'react';
import { FamilyContext } from '../contexts/FamilyContext.jsx';

export function useFamilies() {
  const context = useContext(FamilyContext);
  if (!context) throw new Error('useFamilies debe utilizarse dentro de FamilyProvider.');
  return context;
}
