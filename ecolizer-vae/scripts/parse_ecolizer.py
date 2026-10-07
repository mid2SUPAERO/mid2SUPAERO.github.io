import pdfplumber, re, json, sys
import os
HERE = os.path.dirname(os.path.abspath(__file__))
PDF = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'Ecolizer-2.0-LCA-tables.pdf')   # put the OVAM PDF here or pass its path
NUM=re.compile(r'^-?\d+(?:[.,]\d+)?$')
SEC={'PRODUCTION':'production','PROCESSING':'processing','RECYCLING':'recycling','WASTE':'waste','TREATMENT':'waste'}
def lines_of(page):
    ws=page.extract_words(keep_blank_chars=False)
    ws=[w for w in ws if 20<w['top']<640]
    return ws
def parse_page(page):
    ws=lines_of(page)
    # title: words with top<60
    title_words=[w for w in ws if w['top']<62 and w['x0']<130]
    sheet=[w for w in ws if w['top']<62 and w['x0']>=130 and re.match(r'\d\d\.\d\d',w['text'])]
    code=sheet[0]['text'] if sheet else None
    title=' '.join(w['text'] for w in sorted(title_words,key=lambda w:(round(w['top']),w['x0'])))
    body=[w for w in ws if w['top']>=62]
    # section markers: uppercase header words
    heads=[]
    for w in body:
        if re.match(r'^(PRODUCTION|PROCESSING|RECYCLING)',w['text']) and w['x0']<60:
            heads.append((w['top'],SEC[re.match(r'[A-Z]+',w['text']).group(0)]))
        if w['text']=='WASTE' and w['x0']<60: heads.append((w['top'],'waste'))
    heads.sort()
    def section_at(y):
        s=None
        for t,n in heads:
            if y>=t-1: s=n
        return s
    # stop at footnote legend
    stop=[w['top'] for w in body if w['text'] in('Black','*','**') and w['x0']<60 and w['top']>200]
    # values
    vals=[]
    for w in body:
        if w['x0']>=140 and (NUM.match(w['text']) or w['text'] in('dna','na')):
            vals.append(w)
    # (!) flags and grey: find '(!)' near same y
    flags=[w for w in body if w['text']=='(!)']
    items=[]
    labw=[w for w in body if w['x0']<138 and not re.match(r'^(PRODUCTION|PROCESSING|RECYCLING|WASTE|TREATMENT)',w['text']) ]
    # remove header row words mPt
    labw=[w for w in labw if not re.match(r'^mPt',w['text'])]
    vals.sort(key=lambda w:w['top'])
    # group label words into text lines
    lines={}
    for w in labw:
        k=round(w['top']/2)
        lines.setdefault(k,[]).append(w)
    L=[]
    for k,v in sorted(lines.items()):
        v.sort(key=lambda w:w['x0'])
        L.append((sum(w['top'] for w in v)/len(v),' '.join(w['text'] for w in v)))
    # assign each line to nearest value (within same section)
    assign={i:[] for i in range(len(vals))}
    for y,t in L:
        if not vals: break
        j=min(range(len(vals)),key=lambda i:abs(vals[i]['top']-y))
        assign[j].append((y,t))
    out=[]
    for i,v in enumerate(vals):
        txt=' '.join(t for y,t in sorted(assign[i]))
        flag=any(abs(f['top']-v['top'])<3 for f in flags)
        out.append(dict(section=section_at(v['top']),label=txt,raw=v['text'],generic=flag,y=round(v['top'])))
    return dict(code=code,title=title,items=out)
if __name__=='__main__':
    pdf=pdfplumber.open(PDF)
    res=[]
    for pn in range(23,87):
        r=parse_page(pdf.pages[pn]); r['page']=pn+1; res.append(r)
    json.dump(res,open(os.path.join(HERE,'parsed.json'),'w'),ensure_ascii=False,indent=1)
    for r in res:
        print(r['page'],r['code'],r['title'],len(r['items']))
