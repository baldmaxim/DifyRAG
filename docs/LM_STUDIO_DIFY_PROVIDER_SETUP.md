# LM Studio as a Dify model provider

## 1. Start LM Studio + load the embedding model

- Start the server on port `1234` (`lms server start --port 1234` or the GUI Local Server tab).
- Load `Qwen/Qwen3-Embedding-8B` (F16 or Q8_0 recommended; avoid Q4 for production without testing).
- Verify: `curl http://localhost:1234/v1/models` and a test `/v1/embeddings` call returning a
  vector of length **4096**.

## 2. Add the provider in Dify

Dify console → **Settings → Model Provider → OpenAI-API-compatible** → Add:

| Field | Value |
|---|---|
| Model type | Text Embedding |
| Model name | `qwen3-embedding-8b` (must match `/v1/models`) |
| Base URL | `http://host.docker.internal:1234/v1` (Dify in Docker, LM Studio on host) |
| API key | any non-empty string if LM Studio requires none |
| Model context / dimension | 4096 |

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
- **Dimension mismatch:** the portal's `LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION=4096` must match the
  model's actual output; a mismatch shows the LM Studio health as `degraded`.
- **Slow / OOM:** the 8B model needs a real GPU; on CPU-only hosts use a smaller embedding model
  for testing and switch to `Qwen3-Embedding-8B` on the GPU server.
