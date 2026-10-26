import json, math, os
from shapely.geometry import shape
from shapely.validation import make_valid
from shapely.ops import unary_union, polylabel
SRC='/home/claude/geo54'; OUT='/home/claude/pa/assets/geo'
# iso3: (iso2, name, l1, l1p, l2, l2p, office1, office2)
C={
'DZA':('DZ','Algeria','Province','Provinces',None,None,'Wali',None),
'AGO':('AO','Angola','Province','Provinces','Municipality','Municipalities','Provincial Governor','Municipal Administrator'),
'BEN':('BJ','Benin','Department','Departments','Commune','Communes','Prefect','Mayor'),
'BWA':('BW','Botswana','District','Districts','Sub-district','Sub-districts','District Council Chairperson','District Commissioner'),
'BFA':('BF','Burkina Faso','Region','Regions','Province','Provinces','Governor','High Commissioner'),
'BDI':('BI','Burundi','Province','Provinces','Commune','Communes','Provincial Governor','Commune Administrator'),
'CPV':('CV','Cabo Verde','Municipality','Municipalities','Parish','Parishes','President of the Municipal Chamber',None),
'CMR':('CM','Cameroon','Region','Regions','Division','Divisions','Governor','Senior Divisional Officer'),
'CAF':('CF','Central African Republic','Prefecture','Prefectures','Sub-prefecture','Sub-prefectures','Prefect','Sub-prefect'),
'TCD':('TD','Chad','Province','Provinces','Department','Departments','Governor','Prefect'),
'COM':('KM','Comoros','Island','Islands','Prefecture','Prefectures','Island Governor','Prefect'),
'COG':('CG','Republic of the Congo','Department','Departments','District','Districts','Prefect','Sub-prefect'),
'COD':('CD','DR Congo','Province','Provinces','Territory','Territories','Provincial Governor','Territory Administrator'),
'CIV':('CI',"Côte d'Ivoire",'District','Districts','Region','Regions','District Governor','Regional Council President'),
'DJI':('DJ','Djibouti','Region','Regions','District','Districts','Regional Prefect','District Head'),
'EGY':('EG','Egypt','Governorate','Governorates','Markaz','Marakiz','Governor','Markaz Head'),
'GNQ':('GQ','Equatorial Guinea','Province','Provinces','District','Districts','Provincial Governor','District Delegate'),
'ERI':('ER','Eritrea','Region','Regions','Sub-zone','Sub-zones','Regional Administrator','Sub-zone Administrator'),
'SWZ':('SZ','Eswatini','Region','Regions','Inkhundla','Tinkhundla','Regional Administrator','Indvuna yeNkhundla'),
'ETH':('ET','Ethiopia','Region','Regions','Zone','Zones','Regional President','Zone Administrator'),
'GAB':('GA','Gabon','Province','Provinces','Department','Departments','Provincial Governor','Prefect'),
'GMB':('GM','The Gambia','LGA','Local Government Areas','District','Districts','LGA Chairperson','District Chief'),
'GHA':('GH','Ghana','Region','Regions','District','Districts','Regional Minister','District Chief Executive'),
'GIN':('GN','Guinea','Region','Regions','Prefecture','Prefectures','Governor','Prefect'),
'GNB':('GW','Guinea-Bissau','Region','Regions','Sector','Sectors','Regional Governor','Sector Administrator'),
'KEN':('KE','Kenya','County','Counties','Constituency','Constituencies','Governor','Member of Parliament'),
'LSO':('LS','Lesotho','District','Districts','Constituency','Constituencies','District Administrator','Member of Parliament'),
'LBR':('LR','Liberia','County','Counties','District','Districts','County Superintendent','District Commissioner'),
'LBY':('LY','Libya','District','Districts',None,None,'District Head',None),
'MDG':('MG','Madagascar','Region','Regions','District','Districts','Regional Governor','District Chief'),
'MWI':('MW','Malawi','Region','Regions','District','Districts',None,'District Commissioner'),
'MLI':('ML','Mali','Region','Regions','Cercle','Cercles','Governor','Prefect'),
'MRT':('MR','Mauritania','Wilaya','Wilayas','Moughataa','Moughataas','Wali','Hakem'),
'MUS':('MU','Mauritius','District','Districts',None,None,'District Council Chairperson',None),
'MAR':('MA','Morocco','Region','Regions','Province','Provinces','Wali','Governor'),
'MOZ':('MZ','Mozambique','Province','Provinces','District','Districts','Provincial Governor','District Administrator'),
'NAM':('NA','Namibia','Region','Regions','Constituency','Constituencies','Regional Governor','Constituency Councillor'),
'NER':('NE','Niger','Region','Regions','Department','Departments','Governor','Prefect'),
'NGA':('NG','Nigeria','State','States','LGA','Local Government Areas','Governor','LGA Executive Chairman'),
'RWA':('RW','Rwanda','Province','Provinces','District','Districts','Governor','Mayor'),
'STP':('ST','São Tomé and Príncipe','Island','Islands','District','Districts',None,'District Chamber President'),
'SEN':('SN','Senegal','Region','Regions','Department','Departments','Governor','Prefect'),
'SYC':('SC','Seychelles','District','Districts',None,None,'District Administrator',None),
'SLE':('SL','Sierra Leone','Province','Provinces','District','Districts','Resident Minister','District Council Chairperson'),
'SOM':('SO','Somalia','Region','Regions','District','Districts','Regional Governor','District Commissioner'),
'ZAF':('ZA','South Africa','Province','Provinces','District','Districts','Premier','Executive Mayor'),
'SSD':('SS','South Sudan','State','States','County','Counties','Governor','County Commissioner'),
'SDN':('SD','Sudan','State','States','Locality','Localities','Governor','Locality Commissioner'),
'TZA':('TZ','Tanzania','Region','Regions','District','Districts','Regional Commissioner','District Commissioner'),
'TGO':('TG','Togo','Region','Regions','Prefecture','Prefectures','Regional Council President','Prefect'),
'TUN':('TN','Tunisia','Governorate','Governorates','Delegation','Delegations','Governor','Delegate'),
'UGA':('UG','Uganda','Region','Regions','County','Counties',None,'Member of Parliament'),
'ZMB':('ZM','Zambia','Province','Provinces','District','Districts','Provincial Minister','District Commissioner'),
'ZWE':('ZW','Zimbabwe','Province','Provinces','District','Districts','Provincial Affairs Minister','District Development Coordinator'),
}
SKIP2={'DZA','SYC','LBY','MUS'}
REN={'ZAF':{'Nothern Cape':'Northern Cape'},'NGA':{'Abuja Federal Capital Territory':'Federal Capital Territory'},'KEN':{'Tharaka':'Tharaka-Nithi'}}
def lp(g):
    try:
        p=max(([g] if g.geom_type=='Polygon' else list(g.geoms)),key=lambda x:x.area);q=polylabel(p,max(0.002,math.sqrt(p.area)/200))
    except Exception: q=g.representative_point()
    return [round(q.x,3),round(q.y,3)]
def enc(geom,tol,prec=1000):
    g=geom.simplify(tol,preserve_topology=True)
    if g.is_empty:g=geom
    polys=[g] if g.geom_type=='Polygon' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='Polygon']
    big=max((p.area for p in polys),default=0)
    out=[]
    for p in polys:
        if p.area<tol*tol*3 and p.area<big*0.02:continue
        rings=[]
        for ring in [p.exterior]+list(p.interiors):
            if ring is not p.exterior and abs(shape({'type':'Polygon','coordinates':[list(ring.coords)]}).area)<tol*tol*6:continue
            cs=[(round(x*prec),round(y*prec)) for x,y in ring.coords];d=[cs[0]]
            for c in cs[1:]:
                if c!=d[-1]:d.append(c)
            if len(d)<4:continue
            f=[d[0][0],d[0][1]]
            for i in range(1,len(d)):f+=[d[i][0]-d[i-1][0],d[i][1]-d[i-1][1]]
            rings.append(f)
        if rings:out.append(rings)
    return out
def bb(g):a=g.bounds;return [round(a[0],3),round(a[1],3),round(a[2],3),round(a[3],3)]
INDEX={};CONT=[];REPORT=[]
for iso3,(cc,name,l1,l1p,l2,l2p,o1,o2) in C.items():
    f1=json.load(open(f'{SRC}/{iso3}_ADM1.geojson'))['features']
    a1=[]
    for f in f1:
        n=(f['properties'].get('shapeName') or '').strip() or 'Unnamed'
        n=REN.get(iso3,{}).get(n,n)
        if iso3=='GHA':n=n.replace(' Region','')
        try:g=make_valid(shape(f['geometry']))
        except Exception:continue
        if g.is_empty:continue
        a1.append({'name':n,'g':g})
    a1.sort(key=lambda x:x['name'])
    for i,x in enumerate(a1):x['id']=f'{cc}.{i+1:02d}'
    a2=[]
    if iso3 not in SKIP2 and os.path.getsize(f'{SRC}/{iso3}_ADM2.geojson')>10:
        for f in json.load(open(f'{SRC}/{iso3}_ADM2.geojson'))['features']:
            try:g=make_valid(shape(f['geometry']))
            except Exception:continue
            if g.is_empty or g.area==0:continue
            best=None;ba=0
            for s in a1:
                if s['g'].envelope.intersects(g.envelope) and s['g'].intersects(g):
                    ar=s['g'].intersection(g).area
                    if ar>ba:ba,best=ar,s
            if best is None:
                c=g.representative_point();best=min(a1,key=lambda s:s['g'].distance(c))
            a2.append({'name':(f['properties'].get('shapeName') or 'Unnamed').strip(),'g':g,'p':best['id']})
    country=unary_union([s['g'] for s in a1])
    b=country.bounds;diag=math.hypot(b[2]-b[0],b[3]-b[1])
    t2=max(0.0008,diag*0.00012);t1=t2*2.2
    D={'code':cc,'name':name,'l1':l1,'l1p':l1p,'l2':l2 if a2 else None,'l2p':l2p if a2 else None,'o1':o1,'o2':o2 if a2 else None,'bbox':bb(country),'adm1':[],'adm2':[]}
    for s in a1:
        kids=sorted([x for x in a2 if x['p']==s['id']],key=lambda x:x['name'])
        for j,k in enumerate(kids):k['id']=f"{s['id']}.{j+1:03d}"
        D['adm1'].append({'id':s['id'],'n':s['name'],'b':bb(s['g']),'c':enc(s['g'],t1),'k':len(kids),'l':lp(s['g']),'a':round(s['g'].area,4)})
        for k in kids:D['adm2'].append({'id':k['id'],'n':k['name'],'p':s['id'],'b':bb(k['g']),'c':enc(k['g'],t2),'l':lp(k['g']),'a':round(k['g'].area,5)})
    js=f'window.CG_GEO=window.CG_GEO||{{}};window.CG_GEO.{cc}='+json.dumps(D,separators=(',',':'),ensure_ascii=False)+';\n'
    open(f'{OUT}/{cc.lower()}.js','w').write(js)
    INDEX[cc]={'name':name,'l1':l1,'l1p':l1p,'l2':D['l2'],'l2p':D['l2p'],'o1':o1,'o2':D['o2'],'adm1':[[a['id'],a['n']] for a in D['adm1']],'adm2':[[a['id'],a['n'],a['p']] for a in D['adm2']]}
    CONT.append({'id':cc,'n':name,'b':bb(country),'c':enc(country,max(0.02,diag*0.004)),'l':lp(country),'a':round(country.area,3)})
    REPORT.append(f'{cc} {name[:18]:18} adm1={len(a1):3} adm2={len(a2):4} {len(js)//1024}KB')
open(f'{OUT}/index.js','w').write('window.CG_GEOINDEX='+json.dumps(INDEX,separators=(',',':'),ensure_ascii=False)+';\n')
open(f'{OUT}/africa.js','w').write('window.CG_AFRICA='+json.dumps(CONT,separators=(',',':'),ensure_ascii=False)+';\n')
print('\n'.join(REPORT))
