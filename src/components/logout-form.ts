import { createElement } from "react";

export function LogoutForm() {
  return createElement(
    "form",
    { method: "post", action: "/firsthand/logout" },
    createElement(
      "button",
      {
        type: "submit",
        className:
          "font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground",
      },
      "Log out",
    ),
  );
}
