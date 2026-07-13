# Qdrant in Dify-managed mode

Qdrant is the vector store, and **Dify owns the collections** — nothing else writes to Qdrant.
Manual access (curl/console) is for read-only diagnostics.

## What Dify does

- Creates collections (named/managed by Dify) when a Knowledge Base is first indexed.
- Writes vectors (embeddings from LM Studio) and payloads.
- Queries Qdrant during retrieval.

## Verify a collection appeared

```bash
curl -H "api-key: $QDRANT_API_KEY" http://localhost:6333/collections
curl -H "api-key: $QDRANT_API_KEY" http://localhost:6333/collections/<name>
```

The vector size in the collection config must equal the active model's dimension —
**4096** for `Qwen3-Embedding-8B` on the server, or your smaller local model's dim
(e.g. 384/768/1024) during local testing.

## Common issues

- **No collection after indexing:** the document is probably still `parsing`/`indexing`, or the
  embedding provider failed — check Dify worker logs and LM Studio.
- **Wrong vector size:** the Dify KB was created with a different embedding model; recreate the KB
  with the model for the current environment. A collection created at one dimension can NOT be
  reused with a different-dimension model — this is why local(small-dim)→server(4096) migration
  needs a **fresh** Qdrant + fresh Dify Knowledge Bases (see DEPLOYMENT.md).
- **Connection refused:** check `QDRANT_URL`/`QDRANT_API_KEY` in Dify and that Dify shares the
  network with Qdrant.
