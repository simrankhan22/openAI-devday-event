# Portalbound

A browser game prototype about exploring a magical sci-fi world by giving sensible prompts to the objects around you.

## Run locally

The 3D scene imports Three.js as an ES module, so serve this folder over HTTP instead of opening `index.html` directly. From this folder, run:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000` in a modern browser. The first load needs an internet connection for the Three.js module and web fonts.

## Controls

- `W`, `A`, `S`, `D` to move; hold `Shift` to run.
- Click an object to focus it, then write an action in the prompt box and press `Enter`.
- Right-drag to look around.
- Use the `?` button for the controls and the field notes panel for spell hints.

The current version contains seven themed stages and uses a small set of built-in phrase rules for each level. A successful action opens the portal to the next stage. After three unsuccessful prompts in a level, a contextual hint appears in the mission card and stays visible until the player moves on.
