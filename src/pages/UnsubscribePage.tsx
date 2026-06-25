import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "validating" | "ready" | "already" | "invalid" | "submitting" | "success" | "error";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("validating");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState("invalid");
          return;
        }
        if (json.already_unsubscribed) {
          setEmail(json.email || null);
          setState("already");
        } else {
          setEmail(json.email || null);
          setState("ready");
        }
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setState("error");
        return;
      }
      setState("success");
    } catch {
      setState("error");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Désabonnement Faunex</h1>

        {state === "validating" && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Vérification du lien…</p>
          </div>
        )}

        {state === "ready" && (
          <>
            <p className="text-muted-foreground">
              Confirme le désabonnement{email ? ` de ${email}` : ""} des emails Faunex non essentiels.
            </p>
            <Button onClick={confirm} className="w-full">Confirmer le désabonnement</Button>
          </>
        )}

        {state === "submitting" && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Traitement…</p>
          </div>
        )}

        {state === "success" && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p>Tu es désabonné{email ? ` (${email})` : ""}. Tu ne recevras plus ces emails.</p>
          </div>
        )}

        {state === "already" && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p>Cette adresse{email ? ` (${email})` : ""} est déjà désabonnée.</p>
          </div>
        )}

        {state === "invalid" && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="h-10 w-10 text-destructive" />
            <p>Lien invalide ou expiré.</p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="h-10 w-10 text-destructive" />
            <p>Une erreur est survenue. Réessaie plus tard.</p>
          </div>
        )}
      </Card>
    </main>
  );
}
