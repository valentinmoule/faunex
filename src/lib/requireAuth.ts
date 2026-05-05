import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook returning a function that gates an action behind authentication.
 * If the user is not logged in, shows a toast + redirects to /auth (preserving return path).
 * Returns true when the user IS logged in (action can proceed).
 */
export const useRequireAuth = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  return (message?: string): boolean => {
    if (session?.user) return true;
    if (message) toast.info(message);
    navigate('/auth', { state: { from: window.location.pathname } });
    return false;
  };
};
