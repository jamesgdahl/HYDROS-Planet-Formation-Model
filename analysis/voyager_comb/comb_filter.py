#!/usr/bin/env python3
# Matched-filter search for the live-lattice comb in Voyager merged daily data.
# See README.md. Usage: python3 comb_filter.py
import math, cmath
from collections import defaultdict

P_LOG = math.log10(1/(1-math.sqrt(math.log(2))/2))   # comb period, dex
LR_DAM = math.log10(121.75)                          # phase anchor (dam)
kB=1.380649e-23; mp=1.6726e-27

def load(fn):
    rows=[]
    for line in open(fn):
        p=line.split()
        if len(p)<16: continue
        try: R=float(p[3]); B=float(p[6]); V=float(p[11]); n=float(p[14]); T=float(p[15])
        except: continue
        if R>900 or R<1.5: continue
        rows.append((R, B if B<900 else None, V if V<9000 else None,
                     n if n<90 else None, T if T<9000000 else None))
    return rows

def pseries(rows, kind):
    out=[]
    for R,B,V,n,T in rows:
        if kind=='B' and B: out.append((R,B))
        elif kind=='Pth' and n and T: out.append((R,(n*1e6)*kB*T*1e9))
        elif kind=='Pram' and n and V: out.append((R,(n*1e6)*mp*(V*1e3)**2*1e9))
    return out

def residuals(series):
    coarse=defaultdict(list)
    for R,val in series: coarse[round(math.log10(R)/0.10)].append(math.log10(val))
    base={k:sorted(v)[len(v)//2] for k,v in coarse.items() if len(v)>=15}
    def baseline(lr):
        x=lr/0.10
        ks=sorted([k for k in (math.floor(x)-1,math.floor(x),math.floor(x)+1,math.floor(x)+2)
                   if k in base], key=lambda k:abs(k-x))[:2]
        if len(ks)<2: return None
        k1,k2=sorted(ks)
        if k1==k2: return base[k1]
        f=(x-k1)/(k2-k1); return base[k1]*(1-f)+base[k2]*f
    fine=defaultdict(list)
    for R,val in series:
        lb=baseline(math.log10(R))
        if lb is not None: fine[round(math.log10(R)/0.01)].append(math.log10(val)-lb)
    return sorted((k*0.01, sorted(v)[len(v)//2]) for k,v in fine.items() if len(v)>=5)

def matched_filter(bins, f):
    c=s=0.0
    for lr,res in bins:
        ph=2*math.pi*f*(lr-LR_DAM)
        c+=res*math.cos(ph); s+=res*math.sin(ph)
    n=len(bins)
    return 2*math.sqrt(c*c+s*s)/n, math.degrees(math.atan2(-s,c))%360

if __name__=='__main__':
    v1=load('voyager1_daily.asc'); v2=load('voyager2_daily.asc')
    f0=1/P_LOG
    print(f"comb: {f0:.3f} cycles/dex; phase 0 = crests on slots (dam-anchored)")
    for name,series in [('V1 |B|',pseries(v1,'B')),('V2 |B|',pseries(v2,'B')),
                        ('V2 P_th',pseries(v2,'Pth')),('V2 P_ram',pseries(v2,'Pram'))]:
        bins=residuals(series)
        amp,ph=matched_filter(bins,f0)
        bg=sorted(matched_filter(bins,f)[0] for f in
                  [2+0.25*i for i in range(25)] if abs(2+0.25*([2+0.25*i for i in range(25)].index(2+0.25*i)) - f0)>0.4) if False else \
           sorted(matched_filter(bins,2+0.25*i)[0] for i in range(25) if abs(2+0.25*i-f0)>0.4)
        print(f"  {name:9s} A={amp:.4f} dex  phase={ph:6.1f}  bg p90={bg[int(0.9*len(bg))]:.4f}")
