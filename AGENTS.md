<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Restaurant architecture
- Matturo uses a verified source snapshot and CDN asset pointers, not the retired NovaFix Supabase catalogue, to keep restaurant facts isolated from existing store data.
- Restaurant cart uses a separate browser storage namespace; order submission uses the original restaurant channel until a restaurant-specific integration is authorized.
- Preserve legacy public page paths as restaurant pages or redirects; do not reuse the NovaFix Stripe flow for restaurant orders.
- Resolve all product cutouts through the shared dish-images module; use the shared DishCard on home and menu so original-photo edits and ordering controls stay consistent.
- Keep order modality in the cart context and its allowed values in order-service so cart and checkout share the same selection.
- Delivery persistence uses isolated matturo_* resources; courier GPS/state RPCs enforce assignment under a row lock, and public tracking reads validate hashed expiring tokens on the server without anonymous table grants.
- Authenticated delivery panels use the shared _authenticated gate and bearer function middleware; Leaflet loads dynamically after hydration to preserve SSR safety.
- Restaurant settings and delivery zones use isolated Matturo tables, revision-checked admin writes and public allowlisted reads; checkout rechecks pause immediately before submission to prevent stale-page ordering.
- Matturo menu edits live in isolated matturo_menu_items rows with revision-checked autosave and private admin-only photo uploads; public pages read current rows, while the verified snapshot supplies preserved option groups.
- Matturo orders are created only by a server function that reprices every line from current menu rows and rechecks pause/zones; customers read their order via an unguessable hashed token, admins via RLS — never trust browser prices.
- Manual phone orders use an admin-authorized entry point and the same order creation helper and scheduling validation as checkout, preserving server pricing, delivery rules, immutable snapshots and idempotency without a separate order store.
- Daily display numbers are assigned transactionally by the order insert trigger and a private per-day counter; keep permanent references unchanged so retries, delivery links and historical records remain stable.
- Loyalty uses private telephone wallets and unique order-linked ledger events; reward orders and debits commit together under a wallet lock, and cancellation refunds are idempotent. Customers access wallets via phone + password accounts (server-only PBKDF2 hashes, lockout after repeated failures) that issue expiring server-validated cookie sessions, separate from team Supabase auth; never authorize lookup or redemption from a typed telephone alone.
- Courier Android APK is a Capacitor shell loading the live /entregas page, built by GitHub Actions; DeliveryPanel uses the native background-geolocation plugin only inside the app so GPS survives Waze/Maps and locked screens.
