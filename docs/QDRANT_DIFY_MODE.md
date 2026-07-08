# Qdrant in Dify-managed mode

Qdrant is the vector store, but **Dify owns the collections**. The portal is strictly read-only
against Qdrant.

## What Dify does

- Creates collections (named/managed by Dify) when a Knowledge Base is first indexed.
- Writes vectors (embeddings from LM Studio) and payloads.
- Queries Qdrant during retrieval.

## What the portal may do (read-only)

- `health()` — liveness/readiness.
- `listCollections()` — for admin diagnostics.
- `getCollection(name)` — inspect a collection.

The portal's Qdrant client **must not** contain `upsert`, `deletePoints`, `updateVectors`, or
`overwritePayload`. A unit test asserts these methods do not exist (prompt 04/07).

## Verify a collection appeared

```bash
curl -H "api-key: $QDRANT_API_KEY" http://localhost:6333/collections
curl -H "api-key: $QDRANT_API_KEY" http://localhost:6333/collections/<name>
```

The vector size in the collection config should be **4096** (Qwen3-Embedding-8B).

## Common issues

- **No collection after indexing:** the document is probably still `parsing`/`indexing`, or the
  embedding provider failed — check Dify worker logs and LM Studio.
- **Wrong vector size:** the Dify KB was created with a different embedding model; recreate it
  with the LM Studio 4096-dim model.
- **Connection refused:** check `QDRANT_URL`/`QDRANT_API_KEY` in Dify and that Dify shares the
  network with Qdrant.
