#!/usr/bin/env python3
"""DWG (as JSON from scripts/dwg2json.mjs) -> lib/campus.json  (feet, hall frame: origin = Assembly Hall SW interior corner).
usage: python3 scripts/extract_campus.py db.json lib/campus.json
"""
import json, math, sys, collections
from shapely.geometry import LineString, Polygon, MultiPolygon, Point, box
from shapely.ops import unary_union
from shapely import affinity

DB, OUT = sys.argv[1], sys.argv[2]
OX, OY = 45224.6, 815.3           # DWG inches of hall origin
d = json.load(open(DB)); E = d['entities']
short = lambda l: l.split('$0$')[-1].lower()
def F(x, y): return ((x - OX) / 12.0, (y - OY) / 12.0)

def arc_wcs(e):
    c = e['center']; cx, cy, r, a0, a1 = c['x'], c['y'], e['radius'], e['startAngle'], e['endAngle']
    if (e.get('extrusionDirection') or {}).get('z', 1) < 0:   # OCS flipped: mirror x, swap/reflect angles
        cx = -cx; a0, a1 = math.pi - e['endAngle'], math.pi - e['startAngle']
    return cx, cy, r, a0, a1

def lines(e):
    t = e['type']
    if t == 'LINE': return [[(e['startPoint']['x'], e['startPoint']['y']), (e['endPoint']['x'], e['endPoint']['y'])]]
    if t == 'LWPOLYLINE':
        v = [(p['x'], p['y']) for p in e.get('vertices', [])]
        if len(v) > 1:
            if e.get('flag', 0) & 1: v.append(v[0])
            return [v]
    if t == 'ARC':
        cx, cy, r, a0, a1 = arc_wcs(e)
        if a1 < a0: a1 += 2 * math.pi
        n = max(4, int((a1 - a0) / 0.3)); return [[(cx + r * math.cos(a0 + (a1 - a0) * i / n), cy + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]]
    if t == 'CIRCLE':
        c = e['center']; r = e['radius']; return [[(c['x'] + r * math.cos(i / 24 * 2 * math.pi), c['y'] + r * math.sin(i / 24 * 2 * math.pi)) for i in range(25)]]
    return []

def hatch_polys(e):
    out = []
    for bp in e.get('boundaryPaths', []):
        pts = []
        if 'edges' in bp:
            for ed in bp['edges']:
                if ed['type'] == 1: pts += [(ed['start']['x'], ed['start']['y']), (ed['end']['x'], ed['end']['y'])]
                elif ed['type'] == 2:
                    c = ed['center']; r = ed['radius']; a0 = ed['startAngle']; a1 = ed['endAngle']
                    if not ed.get('isCCW', True): a0, a1 = a1, a0
                    if a1 < a0: a1 += 2 * math.pi
                    n = max(3, int((a1 - a0) / 0.3)); pts += [(c['x'] + r * math.cos(a0 + (a1 - a0) * i / n), c['y'] + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
        elif 'vertices' in bp: pts = [(v['x'], v['y']) for v in bp['vertices']]
        if len(pts) >= 3:
            p = Polygon(pts)
            if not p.is_valid: p = p.buffer(0)
            if p.area > 0: out.append(p)
    return out

def parts(g):
    if g.is_empty: return []
    if isinstance(g, Polygon): return [g]
    return [p for p in getattr(g, 'geoms', []) if isinstance(p, Polygon)] + [q for p in getattr(g, 'geoms', []) if not isinstance(p, Polygon) for q in parts(p)]

R = lambda v: round(v, 2)
def ring(coords): return [[R(x), R(y)] for x, y in (F(*c) for c in coords)]
def poly_out(p, tol=1.5):
    p = p.simplify(tol)
    if p.is_empty or p.area < 20: return None
    return {'o': ring(list(p.exterior.coords)[:-1]), 'h': [ring(list(h.coords)[:-1]) for h in p.interiors if Polygon(h).area > 20]}

# ───────── building walls ─────────
WALL_EXT = {'a-wall', 'a-wall-exist', 'a-wall-fr'}
WALL_INT = {'i-wall', 'i-wall-e', 'i-wall-office', 'i-wall-pat'}
hat, ls_ext, ls_int, big = [], [], [], []
for e in E:
    s = short(e['layer'])
    if e['type'] == 'HATCH' and (s in WALL_EXT | WALL_INT or s == 'a-wall-patt'):
        for p in hatch_polys(e):
            (big if p.area > 150000 else hat).append(p)
    elif s in WALL_EXT: ls_ext += [l for l in lines(e) if len(l) > 1]
    elif s in WALL_INT: ls_int += [l for l in lines(e) if len(l) > 1]
def close(lns, gap):
    g = unary_union([LineString(l) for l in lns]).buffer(gap, cap_style=2, join_style=2, resolution=2)
    return g.buffer(-gap + 0.4, cap_style=2, join_style=2)
ext_mass = close(ls_ext, 4); int_mass = close(ls_int, 4)
hat_u = unary_union(hat)
mass = unary_union([ext_mass, int_mass, hat_u]).buffer(0)

# region "not in plan" (west tenant space) = the big existing-conditions hatch
oop = unary_union(big) if big else Polygon()
# tall zones (halls drawn at full height): DWG inches boxes
TALL = unary_union([
    box(45150, 780, 47200, 1980),   # Assembly Hall + stage
    box(45100, 2050, 46700, 3200),  # Mahila Sabha Hall
    box(43300, 2250, 44550, 3150),  # Gymnasium (high ceiling)
    box(44300, 2130, 45040, 2920),  # Mandir Hall (x -75..-17 ft, y 111..174 ft)
])
H_EXT, H_INT, H_TALL = 22.0, 12.0, 22.0
tall_m = mass.intersection(TALL).buffer(0)
rest = mass.difference(TALL).buffer(0)
walls = []
for grp, g, h in (('oop', rest.intersection(oop), H_INT + 4), ('tall', tall_m.difference(oop), H_TALL), ('int', rest.difference(oop), H_INT)):
    for p in parts(g):
        o = poly_out(p)
        if o: o['g'] = grp; o['z'] = h; walls.append(o)
# exterior walls get full height: those from ext layers outside TALL
ext_only = ext_mass.difference(TALL).difference(oop).buffer(0)
ext_walls = [o for p in parts(ext_only) if (o := poly_out(p))]
for o in ext_walls: o['g'] = 'ext'; o['z'] = H_EXT
walls += ext_walls

# ───────── glazing + doors ─────────
glass = set()
for e in E:
    s = short(e['layer'])
    if s.startswith('a-glaz') and e['type'] in ('LINE', 'LWPOLYLINE'):
        for l in lines(e):
            for a, b in zip(l, l[1:]):
                L = math.hypot(b[0] - a[0], b[1] - a[1])
                if L >= 14:
                    x0, y0 = F(*a); x1, y1 = F(*b)
                    k = tuple(sorted([(round(x0, 1), round(y0, 1)), (round(x1, 1), round(y1, 1))]))
                    glass.add(k)
# merge near-duplicate parallel frames (A-Glaz-Fram/Blow share extents)
gl = []; seen = set()
for (a, b) in sorted(glass):
    kk = (round((a[0] + b[0]) / 2 * 1.0), round((a[1] + b[1]) / 2 * 1.0), round(math.atan2(b[1] - a[1], b[0] - a[0]) % math.pi, 1), round(math.hypot(b[0] - a[0], b[1] - a[1])))
    if kk in seen: continue
    seen.add(kk); gl.append([R(a[0]), R(a[1]), R(b[0]), R(b[1])])
doors = []
glz_lines = [LineString(l) for e in E if short(e['layer']).startswith('a-glaz') and e['type'] in ('LINE', 'LWPOLYLINE') for l in lines(e) if len(l) > 1]
mass_prep = unary_union([mass] + glz_lines)
for e in E:
    s = short(e['layer'])
    if 'door' not in s: continue
    ext = '-ext' in s
    if e['type'] == 'LWPOLYLINE' and len(e.get('vertices', [])) == 4:
        v = [(p['x'], p['y']) for p in e['vertices']]
        xs = [p[0] for p in v]; ys = [p[1] for p in v]
        w, h = max(xs) - min(xs), max(ys) - min(ys)
        p = Polygon(v).minimum_rotated_rectangle
        c = list(p.exterior.coords)
        sides = sorted([math.hypot(c[i + 1][0] - c[i][0], c[i + 1][1] - c[i][1]) for i in range(2)])
        if 24 <= sides[1] <= 60 and sides[0] <= 4.5:
            doors.append({'t': 'leaf', 'r': ring(c[:-1]), 'x': int(ext)})
    elif e['type'] == 'ARC' and 24 <= e['radius'] <= 60 and (e['endAngle'] - e['startAngle']) % (2 * math.pi) > 0.5 and not math.isnan(e['radius']):
        cx, cy, r, a0, a1 = arc_wcs(e)
        c = {'x': cx, 'y': cy}
        p0 = (cx + r * math.cos(a0), cy + r * math.sin(a0)); p1 = (cx + r * math.cos(a1), cy + r * math.sin(a1))
        # the closed-leaf end is the one that touches wall mass
        d0, d1 = Point(p0).distance(mass_prep), Point(p1).distance(mass_prep)
        pc = p0 if d0 < d1 else p1
        if min(d0, d1) > 30: continue            # no wall/glazing at either end: not a framed opening
        doors.append({'t': 'open', 'a': [R(v) for v in F(c['x'], c['y'])], 'b': [R(v) for v in F(*pc)], 'x': int(ext)})

# ───────── rooms ─────────
rooms = []
for e in E:
    if e['type'] == 'INSERT' and e.get('name') == 'Aec_Room_Tag_P':
        a = {x['tag']: x['text']['text'].strip() for x in e['attribs']}
        n = (a.get('ROOM:NAME2', '') + ' ' + a.get('ROOM:NAME1', '')).strip()
        if n:
            x, y = F(e['insertionPoint']['x'], e['insertionPoint']['y']); rooms.append({'n': n.title(), 'x': R(x), 'y': R(y)})

# ───────── building footprint (traced from the plan, DWG inches) ─────────
FOOT = Polygon([(40106, 1150), (41330, 1150), (41330, 1010), (41480, 870), (41700, 740), (41880, 740), (41880, 505), (46900, 505), (47163, 760), (47163, 3180), (40106, 3180)])
# parts of the plan that stick out of the box (north additions) are left to the wall mass
foot = {'o': ring(list(FOOT.exterior.coords)[:-1])}
oop_poly = poly_out(oop, 3) if not oop.is_empty else None

# ───────── site ─────────
curb_l, pk, fence, rail, walkpoly, conc = [], [], [], [], [], []
ada, hyd = [], []
for e in E:
    s = short(e['layer'])
    if s == 'l-site-curb' and e['type'] != 'TEXT': curb_l += [l for l in lines(e) if len(l) > 1]
    elif s in ('l-site-pkng', 'c-park-exst') and e['type'] == 'LINE':
        (a, b) = lines(e)[0]; L = math.hypot(b[0] - a[0], b[1] - a[1])
        if 20 < L < 300: pk.append([R(v) for v in F(*a) + F(*b)])
    elif s == 'l-site-fence' and e['type'] in ('LINE', 'ARC', 'LWPOLYLINE'): fence += [l for l in lines(e) if len(l) > 1]
    elif s == 'a-rail-new' and e['type'] in ('LINE', 'LWPOLYLINE'): rail += [l for l in lines(e) if len(l) > 1]
    elif s == 'a-walk-new' and e['type'] == 'HATCH': walkpoly += hatch_polys(e)
    elif s == 'a-walk-new' and e['type'] == 'LWPOLYLINE' and e.get('flag', 0) & 1 and len(e['vertices']) >= 3:
        p = Polygon([(v['x'], v['y']) for v in e['vertices']]).buffer(0)
        if p.area > 3000: walkpoly.append(p)
    elif s == 'l-site-conc': conc += [l for l in lines(e) if len(l) > 1]
    if e['type'] == 'INSERT':
        nm = e.get('name', '').lower()
        if 'handisym' in nm: ada.append([R(v) for v in F(e['insertionPoint']['x'], e['insertionPoint']['y'])] + [R(math.degrees(e.get('rotation', 0)))])
        if 'hydrant' in nm: hyd.append([R(v) for v in F(e['insertionPoint']['x'], e['insertionPoint']['y'])])
# paved region = convex hull of curb + stalls, trimmed to the property
allpts = [pt for l in curb_l for pt in l] + [pt for l in pk for pt in [(l[0] * 12 + OX, l[1] * 12 + OY), (l[2] * 12 + OX, l[3] * 12 + OY)]]
hull = unary_union([Point(p) for p in allpts]).convex_hull
# planters / islands = faces bounded by curbs
from shapely.ops import polygonize
faces = list(polygonize(unary_union([LineString(l) for l in curb_l])))
walk_u = unary_union(walkpoly) if walkpoly else Polygon()
planters, sidewalks = [], []
for f in faces:
    sf = f.area / 144
    if sf < 40 or f.intersects(FOOT.buffer(-60)): continue
    ov = f.intersection(walk_u).area / f.area if not walk_u.is_empty else 0
    mrr = f.minimum_rotated_rectangle.exterior.coords
    sides = sorted([math.hypot(mrr[i + 1][0] - mrr[i][0], mrr[i + 1][1] - mrr[i][1]) for i in range(2)])
    strip = sides[0] < 150 and sides[1] > 600 and f.distance(FOOT) < 200     # raised sidewalk hugging the building
    (sidewalks if (ov > 0.5 or strip) else planters).append(f)
for p in parts(walk_u): sidewalks.append(p)
def pl_out(ps, tol=2.5): return [o for p in ps for q in parts(p) if (o := poly_out(q, tol))]
trees = []
import random; rnd = random.Random(7)
for f in planters:
    minw = f.buffer(-36).area
    if minw <= 0: continue
    n = min(6, 1 + int(f.area / 144 / 500))
    g = f.buffer(-30)
    tries = 0
    while n > 0 and tries < 60:
        tries += 1
        minx, miny, maxx, maxy = g.bounds
        p = Point(rnd.uniform(minx, maxx), rnd.uniform(miny, maxy))
        if g.contains(p): trees.append([R(v) for v in F(p.x, p.y)] + [R(rnd.uniform(0.8, 1.25))]); n -= 1
# parking slots: a stall is bounded by two parallel lines ~9 ft apart; its centre is 4.5 ft from each
def mid(l): return ((l[0] + l[2]) / 2, (l[1] + l[3]) / 2)
SL = [[l[0] * 12 + OX, l[1] * 12 + OY, l[2] * 12 + OX, l[3] * 12 + OY] for l in pk if 150 < math.hypot((l[2] - l[0]) * 12, (l[3] - l[1]) * 12) < 260]
slots = {}
avoid = unary_union([f.buffer(-12) for f in planters] + [FOOT.buffer(24)])
for (x0, y0, x1, y1) in SL:
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2; ang = math.atan2(y1 - y0, x1 - x0)
    nx, ny = -math.sin(ang), math.cos(ang)
    for sgn in (1, -1):
        cx, cy = mx + sgn * nx * 54, my + sgn * ny * 54
        ox, oy = mx + sgn * nx * 108, my + sgn * ny * 108
        if not any(math.hypot((a + c_) / 2 - ox, (b + d) / 2 - oy) < 24 for a, b, c_, d in SL): continue
        if avoid.contains(Point(cx, cy)): continue
        k = (round(cx / 36), round(cy / 36))
        slots[k] = [R(v) for v in F(cx, cy)] + [R(math.degrees(ang) % 180)]
poles = []
for f in planters:
    if f.area / 144 >= 150 and f.centroid.within(f.buffer(-24)): poles.append([R(v) for v in F(f.centroid.x, f.centroid.y)])
site = {
    'hull': ring(list(hull.exterior.coords)[:-1]),
    'planters': pl_out(planters),
    'walks': pl_out(sidewalks),
    'stalls': pk,
    'fences': [[R(v) for v in (F(*a) + F(*b))] for l in fence for a, b in zip(l, l[1:]) if math.hypot(b[0] - a[0], b[1] - a[1]) > 8],
    'rails': [[R(v) for v in (F(*a) + F(*b))] for l in rail for a, b in zip(l, l[1:]) if math.hypot(b[0] - a[0], b[1] - a[1]) > 8],
    'conc': [[R(v) for v in (F(*a) + F(*b))] for l in conc for a, b in zip(l, l[1:]) if math.hypot(b[0] - a[0], b[1] - a[1]) > 8],
    'curbs': [[R(v) for v in (F(*a) + F(*b))] for l in curb_l for a, b in zip(l, l[1:]) if math.hypot(b[0] - a[0], b[1] - a[1]) > 6],
    'trees': trees, 'ada': ada, 'hydrants': hyd, 'slots': list(slots.values()), 'poles': poles,
}
roof_all = FOOT.difference(oop.buffer(2)) if not oop.is_empty else FOOT
HALLBOX = box(OX - 12, OY - 12, OX + 162 * 12, OY + 96.5 * 12)
roofs = {'all': [o for q in parts(roof_all) if (o := poly_out(q, 2))],
         'noHall': [o for q in parts(roof_all.difference(HALLBOX)) if (o := poly_out(q, 2))],
         'oop': poly_out(oop, 3) if not oop.is_empty else None}
out = {'meta': {'units': 'ft', 'origin_dwg_in': [OX, OY], 'heights': {'ext': H_EXT, 'int': H_INT, 'tall': H_TALL}},
       'footprint': foot, 'notInPlan': oop_poly, 'walls': walls, 'glass': gl, 'doors': doors, 'rooms': rooms, 'roofs': roofs, 'site': site}
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
import os
print('walls', len(walls), 'glass', len(gl), 'doors', len(doors), 'rooms', len(rooms), 'planters', len(site['planters']), 'walks', len(site['walks']), 'stalls', len(pk), 'fences', len(site['fences']), 'curbs', len(site['curbs']), 'trees', len(trees), 'slots', len(slots), 'poles', len(poles))
print('bytes', os.path.getsize(OUT))
