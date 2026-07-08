# LM Studio as a Dify model provider

> **Server (production)** uses `Qwen/Qwen3-Embedding-8B` (dim 4096). For **local testing** load a
> smaller installed model and substitute its **name** and **dimension** everywhere below (and in
> `LM_STUDIO_EMBEDDING_MODEL` / `LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION`).

## 1. Start LM Studio + load the embedding model

- Start the server on port `1234` (`lms server start --port 1234` or the GUI Local Server tab).
- Load the embedding model — server: `Qwen/Qwen3-Embedding-8B` (F16 or Q8_0 recommended; avoid Q4
  for production without testing); local: your smaller installed model.
- Verify: `curl http://localhost:1234/v1/models` and a test `/v1/embeddings` call — note the
  returned vector length (it's the model's dimension: **4096** for Qwen3-8B, smaller for a local model).

## 2. Add the provider in Dify

Dify console → **Settings → Model Provider → OpenAI-API-compatible** → Add:

| Field | Value |
|---|---|
| Model type | Text Embedding |
| Model name | the id from `/v1/models` (`qwen3-embedding-8b` on the server) |
| Base URL | `http://host.docker.internal:1234/v1` (Dify in Docker, LM Studio on host) |
| API key | any non-empty string if LM Studio requires none |
| Model context / dimension | the model's real dim (4096 for Qwen3-8B; smaller for a local model) |

If Dify runs on a different host than LM Studio, use the GPU host's private IP:
`http://<gpu-host-ip>:1234/v1` (and firewall the port).

## 3. Use it in a Knowledge Base

When creating a Knowledge Base in Dify, choose **high quality** indexing and select the
LM Studio embedding model. All documents sent via the portal will then be embedded through
LM Studio and stored in Qdrant.

## Troubleshooting

- **Dify can't reach LM Studio:** on Linux ensure `extra_hosts: host.docker.internal:host-gateway`
  is set for the Dify `api`/`worker` (see the compose override). Test from inside the container:
  `docker compose exec api curl http://host.docker.internal:1234/v1/models`.
- **Dimension mismatch / `degraded` health:** `LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION` must equal
  the loaded model's actual output (4096 for Qwen3-8B, or your local model's dim; `0` disables the
  check). This is a diagnostic signal only — it does not block ingestion.
- **Slow / OOM:** the 8B model needs a real GPU; on CPU-only / smaller hosts use a smaller embedding
  model for testing and set `LM_STUDIO_EMBEDDING_MODEL`, `LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION`,
  **and the Dify provider's Model name + dimension** to that model. Switch back to
  `Qwen3-Embedding-8B` / 4096 on the GPU server (with fresh Dify datasets — see DEPLOYMENT.md §7).
