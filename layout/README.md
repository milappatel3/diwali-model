# layout/ — the 2027 layout as edited in the app

- `plan-2027.json`: the hall exhibition (every wall, set piece, poster, zone), the same data as Plan & light map and Campus 3D.
- `campus-2027.json`: the campus edits (Multi Room doors, zones, signs …).

Edit in the app (Campus plan or Plan & light map), then **Campus plan → Layout ↔ repo → Save & push**. Items with a
"Note for Claude" carry it in `params.ask`. After Claude pushes changes here, pull and click **Load the repo layout**.
Saving and pushing only work with `npm run dev` on your computer.
