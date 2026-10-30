# Lightplot — Diwali Exhibition 2026 lighting & space designer

Next.js 16 app (Showcaller styling) for laying out the exhibition in the Assembly Hall at 1430 California Circle, Milpitas, and checking lighting with real photometrics.

    npm install
    npm run dev          # http://localhost:3000
    npm run export       # static build in ./out (works from any sub-path)
    npx tsx scripts/calc.ts   # headless lux report for the default plan

## Where things come from
- **Hall geometry** — `lib/hall.ts` and `lib/dwgContext.json`, extracted from `Hindu_Temple_Milpitas_Campus.dwg`. Origin = SW interior corner of the hall (DWG 45224.6, 815.3 in). Units are feet.
- **Exhibit content** — `lib/content.ts`: the Final Content Proposal plus the linked content doc (16 samskaras, festivals, nodes, values).
- **Default layout** — `lib/project.ts`, which follows the client sketch.
- **Fixtures** — `lib/fixtures.ts`. Design values for the owned kit and the AliExpress candidates. Calibrated against Chauvet/ADJ/Stairville photometric reports, with a ×0.85 thermal derate.

## Photometric engine (`lib/engine.ts`, runs in a Web Worker)
- **Direct light** from every fixture, using Gaussian or flat-top beam profiles normalised to lumens.
- **Shadows** by ray-casting against every solid.
- **Sheer-fabric ceilings**: a share of the light passes straight through, and the rest is re-emitted as glowing patches.
- **Bounce light** per space, using the room-cavity method E = Φr / (A·(1−ρ)). Drape along a wall replaces that wall's paint with fabric; free-standing drape adds two fabric faces.
- **Faces** at 5.25 ft are measured in 8 directions plus cylindrical illuminance.
- **Phone ISO** assumes f/1.8 at 1/60 s, i.e. ISO ≈ 48,600 / lux.
- **Checks** cover CRI, tint, key-light elevation and side-to-side balance.

The 3D view (react-three-fiber) uses the same sources, in candela. Phone mode meters like a phone camera: it samples a grid of points in view (illuminance on the real surface × its reflectance), exposes the log-average to mid-grey, and pulls back if the brightest tenth would clip. The result goes through an AgX tone curve. Bloom is scaled to the exposure so lit walls don't veil the picture.

## Pipe & drape and light pipes
- Every drape run has `lightPipe`, `valance` and `sharedEnds` options.
- **lightPipe**: heavy-duty 2″ uprights, 35 lb bases with sandbags, a 1½″ steel pipe on top, and bays of at most 8′. Fixtures hang on 12″ side arms (`rig` = the run's id, `u` = feet along the run). They hang on whichever side their aim point is on.
- **Loads**: checked at about 30 lb per 8′ bay.
- **On the plan**: drag a drape-hung fixture to slide it along its run.
