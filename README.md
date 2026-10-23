# PACE project website

Static homepage for **PACE: Phase-Aware Chunk Execution for Robot Policies with Action Chunking** (NeurIPS 2026), served by GitHub Pages at https://niejunnan25.github.io/pace-project/.

## Preview

Any static server works; use one that supports HTTP Range requests so the overview film can seek, for example:

```bash
npx serve .
```

`python3 -m http.server` also serves the page, but it ignores Range requests, so seeking in the film only works within the buffered part.

## Rebuild first-screen data

After editing page data, `assets/js/hero.js`, `assets/js/media.js`, `assets/js/page-loader.js`, or an external CSS/JS asset, run:

```bash
python3 scripts/build-hero.py
```

This regenerates static author information, the inline wall renderer, all wall curves, the media loader, and the small real-robot curve file. Wall speed samples use lossless signed-delta/varint encoding; the renderer decodes only selected queries and caches the result. All wall cards work before the full-page scripts arrive. The original `pace-chunks.js` remains the build source and is not requested by the page. Offscreen posters and video sources attach near the viewport; the overview film downloads when played. Full-page scripts begin downloading after the first hero paint and the poster or first video frame is available, using browser idle time. Scrolling, navigation, keyboard browsing, and direct section links start those downloads immediately. Background playback also starts after the first paint; no stage waits for the complete video. The script also adds content-based versions to external CSS/JS URLs so browsers can cache resources without mixing old scripts with new HTML. Rebuild before committing generated HTML; there is no runtime build step or service worker.

## Publish with GitHub Pages

In **Settings → Pages**, select **Deploy from a branch**, the `main` branch and `/(root)`. The entry point is `index.html`; all assets use relative paths, so the site works under the project subdirectory.

## Layout

| Path | Content |
|---|---|
| `index.html`, `style.css`, `app.js` | The page ("Light" design). |
| `assets/data/pace-data.js` | Every number and text block shown on the page: camera-ready abstract and tables, the Figure 3 chunks recomputed with `pace.core.select_horizon` (H = 32, 14, 37, 25, 19, 17), fixed-horizon sweeps, clip manifests, BibTeX. |
| `assets/data/pace-chunks.js` | Smoothed predicted joint-command speed per arm for every clip on the video wall and both real-robot clips, recomputed from the logged action chunks; every recomputed horizon equals the logged one. |
| `assets/js/pace-kit.js` | Small helpers: PACE's selection rule, video sync, copy buttons. |
| `assets/media/` | Overview film, the pre-rendered video wall, one recorded PACE rollout per RoboTwin 2.0 task, the Figure 3 rollout and two real ALOHA rollouts. |
| `assets/paper/PACE.pdf` | The paper. Replace this file to publish an updated paper at the same URL. |

## Resource links

- Code: https://github.com/niejunnan25/PACE
- Hugging Face: https://huggingface.co/niejunnan25/pi05-robotwin
- Paper: [PDF](assets/paper/PACE.pdf), hosted with this website; [arXiv](https://arxiv.org/abs/2606.00537).

See [asset credits](ASSET_CREDITS.md) for third-party icons and font licensing.
