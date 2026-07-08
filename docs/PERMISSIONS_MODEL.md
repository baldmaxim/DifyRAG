# Permissions model

## Roles (JWT users)

| Role | Capabilities |
|---|---|
| `super_admin` | Everything. |
| `admin` | Integrations, API keys, users, all document operations. |
| `manager` | Projects, documents, reindex, processing jobs, search. |
| `editor` | Create/edit documents (upload, commit, make-current). |
| `viewer` | Read + search allowed documents only. |

`super_admin` implicitly satisfies every role requirement (RolesGuard).

## Enforced by endpoint (examples)

| Action | Minimum role |
|---|---|
| Create/update/archive project | manager |
| Create folder | editor |
| Delete folder | manager |
| Create/update document, upload, commit | editor |
| Delete (soft) / restore document | manager |
| Reindex document | manager |
| Manage API keys | admin |
| Qdrant collections (diagnostics) | admin |
| Search | any authenticated user |

## API key scopes (external systems)

`documents:read|write|delete`, `projects:read|write`, `search:read`,
`processing:write`, `integrations:read|write`. Keys store only a hash; the secret
is shown once at creation. Revoked/expired keys are rejected; `last_used_at` is tracked.

## Private data

- `company__people_private` is a separate Dify dataset with restricted access.
- Search **excludes** private datasets by default.
- Internal search includes private datasets only for `admin`/`super_admin`.
- External API search **never** includes private datasets.

## Auditing

Every critical action (create/update/delete/restore, upload/download URL, API key
create/revoke, reindex) writes an `audit_logs` row with actor, resource, and
before/after. Secrets/tokens/keys are never logged.
