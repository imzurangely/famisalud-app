import { useAuth } from "../../../shared/hooks/useAuth.js";
import { useActionState } from "./useActionState.js";

export function useAuthAction(actionName) {
  const auth = useAuth();
  const action = auth[actionName];
  if (typeof action !== "function")
    throw new Error(`La acción de autenticación "${actionName}" no existe.`);
  return useActionState(action);
}
