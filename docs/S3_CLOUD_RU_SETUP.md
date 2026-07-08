# Cloud.ru S3 setup

The portal stores document originals and every version in Cloud.ru S3-compatible Object Storage.
Physical deletion is forbidden by design.

## 1. Create a bucket

- Create an S3 bucket in Cloud.ru (region e.g. `ru-central-1`).
- Note the **endpoint**, **region**, and **bucket name**.

## 2. Enable protection

- Enable **Versioning** (keeps every version of an object).
- Enable **Object Lock** if available (immutability / retention).

## 3. Create access keys

- Create an access key / secret key pair.
- **Do not grant `s3:DeleteObject`.** The portal never deletes objects; deletions are soft
  deletes in PostgreSQL only.

## 4. Configure the portal

In `apps/api/.env`:

```env
S3_ENDPOINT=https://<cloud-ru-s3-endpoint>
S3_REGION=ru-central-1
S3_BUCKET=<bucket>
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_FORCE_PATH_STYLE=true
S3_PRESIGNED_URL_TTL_SECONDS=900
MAX_FILE_SIZE_BYTES=524288000
```

Path-style addressing (`S3_FORCE_PATH_STYLE=true`) is usually required for S3-compatible providers.

## 5. Object key layout

```text
documents/{scope}/{projectCodeOrGlobal}/{yyyy}/{mm}/{documentId}/{versionNo}/{safeFileName}
```

## Troubleshooting

- **`AccessDenied` / permission denied:** verify keys and that the bucket policy allows
  `PutObject`, `GetObject`, `HeadObject` (but not `DeleteObject`).
- **Presigned URL fails:** check clock skew and that `S3_ENDPOINT`/region match the bucket.
- **Wrong host style:** toggle `S3_FORCE_PATH_STYLE`.
