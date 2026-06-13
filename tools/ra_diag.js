// Per-system R_A / R_disc / regime + fit RMS diagnostic.
const fs=require("fs"),vm=require("vm"),path=require("path");
const ctx={Math,console,JSON,isFinite,isNaN,Object,Array,Number,String,Boolean,Map,Set,parseFloat,parseInt,Infinity,window:{}};
vm.createContext(ctx);
for(const f of ["constants.js","disc.js","allocation.js","classify.js","cascade.js","budget.js","fit.js"])
  vm.runInContext(fs.readFileSync(path.join("js",f),"utf8"),ctx,{filename:f});
vm.runInContext(fs.readFileSync("exoplanets.js","utf8"),ctx,{filename:"exoplanets.js"});

function rms(pl){
  let s=0,n=0;
  for(const p of pl){
    if(p.observed>0 && p.predicted>=0 && !p.core && !p.immutable){
      const e=(p.predicted-p.observed)/p.observed; s+=e*e; n++;
    }
  }
  return n?Math.sqrt(s/n)*100:0;
}
const rows=[];
for(const e of ctx.window.EXOPLANETS){
  const pl=e.planets.map(p=>({name:p.name,r:p.r,observed:p.observed||0,kbo:p.kbo,core:p.core,immutable:p.immutable,e:p.e}));
  let r;try{r=ctx.budgetFit(pl,e.budget,e.spin,e.parent||null,e.star);}catch(z){rows.push([e.id,"ERR",z.message]);continue;}
  const Rd=r.fit?.R_disc, RA=r.budget_R_A;
  const reg = (RA>=Rd)?"INV":"nrm";
  rows.push([e.id, reg, Rd, RA, rms(r.planets||pl)]);
}
for(const x of rows){
  if(x[1]==="ERR"){ console.log(x[0].padEnd(16),"ERR",x[2]); continue; }
  const [id,reg,Rd,RA,e]=x;
  console.log(id.padEnd(16),reg,"  R_disc="+(Rd?.toExponential(3)),"  R_A="+(RA?.toExponential(3)),"  RMS="+e.toFixed(1)+"%");
}
