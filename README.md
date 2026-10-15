# PACE project website

Static homepage for **PACE: Phase-Aware Chunk Execution for Robot Policies with Action Chunking** (NeurIPS 2026).

## Preview

From this directory:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000/. No build step is required.

## Publish with GitHub Pages

Push this directory to a dedicated repository. In **Settings → Pages**, select **Deploy from a branch**, the `main` branch, and `/(root)`.

The entry point is `index.html`; all local assets use relative paths so the site also works under a project subdirectory.

## Resource links

- Code: https://github.com/niejunnan25/RoboTwin-PACE
- Hugging Face: https://huggingface.co/niejunnan25/pi05-robotwin
- Paper: temporarily uses the same Hugging Face URL.

The hero and real-robot comparison images remain labeled video placeholders.

See [asset credits](ASSET_CREDITS.md) for third-party icons and font licensing.
