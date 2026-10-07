import json, csv, re, os
HERE=os.path.dirname(os.path.abspath(__file__))
R=json.load(open(os.path.join(HERE,'parsed.json')))
def num(s):
    if s in('dna','na'): return None
    return float(s.replace(',','.'))
rows=[]
for r in R:
    if not r['items'] or r['page']<24: continue
    for it in r['items']:
        if it['section']!='processing': continue
        lab=re.sub(r'\s+',' ',it['label']).strip()
        v=num(it['raw'])
        if v is None: continue
        letters=sum(c.isalpha() for c in lab)
        if letters<6 or re.search(r'\b[A-Za-z]{1,2}\s[a-z]{1,2}\s[a-z]\b',lab): continue   # skip glyph-garbled labels
        m=re.search(r'/\s*([A-Za-zµ²³0-9 ]+?)(?:\*+)?$',lab)
        unit=m.group(1).strip() if m else ''
        name=re.sub(r'/\s*[A-Za-zµ²³0-9 ]+?\**$','',lab).strip()
        rows.append(dict(sheet=r['title'].split(' ')[0] if r['title'] else '',page=r['page'],code=r['code'],process=name or lab,unit_per=unit,mPt=v,generic=int(it['generic'])))
with open(os.path.join(HERE,'..','data','ecolizer_processes.csv'),'w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print(len(rows))
for x in rows[:12]+rows[100:112]: print(x)
