# Permissions model

## Roles (JWT users)

| Role | Capabilities |
|---|---|
| `admin` | Everything: settings, integrations, API keys, audit logs, private datasets, plus all content operations. |
| `user` | All content: projects, documents (upload/edit/delete), folders, departments, reindex, processing, search. |

`admin` implicitly satisfies every role requirement (RolesGuard). New users default to `user`.

## Enforced by endpoint (examples)

| Action | Required role |
|---|---|
| Create/update/archive project | user |
| Create/update/delete folder | user |
| Create/update/delete document, upload, commit, make-current | user |
| Delete (soft) / restore document | user |
| Reindex document, retry processing job | user |
| Create/update/delete department | user |
| App settings, integrations, Qdrant collections (diagnostics) | admin |
| Manage API keys | admin |
| Audit logs | admin |
| Search | any authenticated user |

## API key scopes (external systems)

`documents:read|write|delete`, `projects:read|write`, `search:read`,
`processing:write`, `integrations:read|write`. Keys store only a hash; the secret
is shown once at creation. Revoked/expired keys are rejected; `last_used_at` is tracked.

## Private data

- `company__people_private` is a separate Dify dataset with restricted access.
- Search **excludes** private datasets by default.
- Internal search includes private datasets only for `admin`.
- External API search **never** includes private datasets.

## Auditing

Every critical action (create/update/delete/restore, upload/download URL, API key
create/revoke, reindex) writes an `audit_logs` row with actor, resource, and
before/after. Secrets/tokens/keys are never logged.
