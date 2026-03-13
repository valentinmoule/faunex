import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  message?: string;
}

const AuthPromptModal = ({ open, onClose, message }: Props) => {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <LogIn className="w-6 h-6 text-primary" />
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h2 className="text-lg font-display font-bold text-foreground">Crée ton compte</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            {message || "Inscris-toi gratuitement pour sauvegarder tes captures et voir tous les détails des animaux identifiés."}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1 font-display font-semibold"
            onClick={() => navigate('/auth')}
          >
            S'inscrire
          </Button>
          <Button
            variant="outline"
            className="flex-1 font-display"
            onClick={onClose}
          >
            Plus tard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuthPromptModal;
