# NovelX Way 1

Open `index.html` directly in a browser. The current page is a self-contained scroll prototype and does not require a build step or network connection.

## Current experience

The main page follows a video seed as it grows through NovelX into inspiration, a world atlas, character material, causal relationships, and an archived creative project. GSAP and ScrollTrigger drive the responsive scroll narrative.

The previous five-screen concept remains available at `five-screen-v1.html`. The earlier A/B/C direction comparison remains available at `directions.html`.

For local HTTP preview:

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765/`.

## Deployment

GitHub Pages publishes the current redesign automatically after every push to
`main`. The deployed `/` route uses `redesign-v2.html`; the previous prototype
remains available at `/legacy.html`.

The intended custom domain is `novelx.qianc.ltd`. Configure its DNS as a CNAME
to `qianchencc.github.io` after the Pages site has been enabled.

## Assets

The current four-scene page uses the user-supplied studio background, NovelX workbench composition, and logo. No new image was generated for this revision and no API credential is stored in this directory.

PNG originals are preserved in `assets/`. GSAP 3.13.0, ScrollTrigger, and Outfit are vendored locally.

## Limits

This is a presentation prototype, not implementation evidence for complete Agent, GM, Writer, Checker, image generation, Player Lens, or Runtime V2 behavior. The NovelX repository was not modified.
