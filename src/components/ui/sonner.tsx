import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const { pathname } = useLocation();

  // Un toast ne doit jamais rester bloqué à l'écran : on nettoie à chaque
  // changement de page (le minuteur de sonner peut être mis en pause quand
  // l'app passe en arrière-plan ou pendant un appui long sur mobile).
  useEffect(() => {
    toast.dismiss();
  }, [pathname]);

  return (
    <Sonner
      position="bottom-center"
      style={{ bottom: '80px' }}
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={4000}
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};


export { Toaster, toast };
