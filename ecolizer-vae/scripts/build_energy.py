import csv, os
HERE=os.path.dirname(os.path.abspath(__file__))
rows=[]
def a(cat,name,val,unit,page): rows.append(dict(category=cat,item=name,mPt=val,per=unit,page=page))
for n,v in [('Europe (UCTE)',51),('Belgium',31),('CENTREL (SK, HU, PL, CZ)',88),('Germany',59),('France',10),('Greece',113),('United Kingdom',60),('Ireland',78),('Italy',63),('Luxembourg',53),('Netherlands',64),('NORDEL (NO, DK, SE, FI)',18),('Austria',31),('Portugal',66),('Spain',56),('Switzerland',3)]:
    a('Electricity, low voltage, by country',n,v,'kWh',66)
for n,v in [('High voltage, Europe (UCTE)',44),('High voltage, Belgium',28),('Medium voltage, Europe (UCTE)',45),('Medium voltage, Belgium',29),('Low voltage, Europe (UCTE)',51),('Low voltage, Belgium',31)]:
    a('Electricity, by voltage level',n,v,'kWh',66)
for n,v in [('Nuclear',1.2),('Hard coal',89),('Oil',85),('Bagasse (sugarcane)',1.66),('Bagasse (sweet sorghum)',3.77),('Hydropower',0.35),('Wind',1.2),('Solar PV, facade single-Si',9.6),('Solar PV, facade multi-Si',8.7),('Solar PV, flat roof single-Si',7),('Solar PV, flat roof multi-Si',6.5),('Solar PV, slanted roof a-Si panel',6.4),('Solar PV, slanted roof a-Si laminated',5.3)]:
    a('Electricity, by source',n,v,'kWh',67)
for n,v in [('Anthracite, stove',11),('Lignite briquette, stove',16),('Diesel, boiler 10 kW',7.7),('Diesel, industrial 1 MW',8),('Natural gas, atmospheric low-NOx boiler',6.7),('Natural gas, fan burner low-NOx boiler',7.6),('Natural gas, industrial furnace',7.1),('Wood',3.9),('Hard coal, stove',15),('Hard coal, industrial furnace',11),('Heat pump 30 kW',3.5),('Heavy fuel oil, industrial 1 MW',9.2),('Solar flat-plate collector (combined system)',0.84),('Solar + gas, one-family house hot water',1.1),('Solar + electric, flat plate, multi-dwelling',2.8),('Solar + gas, one-family house',5.2)]:
    a('Heat',n,v,'MJ',68)
for n,v,u in [('Van <3.5 t',186,'tkm'),('Lorry >16 t (Euro 4)',15,'tkm'),('Lorry >32 t (Euro 4)',12,'tkm'),('Train (freight)',3.9,'tkm'),('Barge tanker (inland)',4.4,'tkm'),('Barge (inland)',4.7,'tkm'),('Transoceanic tanker',0.6,'tkm'),('Transoceanic freight ship',1.3,'tkm'),('Aircraft freight, Europe',181,'tkm'),('Aircraft freight, intercontinental',99,'tkm')]:
    a('Transport',n,v,u,70)
with open(os.path.join(HERE,'..','data','ecolizer_energy_transport.csv'),'w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=['category','item','mPt','per','page']); w.writeheader(); w.writerows(rows)
print(len(rows))
