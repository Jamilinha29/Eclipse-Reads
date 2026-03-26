import { toast } from "sonner";
import type { NavigateFunction } from "react-router-dom";

/** Toast com ação que leva à página de login (convidado / limite). */
export function toastNeedLogin(message: string, navigate: NavigateFunction) {
  toast.error(message, {
    action: { label: "Fazer login", onClick: () => navigate("/auth") },
  });
}
