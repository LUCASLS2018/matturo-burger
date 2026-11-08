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
