# LM Studio (OpenAI-compatible embedding/LLM provider)

LM Studio serves `Qwen/Qwen3-Embedding-8B` (dimension **4096**) over an OpenAI-compatible API.
Dify connects to it as an OpenAI-compatible model provider. The portal only uses LM Studio for
health/diagnostics — it never generates document embeddings itself.

## 1. Start the LM Studio Server

- GUI: LM Studio → **Developer / Local Server** tab → Start Server (default port `1234`).
- CLI (headless):

  ```bash
  lms server start --port 1234
  # verify
  lms server status
  ```

## 2. Load the embedding model

Download `Qwen/Qwen3-Embedding-8B` (or a GGUF variant) in LM Studio and load it.

Quantization guidance:

- Prefer **F16** or **Q8_0** for embedding quality.
- Do **not** start production embeddings on **Q4** without a quality test first.

## 3. Verify the endpoints

```bash
# list loaded models
curl http://localhost:1234/v1/models

# test an embedding — check the returned vector length == 4096
curl http://localhost:1234/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3-embedding-8b","input":"health check"}'
```

## 4. Connect LM Studio to Dify

- Base URL: `http://host.docker.internal:1234/v1` (Dify in Docker, LM Studio on the host).
  On the same host without Docker networking quirks you may also use `http://<host-ip>:1234/v1`.
- Model name: `qwen3-embedding-8b` (or the exact identifier LM Studio reports in `/v1/models`).
- API key: any non-empty string if LM Studio does not require one.

Details: [../../docs/LM_STUDIO_DIFY_PROVIDER_SETUP.md](../../docs/LM_STUDIO_DIFY_PROVIDER_SETUP.md).

## 5. Run as a service (Linux)

See `systemd-lmstudio.example.service`. Install it as `/etc/systemd/system/lmstudio.service`,
then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lmstudio
```

## Security

- If LM Studio binds to `0.0.0.0`, **close port 1234 with a firewall** so it is reachable only
  from Dify (localhost / private network). Never expose it to the public internet.
