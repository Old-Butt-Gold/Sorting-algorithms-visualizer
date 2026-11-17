# Sortlab — Algorithm Observatory

A night-lab visualizer for sixteen sorting algorithms. Every comparison, swap, write and pivot is logged as a typed operation, snapshotted, verified against a sorted copy, and replayed on one `requestAnimationFrame` loop. Scrubbing is exact and deterministic, including backwards.

## Run it

Open `index.html` directly, or serve the folder with any static server:

```sh
npx serve .
```

No build step, package manager, framework or CDN dependency is required at runtime. Fonts are progressive enhancement and fall back to system sans/mono faces.

## What is inside

- **16 algorithms** — bubble, cocktail shaker, insertion, binary insertion, selection, shell, merge, quicksort (Lomuto/Hoare with last, random or median-of-three pivot), heap, comb, gnome, counting, radix LSD, timsort, odd–even and Bogo.
- **Deterministic replay** — seeded mulberry32 RNG, visible/copyable seed, shareable URL, exact forward and reverse seek.
- **Truthful metrics** — real comparison, swap and write counts from the operation log; complexity and stability badges describe the algorithm, not the animation.
- **Sound** — a five-note pentatonic mapping of values with triangle/sine voices, bounded polyphony and a 30–60 ms envelope.
- **Race and compare** — two to four lanes on the same input and seed, or all fifteen non-Bogo algorithms in one table.
- **Render modes** — bars, dots, gradient and disparity views, plus the merge buffer, radix/counting lanes and a heap tree.
- **Exports** — PNG of the current frame, CSV of the array, JSON of the run, and a configuration link.
- **Responsive and accessible** — keyboard transport, labelled controls, reduced-motion handling, a 360 px layout, and no horizontal overflow.

## Architecture

```
js/
  algorithms/   pure generators: arrays + operation helpers, never the DOM
  engine/       typed ops, portable logs/snapshots, seek, blob worker, playback
  render/       canvas renderer for bars, dots, gradient, disparity, tree and aux
  audio/        Web Audio pentatonic engine
  state/        config, palettes, URL state, seeded RNG, utilities
  ui/           controls, pseudocode, comparison lab, overlays, exports, app controller
css/            theme tokens, layout, components
index.html      DOM, script order, dialogs and export menu
```

The browser loads classic scripts through a small `SAV` namespace so the app works from `file://`. Logs can be written asynchronously: inputs above 2000 elements are generated in a Blob Web Worker, and snapshots are built on the main thread.

## Keyboard

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Step one operation |
| `Home` / `End` | Jump to the first / last operation |
| `N` | New array and seed |
| `R` | Rebuild with the same seed |
| `M` | Mute / unmute |
| `1`–`9` | Pick one of the first nine algorithms |
| `Esc` | Close menus and dialogs |
