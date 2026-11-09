import { Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Public-store affordance for customers only: phone + password account for
 * loyalty points. The Matturo team signs in at /admin.
 */
export function CustomerAccountAccess() {
  return (
    <Button asChild variant="ghost" size="icon" aria-label="A minha conta">
      <Link to="/pontos">
        <UserRound />
      </Link>
    </Button>
  );
}
