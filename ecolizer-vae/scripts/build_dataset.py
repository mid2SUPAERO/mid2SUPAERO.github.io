"""Curate the Ecolizer 2.0 tables into tidy CSV files.

Source of truth for the impact numbers: the OVAM Ecolizer 2.0 PDF (parsed by parse.py, steel sheet read by eye
because that page is a raster image).  rho (kg/m3) and E (GPa) are NOT in the PDF: they are typical handbook
values added by the course author's assistant, rounded, and flagged by `props_approx`.
"""
import json, re, csv, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
R = {r['page']: r for r in json.load(open(os.path.join(HERE, 'parsed.json')))}

def num(s):
    if s in (None, 'dna', 'na'): return None
    return float(s.replace(',', '.'))

def sheet_recycling(page):
    r = R[page]
    rec = [i for i in r['items'] if i['section'] == 'recycling']
    d = {}
    for i in rec:
        k = 'proc' if i['label'].lower().startswith(('proces', 'plastics')) else ('saved' if i['label'].startswith('Primary') else ('total' if i['label'].startswith('Total') else None))
        if k: d[k] = num(i['raw'])
    return d

def sheet_waste(page):
    r = R[page]
    w = [i for i in r['items'] if i['section'] == 'waste']
    return num(w[0]['raw']) if w else None

# ---------------------------------------------------------------------------------------------
# family -> (sheet code, page) ; each material: (name, family, subfamily, sheet_page, prod, rho, E, recycling_applies)
# prod in mPt/kg unless converted (flag conv)
# ---------------------------------------------------------------------------------------------
M = []
def add(name, fam, sub, page, prod, rho=None, E=None, rec=False, conv=None, unit_note=None):
    M.append(dict(name=name, family=fam, subfamily=sub, page=page, prod=prod, rho=rho, E=E, rec=rec, conv=conv))

FM, NF, PM, TP, TS, EL, BIO, RP, WD, PP, GC, MN, INS, CH = ('Ferrous metals', 'Non-ferrous metals', 'Precious & critical metals',
    'Thermoplastics', 'Composites & thermosets', 'Elastomers', 'Bio-based plastics', 'Recycled plastics', 'Wood & panels', 'Paper & board',
    'Glass & ceramics', 'Minerals & cement', 'Insulation', 'Chemicals & glues')

# --- ferrous (steel page 26 is an image; values read from the scan) ---
add('Cast iron', FM, 'Iron', 24, 173, 7100, 170, True)
add('Stainless steel 18/8 (primary)', FM, 'Stainless steel', 25, 551, 7900, 195, True)
add('Stainless steel 18/8 (secondary, electric)', FM, 'Stainless steel', 25, 511, 7900, 195)
add('Steel, low-alloyed (converter)', FM, 'Steel', 26, 231, 7850, 210, True)
add('Steel, un-alloyed (converter)', FM, 'Steel', 26, 165, 7850, 210)
add('Steel, low-alloyed (secondary, average)', FM, 'Steel', 26, 195, 7850, 210)
add('Steel, un-/low-alloyed (electric furnace)', FM, 'Steel', 26, 61, 7850, 210)
add('Ferrochromium', FM, 'Ferro-alloys', 27, 379, None, None, True)
add('Ferronickel', FM, 'Ferro-alloys', 28, 1105, None, None, True)
# --- non-ferrous ---
add('Aluminium, primary', NF, 'Aluminium', 30, 1045, 2700, 70, True)
add('Aluminium alloy AlMg3', NF, 'Aluminium', 30, 439, 2660, 70)
add('Aluminium, secondary (old scrap)', NF, 'Aluminium', 30, 134, 2700, 70)
add('Aluminium, secondary (new scrap)', NF, 'Aluminium', 30, 45, 2700, 70)
add('Bronze', NF, 'Copper alloys', 31, 938, 8800, 110, True)
add('Copper', NF, 'Copper alloys', 32, 774, 8900, 120, True)
add('Brass', NF, 'Copper alloys', 33, 683, 8500, 100, True)
add('Brazing solder (Cd-free)', NF, 'Solders', 33, 646)
add('Soft solder', NF, 'Solders', 34, 3347, None, None, True)
add('Lead (primary)', NF, 'Other metals', 35, 135, 11340, 14)
add('Magnesium', NF, 'Other metals', 35, 3768, 1740, 45)
add('Nickel', NF, 'Other metals', 35, 2653, 8900, 200)
add('Titanium zinc plate', NF, 'Other metals', 35, 551, 7140, 105)
add('Zinc (for coating, primary)', NF, 'Other metals', 35, 390, 7140, 105)
add('Titanium dioxide', NF, 'Other metals', 35, 466)
add('Mercury', PM, 'Precious & critical', 35, 1163775)
add('Palladium (primary)', PM, 'Precious & critical', 35, 7119111, 12000, 120)
add('Palladium (secondary)', PM, 'Precious & critical', 35, 63054, 12000, 120)
add('Platinum (primary)', PM, 'Precious & critical', 35, 4661326, 21450, 168)
add('Platinum (secondary)', PM, 'Precious & critical', 35, 63042, 21450, 168)
add('Rhodium (primary)', PM, 'Precious & critical', 35, 9558421, 12400, 380)
add('Rhodium (secondary)', PM, 'Precious & critical', 35, 63545, 12400, 380)
# --- thermoplastics ---
add('ABS', TP, 'ABS', 37, 431, 1050, 2.3, True)
add('EVA', TP, 'EVA', 38, 355, 940, None, False)
add('EVA foil', TP, 'EVA', 38, 345, 940, None)
add('PA 6', TP, 'PA', 39, 756, 1140, 2.8, True)
add('PA 6.6', TP, 'PA', 39, 715, 1140, 2.9)
add('PA 6, glass-filled', TP, 'PA', 39, 624, 1350, 6.0)
add('PA 6.6, glass-filled', TP, 'PA', 39, 612, 1380, 6.5)
add('PC', TP, 'PC', 40, 672, 1200, 2.4, True)
add('LDPE', TP, 'PE', 41, 285, 920, 0.25, True)
add('HDPE', TP, 'PE', 41, 277, 950, 0.9)
add('LLDPE', TP, 'PE', 41, 272, 920, 0.4)
add('PET', TP, 'PET', 42, 327, 1380, 2.8, True)
add('PET (bottle grade)', TP, 'PET', 42, 347, 1380, 2.8)
add('PMMA (beads)', TP, 'PMMA', 43, 676, 1180, 3.0, True)
add('PMMA (cast sheet)', TP, 'PMMA', 43, 768, 1180, 3.0)
add('PP', TP, 'PP', 44, 276, 900, 1.4, True)
add('PS (GPPS)', TP, 'PS', 45, 388, 1050, 3.1, True)
add('PS (expandable)', TP, 'PS', 45, 384)
add('PS (HIPS)', TP, 'PS', 45, 389, 1040, 2.2)
add('PUR rigid foam', TS, 'PUR', 46, 459, 40, 0.03)
add('PUR flexible foam', TS, 'PUR', 46, 484, 30, 0.001)
add('PVC', TP, 'PVC', 47, 220, 1400, 3.0, True)
add('PVDC', TP, 'PVC', 47, 451, 1700, None)
add('SAN', TP, 'SAN', 48, 403, 1080, 3.5, True)
add('PTFE (Teflon)', TP, 'PTFE', 54, 16089, 2170, 0.5)
add('PTFE on glass', TP, 'PTFE', 54, 16929, 2170, None)
# --- recycled plastics (pre-/post-consumer secondary materials; recycling process only) ---
add('Agglomerate, industrial plastics mix', RP, 'Recycled plastics', 49, 62)
add('Agglomerate, household plastics mix', RP, 'Recycled plastics', 49, 93)
add('Ground product, industrial plastics mix', RP, 'Recycled plastics', 49, 64)
add('Ground product, household plastics mix', RP, 'Recycled plastics', 49, 95)
add('Regranulate, industrial plastics mix', RP, 'Recycled plastics', 49, 70)
add('Regranulate, household plastics mix', RP, 'Recycled plastics', 49, 87)
# --- bio-based plastics, composites ---
add('Modified starch', BIO, 'Bioplastics', 51, 275, 1300, 1.0)
add('PLA', BIO, 'Bioplastics', 51, 312, 1250, 3.5)
add('GFRP, polyester resin', TS, 'Composites', 52, 455, 1800, 20)
add('GF-reinforced PP', TS, 'Composites', 52, 359, 1500, 7)
add('Kevlar-reinforced epoxy', TS, 'Composites', 52, 1249, 1350, 30)
add('CF-reinforced PP', TS, 'Composites', 52, 620, 1400, 25)
add('CFRP, epoxy', TS, 'Composites', 52, 883, 1550, 70)
add('Flax-reinforced PP', TS, 'Composites', 52, 383, 1100, 4)
add('Epoxy resin (liquid)', TS, 'Resins & fibres', 52, 734, 1150, 3.0)
add('Polyester resin, unsaturated', TS, 'Resins & fibres', 52, 644, 1200, 3.5)
add('Glass fibre', TS, 'Resins & fibres', 52, 264, 2600, 72)
add('Carbon fibre', TS, 'Resins & fibres', 52, 833, 1800, 230)
add('Polyester fibres', TS, 'Resins & fibres', 52, 660)
add('Flax fibres', TS, 'Resins & fibres', 52, 350, 1450, 50)
# --- elastomers ---
add('EPDM (vulcanised)', EL, 'Rubber', 53, 355, 860, 0.005)
add('Latex', EL, 'Rubber', 53, 230, 920, 0.002)
add('Natural rubber', EL, 'Rubber', 53, 599, 920, 0.002)
add('Polybutadiene rubber', EL, 'Rubber', 53, 444, 910, 0.002)
add('SBR', EL, 'Rubber', 53, 453, 940, 0.003)
add('Silicones', EL, 'Rubber', 53, 274, 1250, 0.005)
# --- wood ---
add('Azobe, sawn timber (planed, air dried)', WD, 'Hardwood', 56, 558, 1060, 17)
add('Hardwood, raw, air/kiln dried', WD, 'Hardwood', 56, 236, 700, 12)
add('Hardwood, planed, air/kiln dried', WD, 'Hardwood', 56, 271, 700, 12)
add('Hardwood, raw, kiln dried (10%)', WD, 'Hardwood', 56, 239, 700, 12)
add('Cork slab', WD, 'Cork', 56, 257, 170, 0.02)
add('Softwood, raw, air dried (20%)', WD, 'Softwood', 56, 149, 500, 10)
add('Softwood, planed, air dried', WD, 'Softwood', 56, 173, 500, 10)
add('Softwood, raw, kiln dried (10%)', WD, 'Softwood', 56, 154, 500, 10)
add('Softwood, planed, kiln dried', WD, 'Softwood', 56, 179, 500, 10)
# wood panels given per m3 in the PDF; converted with an assumed density
for nm, p, rho, E in [('Laminated board (3-layer)', 175806, 500, 8), ('Glued laminated timber (GLT)', 105085, 470, 11),
                      ('Plywood (indoor)', 299627, 600, 9), ('Plywood (outdoor)', 314255, 600, 9),
                      ('MDF', 63809, 750, 3.5), ('OSB', 40633, 650, 4.5), ('Particle board', 38079, 650, 3.0), ('Fibreboard (soft)', 23129, 250, 0.5)]:
    add(nm, WD, 'Wood panels', 57 if p > 100000 else 58, round(p / rho, 1), rho, E, conv=f'{p} mPt/m3 / {rho} kg/m3')
# --- paper ---
add('Paper, recycled (deinked)', PP, 'Paper', 60, 262, 800, 3.0, True)
add('Paper, recycled (no deinking)', PP, 'Paper', 60, 76, 800, 3.0)
add('Paper, woodfree coated', PP, 'Paper', 60, 258, 800, 3.0)
add('Paper, woodfree uncoated', PP, 'Paper', 60, 309, 800, 3.0)
add('Paper, LWC', PP, 'Paper', 60, 261, 800, 3.0)
add('Paper, SC', PP, 'Paper', 60, 258, 800, 3.0)
add('Newsprint, new fibre', PP, 'Newsprint', 61, 207, 700, 2.5, True)
add('Newsprint, DIP', PP, 'Newsprint', 61, 164, 700, 2.5)
add('Newsprint, EU average', PP, 'Newsprint', 61, 174, 700, 2.5)
add('Cardboard, mixed fibre (single wall)', PP, 'Cardboard', 62, 147, None, None, True)
add('Cardboard, recycled fibre (single wall)', PP, 'Cardboard', 62, 95)
add('Cardboard, recycled fibre (double wall)', PP, 'Cardboard', 62, 125)
add('Cardboard, fresh fibre (single wall)', PP, 'Cardboard', 62, 261)
add('Liquid packaging board', PP, 'Cardboard', 64, 347)
add('Packaging glass, brown', GC, 'Glass', 63, 97, 2500, 70, True)
add('Packaging glass, green', GC, 'Glass', 63, 95, 2500, 70)
add('Packaging glass, white', GC, 'Glass', 63, 91, 2500, 70)
# --- construction ---
for nm, p, rho in [('Concrete, exacting (per kg)', 20575, 2440), ('Concrete, poor', 8585, 2190), ('Concrete, normal', 16759, 2380), ('Concrete, foundation', 11110, 2380)]:
    add(nm.replace(' (per kg)', ''), MN, 'Concrete & cement', 75, round(p / rho, 2), rho, 30, conv=f'{p} mPt/m3 / {rho} kg/m3')
add('Autoclaved aerated concrete', MN, 'Concrete & cement', 75, 28, 600, 2.0)
add('Cement (Portland)', MN, 'Concrete & cement', 75, 49)
add('Blast-furnace slag cement', MN, 'Concrete & cement', 75, 27)
add('Fibre-cement roof slate', MN, 'Concrete & cement', 75, 61, 1700, 15)
add('Gypsum', MN, 'Plaster & lime', 76, 2.7)
add('Gypsum plasterboard', MN, 'Plaster & lime', 76, 35, 800, 2.5)
add('Gypsum fibreboard', MN, 'Plaster & lime', 76, 28, 1150, 4)
add('Lime, hydrated', MN, 'Plaster & lime', 76, 48)
add('Quicklime, milled', MN, 'Plaster & lime', 76, 62)
add('Stucco', MN, 'Plaster & lime', 76, 10)
add('Brick', GC, 'Brick & ceramic', 77, 18, 1800, 15)
add('Ceramic tiles', GC, 'Brick & ceramic', 77, 124, 2300, 60)
add('Roof tile', GC, 'Brick & ceramic', 77, 27, 2000, 20)
add('Light clay brick', GC, 'Brick & ceramic', 77, 17, 900, 5)
add('Basalt', MN, 'Minerals', 78, 44, 2900, 70)
add('Bentonite', MN, 'Minerals', 78, 13)
add('Refractory', MN, 'Minerals', 78, 195, 2400, 60)
add('Gravel (round)', MN, 'Minerals', 78, 0.6)
add('Limestone', MN, 'Minerals', 78, 3.5, 2600, 50)
add('Sand-lime brick', MN, 'Minerals', 78, 10, 1800, 15)
add('Clay', MN, 'Minerals', 78, 0.3)
add('Perlite', MN, 'Minerals', 78, 1.6)
add('Silica sand', MN, 'Minerals', 78, 2.2)
add('Feldspar', MN, 'Minerals', 78, 3.6)
add('Vermiculite', MN, 'Minerals', 78, 0.77)
add('Sand', MN, 'Minerals', 78, 0.6)
add('Cellulose fibre insulation', INS, 'Mineral/organic', 79, 50, 50, 0.01)
add('Glass wool mat', INS, 'Mineral/organic', 79, 158, 30, 0.01)
add('Rock wool', INS, 'Mineral/organic', 79, 169, 60, 0.02)
add('Elastomer tube insulation', INS, 'Plastic', 79, 530, 60, 0.001)
add('Polystyrene foam slab', INS, 'Plastic', 79, 460, 30, 0.008)
add('Urea-formaldehyde foam slab', INS, 'Plastic', 79, 337, 15, 0.002)
add('Flat glass, coated', GC, 'Glass', 80, 82, 2500, 70, True)
add('Flat glass, uncoated', GC, 'Glass', 80, 70, 2500, 70)
# --- chemicals, paint, glues ---
for nm, p in [('Acrylic varnish', 205), ('Alkyd paint (water-based)', 309), ('Alkyd paint (solvent-based)', 393), ('Offset printing ink', 498), ('Rotogravure printing ink', 381)]:
    add(nm, CH, 'Paint & ink', 84, p)
for nm, p in [('Ammonia', 218), ('Bentonite (chemical)', 69), ('Chemicals, inorganic (average)', 170), ('Chlorine', 99), ('Phosphoric acid (industrial)', 220),
              ('Phosphoric acid (fertiliser)', 167), ('Iron sulphate', 18), ('Sodium chloride', 19), ('Sodium perborate, monohydrate', 355),
              ('Sodium perborate, tetrahydrate', 159), ('Nitric acid', 197), ('Water glass (silicate)', 102), ('Hydrochloric acid', 41), ('Nitrogen, liquid', 37),
              ('Decarbonised water', 0.001), ('Tap water', 0.03), ('Hydrogen, liquid', 253), ('Zeolite', 425), ('Oxygen, liquid', 35), ('Sulphuric acid', 27)]:
    add(nm, CH, 'Inorganic', 85, p)
for nm, p in [('Chemicals, organic (average)', 249), ('Diesel', 174), ('Ethylene oxide', 245), ('Ethylene glycol', 203), ('Petrol', 190), ('Heavy fuel oil', 166),
              ('Propylene glycol', 446), ('Urea', 350), ('Soap', 5306)]:
    add(nm, CH, 'Organic', 86, p)
for nm, p in [('Wood glue', 280), ('PVC glue', 159), ('EVA hot-melt glue', 320), ('Flooring glue', 94)]:
    add(nm, CH, 'Glues', 87, p)

# ---------------------------------------------------------------------------------------------
# recycling & waste attached to sheet entries
# ---------------------------------------------------------------------------------------------
STEEL = dict(proc=76, saved=-231, total=-155)   # read from the image on p.26
WASTE_OVERRIDE = {26: 26.0}
rows = []
for m in M:
    pg = m['page']
    rec = STEEL if pg == 26 else sheet_recycling(pg)
    waste = WASTE_OVERRIDE.get(pg, sheet_waste(pg))
    if pg == 35: waste = 26.0 if m['family'] != PM else None   # 'Others' sheet has no waste line: assume generic metal value? no -> keep None
    if pg == 35: waste = None
    if pg in (75, 76, 77, 78, 80): waste = None
    row = dict(name=m['name'], family=m['family'], subfamily=m['subfamily'], page=pg, prod=m['prod'],
               rec_proc=None, rec_saved=None, rec_total=None, waste=waste, rho=m['rho'], E=m['E'],
               props_approx=int(m['rho'] is not None), unit_conversion=m['conv'])
    if m['rec'] and rec.get('proc') is not None and rec.get('total') is not None:
        row.update(rec_proc=rec['proc'], rec_saved=rec.get('saved'), rec_total=rec['total'])
    rows.append(row)

# Recycled plastics: no waste/recycling line on their own sheet
for r in rows:
    if r['family'] == RP: r['waste'] = None
# Glass packaging: recycling process 58 (primary saved not available)
for r in rows:
    if r['page'] == 63 and r['name'].endswith('brown'): r['rec_proc'] = 58.0
    if r['page'] == 60 and r['name'] == 'Paper, recycled (deinked)': r['rec_proc'] = 176.0
    if r['page'] == 61 and r['name'] == 'Newsprint, new fibre': r['rec_proc'] = 176.0
    if r['page'] == 62 and r['name'].startswith('Cardboard, mixed'): r['rec_proc'] = 95.0
    if r['page'] == 80 and r['name'] == 'Flat glass, coated':
        r['rec_proc'], r['rec_saved'], r['rec_total'] = 58.0, -82.0, -24.0
fields = ['name', 'family', 'subfamily', 'page', 'prod', 'rec_proc', 'rec_saved', 'rec_total', 'waste', 'rho', 'E', 'props_approx', 'unit_conversion']
with open(os.path.join(HERE, '..', 'data', 'ecolizer_materials.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=fields); w.writeheader()
    for r in rows: w.writerow({k: ('' if r[k] is None else r[k]) for k in fields})
print(len(rows), 'materials')
from collections import Counter
print(Counter(r['family'] for r in rows))
print('with rec:', sum(r['rec_proc'] is not None for r in rows), 'waste:', sum(r['waste'] is not None for r in rows), 'rho,E:', sum(r['rho'] is not None and r['E'] is not None for r in rows))
