import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

// Keep `csrfMiddleware`: setting `requestMiddleware` replaces Start's default
// CSRF check. It only checks server functions, so the provider's redirect back
// to `/auth/callback` still works.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}));
