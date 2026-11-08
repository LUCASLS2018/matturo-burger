import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public-store affordance for customers only: create/sign in to a customer
 * account. The Matturo team signs in at /admin, so the store header never
 * offers the administration panel.
 */
export function CustomerAccountAccess() {
  const [signedIn, setSignedIn] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const sync = (user: boolean) => {
      setSignedIn(user);
      void router.invalidate();
    };
    void supabase.auth.getUser().then((result) => sync(Boolean(result.data.user)));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      sync(Boolean(session));
    });
    return () => data.subscription.unsubscribe();
  }, [router]);
  return (
    <Button asChild variant="ghost" size="icon" aria-label={signedIn ? "A minha conta" : "Criar conta de cliente"}>
      <Link to={signedIn ? "/minha-conta" : "/conta"}>
        <UserRound />
      </Link>
    </Button>
  );
}
