import { useCallback, useState } from "react";
import { createFamily } from "../services/familyService.js";

export function useCreateFamily() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createFamily(payload);
      setData(result);
      return result;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { data, loading, error, createFamily: execute, clearError };
}
