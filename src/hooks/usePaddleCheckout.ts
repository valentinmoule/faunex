import { useState } from "react";
import { Browser } from "@capacitor/browser";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { IS_NATIVE_APP } from "@/lib/platform";

/**
 * Domaine web approuvé côté Paddle. Dans l'app native, l'origine est
 * `https://localhost` (Android) ou `capacitor://localhost` (iOS) : Paddle
 * refuse d'y ouvrir l'overlay et affiche "Something went wrong". On ouvre
 * donc le paiement dans le navigateur système, sur le domaine approuvé.
 */
export const WEB_CHECKOUT_ORIGIN = "https://faunex.fr";

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: {
    priceId: string;
    plan?: "monthly" | "yearly";
    quantity?: number;
    customerEmail?: string;
    customData?: Record<string, string>;
    successUrl?: string;
  }) => {
    setLoading(true);
    try {
      if (IS_NATIVE_APP) {
        const url = new URL("/premium", WEB_CHECKOUT_ORIGIN);
        url.searchParams.set("checkout", "auto");
        if (options.plan) url.searchParams.set("plan", options.plan);
        if (options.customerEmail) url.searchParams.set("email", options.customerEmail);
        if (options.customData?.userId) url.searchParams.set("uid", options.customData.userId);
        await Browser.open({ url: url.toString(), presentationStyle: "popover" });
        return;
      }

      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);

      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: options.quantity ?? 1 }],
        customer: options.customerEmail ? { email: options.customerEmail } : undefined,
        customData: options.customData,
        settings: {
          displayMode: "overlay",
          successUrl: options.successUrl || `${window.location.origin}/premium?checkout=success`,
          allowLogout: false,
          variant: "one-page",
          locale: "fr",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
