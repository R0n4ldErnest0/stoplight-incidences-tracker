# Construye src/data/lima-callao-distritos.json (simplificado) desde el GeoJSON del IGN.
import json, sys
from shapely.geometry import shape, mapping

src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src, encoding='utf-8'))

# Nombres con tildes rotas en la fuente.
FIX = {'BRE': 'BREÑA', 'MI PER': 'MI PERÚ'}


def clean(name):
    if not name.isascii():
        for pre, good in FIX.items():
            if name.startswith(pre):
                return good
    return name


def rnd(o):
    if isinstance(o, (list, tuple)):
        if o and isinstance(o[0], (int, float)):
            return [round(o[0], 5), round(o[1], 5)]
        return [rnd(x) for x in o]
    return o


feats = []
for f in d['features']:
    g = shape(f['geometry']).simplify(0.0002, preserve_topology=True)
    p = f['properties']
    feats.append({
        'type': 'Feature',
        'properties': {'name': clean(p['distrito']), 'provincia': p['provincia']},
        'geometry': {'type': g.geom_type, 'coordinates': rnd(mapping(g)['coordinates'])},
    })

json.dump({'type': 'FeatureCollection', 'features': feats}, open(out, 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
print(len(feats), 'features; non-ascii:', sorted(f['properties']['name'] for f in feats if not f['properties']['name'].isascii()))
