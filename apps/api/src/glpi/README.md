# GLPI Module

- `glpi.module.ts` — leaf module exporting `GlpiService`, the GLPI REST client (session management, ticket create/fetch, status mapping).
- `glpi-webhook.module.ts` — top-level module exposing `POST /webhooks/glpi/tickets`, which re-fetches authoritative ticket status via `GlpiService` and broadcasts the updated message over the existing chat socket.

Configured via `GLPI_URL`, `GLPI_APP_TOKEN`, `GLPI_USER_TOKEN`, `GLPI_WEBHOOK_SECRET` (optional), `GLPI_WEBHOOK_TICKET_ID_FIELD` — see `.env.example`.
