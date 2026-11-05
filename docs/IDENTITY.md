# Identity and sign-in

## Decision

**B1 (final): a managed OpenID Connect provider, with the application on a Hostinger Linux VPS.** Keycloak is not self-hosted. Referrals are restricted to referring institutions and referring physicians.

Why this shape: the provider authenticates staff and nothing else. Clinical data — patients, referrals, documents, audit history — never leaves the application database, so the provider holds names and email addresses, not health information. That keeps the small footprint of one stateful service to operate, back up and patch, instead of two.

The application already speaks plain OIDC through `openid-client`, so **any provider that implements discovery works with no code change**. Configuration is five environment values.

## Requirements the provider must meet

Run `pnpm check-oidc <issuer>` to verify all of these against the live discovery document.

1. OpenID Connect discovery at `<issuer>/.well-known/openid-configuration`, with the `issuer` value matching `AUTH_ISSUER_URL` exactly.
2. Authorization code flow with **PKCE S256**.
3. The `openid` scope, plus `profile` and `email` for the name and address shown in the app.
4. Either a confidential client (client secret) or a public client that accepts `token_endpoint_auth_method=none`.
5. **Self-registration disabled.** Accounts are issued by HakimeRAD; see below.

## Configuration

```ini
AUTH_ISSUER_URL=https://<provider-tenant>          # exact issuer, no trailing slash
AUTH_CLIENT_ID=<client id>
AUTH_CLIENT_SECRET=<secret>                        # omit for a public PKCE client
AUTH_REDIRECT_URI=https://<host>/auth/callback      # must match the provider exactly
AUTH_SCOPE=openid profile email
AUTH_COOKIE_SECRET=<32+ random characters>          # openssl rand -base64 48
```

`AUTH_DEV_LOGIN` must be unset in production; the route returns 404 when it is.

### Redirect URIs to register at the provider

| Environment       | URI                                    |
| ----------------- | -------------------------------------- |
| Production        | `https://<host>/auth/callback`         |
| Staging           | `https://<staging-host>/auth/callback` |
| Local development | `http://localhost:5173/auth/callback`  |

A trailing slash, a different port or `http` where the provider expects `https` all produce a redirect-URI mismatch at the provider, not in the app.

## Auth0 setup

The confirmed provider. This is the whole console walk-through; nothing in the application changes.

**1. Create the tenant.** Pick the **region** deliberately — it sets the permanent domain `<tenant>.<region>.auth0.com` and decides where staff identity data is stored (EU, US, AU, JP). It cannot be changed later without recreating the tenant. Confirm the current free-tier user limit before committing.

**2. Create the application.** Applications → Create Application → name it `HakimeRAD IR Booking` → type **Regular Web Application**. That type is a confidential client: it issues a client secret and uses the authorization code flow, which is what the app expects. Note the **Domain**, **Client ID** and **Client Secret** from its Settings tab.

**3. Register the redirect URIs.** On the same Settings tab, fill **Allowed Callback URLs** with exactly:

```
https://<production-host>/auth/callback
https://<staging-host>/auth/callback
http://localhost:5173/auth/callback
```

Set **Allowed Logout URLs** to the matching origins, and **Allowed Web Origins** to the production and staging origins. A missing or mistyped entry here is the most common launch failure: the provider rejects the redirect before the app ever sees a request.

**4. Disable sign-up.** Authentication → Database → the `Username-Password-Authentication` connection → turn **Disable Sign Ups** on. If more than one database connection is enabled for the application, disable sign-ups on **every** one — with a single connection left open, the sign-up link still appears on the login page.

**5. Create the accounts.** User Management → Users → Create User, one per person, with a work email address and a password the user changes at first sign-in. Mark the address verified. Do not invite people to self-serve.

**6. Point the app at it.**

```ini
AUTH_ISSUER_URL=https://<tenant>.<region>.auth0.com
AUTH_CLIENT_ID=<Client ID>
AUTH_CLIENT_SECRET=<Client Secret>
AUTH_REDIRECT_URI=https://<production-host>/auth/callback
```

**7. Verify before launch.**

```bash
pnpm check-oidc https://<tenant>.<region>.auth0.com
```

It prints the redirect URI to compare against step 3, and fails if PKCE or the code flow is unavailable.

Auth0 reports its issuer with a trailing slash in the discovery document. Enter the value without one; the app and the checker both treat the two forms as the same issuer.

### Values already decided

| Item                | Value                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant region       | **Asia** — Auth0's Japan region, so the domain is `<tenant>.jp.auth0.com`. Confirm the exact domain the console shows; `AUTH_ISSUER_URL` must match it character for character. |
| First administrator | `dawit@hakimerad.com`                                                                                                                                                           |

**Create that account first, and only that one.** The app's `claimFirstAdmin` is first-come, not matched on an email address: whoever signs in while no administrator exists can take the role, and the claim cannot be undone from inside the app. The order is therefore: create Dawit's account → he signs in and claims the card on the dashboard → only then create anyone else's account.

Expect a longer round trip on sign-in from Addis Ababa to Japan than to a European region. It affects the redirect only; after sign-in the session is a sealed cookie and page loads do not touch the provider.

## Account policy

- **Registration is disabled at the provider.** Every account exists because HakimeRAD created it. There is no public signup endpoint to abuse and every account is deliberate.
- **Roles live in the application**, in the `users` table, changed only by an administrator and recorded in the audit log. The provider is the authenticator; the app is the authorisation authority.
- **Disabled at the provider means disabled here**: an account that cannot complete sign-in cannot act, and its existing session expires at `AUTH_COOKIE_SECRET` rotation or session timeout. To revoke immediately, disable the identity and delete the user's sessions.
- **Physician verification is separate from having an account.** A `physician` role must still be verified by a coordinator before their referrals are accepted.
- **No patient accounts.** Patients receive status by email and phone; there is nothing for them to sign in to.

## What the provider sees, and what it does not

| Sent to the provider      | Never leaves the application              |
| ------------------------- | ----------------------------------------- |
| Work email address        | Patient names, dates of birth, guardians  |
| Display name              | Referral content, clinical notes, imaging |
| Sign-in times, IP address | Uploaded documents                        |
|                           | Audit history                             |

Record this in the privacy notice: the identity provider is a **processor** for staff sign-in, not for patient data.

## Failure modes seen in practice

| Symptom                              | Cause                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `503` on `/auth/sign-in`             | `AUTH_ISSUER_URL` or `AUTH_CLIENT_ID` missing; the app refuses to guess                       |
| Redirect loop after sign-in          | Redirect URI registered at the provider differs from `AUTH_REDIRECT_URI`                      |
| `invalid_grant` at the callback      | PKCE challenge not supported, or the client is public while a secret is configured            |
| Token rejected after provider change | Issuer string changed; `AUTH_ISSUER_URL` must match the new realm or tenant exactly           |
| Everyone signed out at once          | `AUTH_COOKIE_SECRET` rotated — expected, and the reason to rotate during a maintenance window |

## Before launch

1. Provider tenant created, region chosen, and its data-processing terms accepted.
2. Self-registration disabled; email verification required for invited accounts.
3. Client created with the three redirect URIs above.
4. `pnpm check-oidc https://<issuer>` passes.
5. First administrator created in the provider, then claimed in the app.
6. Privacy notice names the provider as a processor.
