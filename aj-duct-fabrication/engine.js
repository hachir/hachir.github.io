/* AJ Duct Fabrication. All internal dimensions are millimetres. No external dependencies. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.AJDuct=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PI=Math.PI,TAU=2*PI,EPS=1e-7,TOL=.05;
const field=(key,label,inch,min=0,kind='length',max=100000)=>({key,label,default:kind==='length'?inch*25.4:inch,min,kind,max});
const W=()=>field('width','Width W',12,.1),H=()=>field('height','Height H',11,.1),L=(v=36)=>field('length','Length L',v,.1),S=()=>field('seam','Straight seam allowance S',.5),D=()=>field('diameter','Neutral diameter D',12,.1);
const definitions=[
 {id:'rect-straight',code:'AJ-001',category:'rect',name:'Rectangular straight',en:'Rectangular straight',icon:'duct',fields:[W(),H(),L(),S(),field('endA','End allowance A',0),field('endB','End allowance B',0)]},
 {id:'rect-two-piece',code:'AJ-002',category:'rect',name:'Two-piece rectangular duct',en:'Two-piece rectangular duct',icon:'two',fields:[W(),H(),L(),S()]},
 {id:'rect-transition',code:'AJ-003',category:'rect',name:'Rectangular transition · 4 panels',en:'Rectangular transition · 4 panels',icon:'transition',fields:[field('w1','Inlet width W1',18,.1),field('h1','Inlet height H1',12,.1),field('w2','Outlet width W2',12,.1),field('h2','Outlet height H2',8,.1),L(20),field('offsetX','Center offset X',0,-100000),field('offsetY','Center offset Y',0,-100000)]},
 {id:'rect-offset',code:'AJ-004',category:'rect',name:'Rectangular offset · 4 panels',en:'Rectangular offset · 4 panels',icon:'offset',fields:[W(),H(),L(24),field('offsetX','Center offset X',5,-100000),field('offsetY','Center offset Y',3,-100000)]},
 {id:'rect-elbow',code:'AJ-005',category:'rect',name:'Radius elbow · 4 panels',en:'Radius elbow · 4 panels',icon:'elbow',fields:[field('width','Bend-plane width W',12,.1),field('height','Depth H',10,.1),field('radius','Inside radius R',6,.1),field('angle','Bend angle',90,5,'angle',150)]},
 {id:'rect-endcap',code:'AJ-006',category:'rect',name:'Notched rectangular end cap',en:'Notched rectangular end cap',icon:'cap',fields:[W(),H(),field('flange','Edge fold F',1)]},
 {id:'round-straight',code:'AJ-007',category:'round',name:'Round straight · π × D',en:'Round straight · π × D',icon:'round',fields:[D(),L(24),S(),field('endA','End allowance A',0),field('endB','End allowance B',0)]},
 {id:'round-reducer',code:'AJ-008',category:'round',name:'Concentric conical reducer',en:'Concentric conical reducer',icon:'reducer',fields:[field('d1','First diameter D1',18,.1),field('d2','Second diameter D2',12,.1),L(12)]},
 {id:'round-elbow',code:'AJ-009',category:'round',name:'Gored round elbow',en:'Gored round elbow',icon:'gore',fields:[D(),field('radius','Centerline radius R',18,.1),field('angle','Bend angle',90,5,'angle',150),field('segments','Number of gores',5,2,'count',16),S()]},
 {id:'round-miter',code:'AJ-010',category:'round',name:'Single-miter round tube',en:'Single-miter round tube',icon:'miter',fields:[D(),L(18),field('angle','Miter angle from square',30,0,'angle',75),S()]},
 {id:'round-endcap',code:'AJ-011',category:'sheet',name:'Round disk · exact circle',en:'Round disk · exact circle',icon:'disk',fields:[D()]},
 {id:'flat-plate',code:'AJ-012',category:'sheet',name:'Rectangular plate',en:'Rectangular plate',icon:'plate',fields:[W(),H()]},
 {id:'plate-holes',code:'AJ-013',category:'sheet',name:'Four-hole mounting plate',en:'Four-hole mounting plate',icon:'holes',fields:[field('width','Width W',18,.1),field('height','Height H',12,.1),field('holeD','Hole diameter',.375,.01),field('inset','Hole center inset',1,.01)]},
 {id:'rect-frame',code:'AJ-014',category:'sheet',name:'Rectangular frame',en:'Rectangular frame',icon:'frame',fields:[field('width','Outside width',20,.1),field('height','Outside height',16,.1),field('innerW','Opening width',16,.1),field('innerH','Opening height',12,.1)]},
 {id:'round-ring',code:'AJ-015',category:'sheet',name:'Concentric ring',en:'Concentric ring',icon:'ring',fields:[field('outerD','Outside diameter',18,.1),field('innerD','Opening diameter',12,.1)]},
 {id:'oval-frame',code:'AJ-016',category:'sheet',name:'Flat-oval frame',en:'Flat-oval frame',icon:'oval',fields:[field('width','Overall width',24,.1),field('height','Overall height',12,.1),field('flange','Frame width F',1,.01)]}
];
function check(ok,message){if(!ok)throw new Error(message);}
function definition(id){const d=definitions.find(p=>p.id===id);check(d,'Unknown pattern.');return d;}
function defaults(id){return Object.fromEntries(definition(id).fields.map(f=>[f.key,f.default]));}
function parseDimension(value){
 if(typeof value==='number'){check(Number.isFinite(value),'Enter a valid number.');return value;}
 let s=String(value).trim().replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[٫]/g,'.').replace(/[−]/g,'-');
 check(s.length>0&&s.length<48,'Enter a valid dimension.');
 if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return Number(s);
 const m=s.match(/^([+-])?(?:(\d+)[ -]+)?(\d+)\s*\/\s*(\d+)$/);
 check(m&&Number(m[4])>0,'Use a number or a fraction such as 12 1/2.');
 return (m[1]==='-'?-1:1)*(Number(m[2]||0)+Number(m[3])/Number(m[4]));
}
const point=(x,y)=>[x,y];
const poly=(points,closed=true,hole=false)=>({type:'poly',points,closed,hole});
const circle=(x,y,r,hole=false)=>({type:'circle',cx:x,cy:y,r,closed:true,hole});
const rect=(w,h,x=0,y=0,hole=false)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],true,hole);
const line=(a,b)=>poly([a,b],false);
function area(path){if(path.type==='circle')return PI*path.r**2;let a=0;const p=path.points;for(let i=0,j=p.length-1;i<p.length;j=i++)a+=p[j][0]*p[i][1]-p[i][0]*p[j][1];return Math.abs(a)/2;}
function pathLength(p){if(p.type==='circle')return TAU*p.r;let n=0;for(let i=1;i<p.points.length;i++)n+=Math.hypot(p.points[i][0]-p.points[i-1][0],p.points[i][1]-p.points[i-1][1]);if(p.closed)n+=Math.hypot(p.points[0][0]-p.points.at(-1)[0],p.points[0][1]-p.points.at(-1)[1]);return n;}
function pointsOf(p){return p.type==='circle'?[[p.cx-p.r,p.cy-p.r],[p.cx+p.r,p.cy+p.r]]:p.points;}
function bounds(paths){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of paths)for(const [x,y]of pointsOf(p)){check(Number.isFinite(x)&&Number.isFinite(y),'Unable to calculate the part geometry.');x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {x0,y0,x1,y1,w:x1-x0,h:y1-y0};}
function part(name,cuts,folds=[]){cuts=Array.isArray(cuts)?cuts:[cuts];return {name,cuts,folds,area:cuts.reduce((s,p)=>s+(p.hole?-1:1)*area(p),0),cutLength:cuts.reduce((s,p)=>s+pathLength(p),0),bounds:bounds(cuts)};}
function arcPoints(r,a0,a1){const count=Math.max(12,Math.ceil(Math.abs(a1-a0)/(4*Math.asin(Math.sqrt(Math.min(1,TOL/(2*r)))))));return Array.from({length:count+1},(_,i)=>point(r*Math.cos(a0+(a1-a0)*i/count),r*Math.sin(a0+(a1-a0)*i/count)));}
function sector(ro,ri,angle){return poly([...arcPoints(ro,-angle/2,angle/2),...arcPoints(ri,angle/2,-angle/2)]);}
function transition(w1,h1,w2,h2,L,ox,oy){
 const face=(name,b1,b2,slope,shift)=>{const x=(b1-b2)/2+shift,h=Math.hypot(L,slope);return part(name,poly([[0,0],[b1,0],[x+b2,h],[x,h]]));};
 return [face('TOP',w1,w2,oy+(h2-h1)/2,ox),face('BOTTOM',w1,w2,oy-(h2-h1)/2,ox),face('LEFT',h1,h2,ox-(w2-w1)/2,oy),face('RIGHT',h1,h2,ox+(w2-w1)/2,oy)];
}
function capsule(w,h,x=0,y=0,hole=false){const r=h/2,c=(w-h)/2;const right=arcPoints(r,-PI/2,PI/2).map(([a,b])=>[a+x+w/2+c,b+y+h/2]);const left=arcPoints(r,PI/2,3*PI/2).map(([a,b])=>[a+x+w/2-c,b+y+h/2]);return poly([...right,...left],true,hole);}
function create(id,values){
 const def=definition(id),v={};
 for(const f of def.fields){const x=values[f.key];check(typeof x==='number'&&Number.isFinite(x),`Check ${f.label}.`);check(x>=f.min&&x<=f.max,`${f.label} is outside the allowed range.`);if(f.kind==='count')check(Number.isInteger(x),`${f.label}: enter a whole number.`);v[f.key]=x;}
 const {width:w,height:h,length:L,seam:s=0,endA:a=0,endB:b=0}=v;let parts=[],notes=[];
 switch(id){
  case 'rect-straight':{
   const pitch=2*(w+h)+s,folds=[w,w+h,2*w+h].map(x=>line([x,0],[x,L+a+b]));if(s>0)folds.push(line([pitch-s,0],[pitch-s,L+a+b]));if(a)folds.push(line([0,a],[pitch,a]));if(b)folds.push(line([0,a+L],[pitch,a+L]));parts=[part('WRAP',rect(pitch,L+a+b),folds)];notes.push('Neutral-surface development without bend deductions. S adds a straight lap; it does not generate a Pittsburgh or snap-lock profile.');break;
  }
  case 'rect-two-piece':{const folds=[line([w,0],[w,L])];if(s)folds.push(line([w+h,0],[w+h,L]));parts=[part('L-PANEL A',rect(w+h+s,L),folds),part('L-PANEL B',rect(w+h+s,L),folds)];notes.push('Two matching L panels with one straight lap allowance per panel. Bend deductions are not applied.');break;}
  case 'rect-transition':parts=transition(v.w1,v.h1,v.w2,v.h2,L,v.offsetX,v.offsetY);notes.push('True panel lengths account for center offsets and axial length. Four separate panels without joint or flange allowances.');break;
  case 'rect-offset':parts=transition(w,h,w,h,L,v.offsetX,v.offsetY);notes.push('X/Y are offsets between opening centers. Four separate panels without joint allowances.');break;
  case 'rect-elbow':{
   const angle=v.angle*PI/180,ri=v.radius,ro=ri+w;const cheek=sector(ro,ri,angle);parts=[part('CHEEK A',cheek),part('CHEEK B',cheek),part('THROAT',rect(ri*angle,h)),part('HEEL',rect(ro*angle,h))];notes.push('Two curved cheeks plus throat and heel wrappers. Neutral dimensions, without joints or flanges. Arc chord deviation is at most 0.05 mm.');break;
  }
  case 'rect-endcap':{
   const f=v.flange;check(f<Math.min(w,h)/2,'The edge fold must be less than half the smaller side.');if(!f){parts=[part('CAP',rect(w,h))];break;}
   parts=[part('CAP',poly([[f,0],[f+w,0],[f+w,f],[w+2*f,f],[w+2*f,h+f],[w+f,h+f],[w+f,h+2*f],[f,h+2*f],[f,h+f],[0,h+f],[0,f],[f,f]]),[line([f,f],[w+f,f]),line([w+f,f],[w+f,h+f]),line([w+f,h+f],[f,h+f]),line([f,h+f],[f,f])])];notes.push('Square corner notches for edge folds. No automatic bend deductions or corner overlaps.');break;
  }
  case 'round-straight':{const pitch=PI*v.diameter+s,folds=[];if(s)folds.push(line([pitch-s,0],[pitch-s,L+a+b]));if(a)folds.push(line([0,a],[pitch,a]));if(b)folds.push(line([0,a+L],[pitch,a+L]));parts=[part('ROUND SHELL',rect(pitch,L+a+b),folds)];notes.push('Flat width = pi x neutral diameter + seam allowance S. Use the neutral-surface diameter; gauge does not automatically change geometry.');break;}
  case 'round-reducer':{
   const R=Math.max(v.d1,v.d2)/2,r=Math.min(v.d1,v.d2)/2,dr=R-r;
   if(dr<1e-7){parts=[part('EQUAL SHELL',rect(TAU*R,L))];break;}
   // Shift to the outer mid-arc to avoid cancellation when the diameters nearly match.
   const slant=Math.hypot(L,dr),ro=slant*R/dr,ri=slant*r/dr,theta=TAU*dr/slant;
   const steps=Math.max(32,Math.ceil(theta/(4*Math.asin(Math.sqrt(Math.min(1,TOL/(2*ro)))))));
   const curve=(radius,reverse)=>Array.from({length:steps+1},(_,i)=>{const t=-theta/2+theta*(reverse?steps-i:i)/steps;return [-2*radius*Math.sin(t/2)**2+(radius-ro),radius*Math.sin(t)];});
   parts=[part('CONE',poly([...curve(ro,false),...curve(ri,true)]))];notes.push('Concentric neutral-surface reducer with true slant length. No seam or flange allowances. Arc chord deviation is at most 0.05 mm.');break;
  }
  case 'round-elbow':{
   const r=v.diameter/2,R=v.radius;check(R>r,'Centerline radius must exceed half the tube diameter.');
   const beta=v.angle*PI/180/(2*(v.segments-1)),t=Math.tan(beta),c=R*t,C=TAU*r;check(s<C,'Seam allowance must be smaller than the circumference.');
   const steps=Math.max(96,Math.ceil((C+s)/C*TAU*Math.sqrt(r*t/(8*TOL))));
   for(let i=0;i<v.segments;i++){
    const start=i===0,end=i===v.segments-1;
    const lower=x=>start?0:-r*t*Math.cos(x/r),upper=x=>end?c:(start?c:2*c)+r*t*Math.cos(x/r);
    const low=[],high=[];for(let j=0;j<=steps;j++){const x=(C+s)*j/steps;low.push([x,lower(x)]);high.unshift([x,upper(x)]);}
    const folds=s?[line([C,lower(C)],[C,upper(C)])]:[];
    parts.push(part(`GORE ${i+1}${start||end?' END':''}`,poly([...low,...high]),folds));
   }
   notes.push('Cylindrical gores: joint deflection = total angle / (gores - 1). R is the centerline radius of the tangent polygon. S adds a straight lap; gore joints have no allowances.');break;
  }
  case 'round-miter':{
   const r=v.diameter/2,t=Math.tan(v.angle*PI/180),C=TAU*r;check(s<C,'Seam allowance must be smaller than the circumference.');check(L>r*t,'Center length is too short for this diameter and miter angle.');
   const steps=Math.max(96,Math.ceil((C+s)/C*TAU*Math.sqrt(r*t/(8*TOL))));const pts=[[0,0],[C+s,0]];
   for(let i=steps;i>=0;i--){const x=(C+s)*i/steps;pts.push([x,L+r*t*Math.cos(x/r)]);}parts=[part('MITER SHELL',poly(pts),s?[line([C,0],[C,L+r*t])]:[])];notes.push('One square end and one mitered end. L is length at the tube axis; the angle is measured from a square cut.');break;
  }
  case 'round-endcap':parts=[part('DISK',circle(v.diameter/2,v.diameter/2,v.diameter/2))];break;
  case 'flat-plate':parts=[part('PLATE',rect(w,h))];break;
  case 'plate-holes':{const r=v.holeD/2,t=v.inset;check(t>r&&t*2+2*r<Math.min(w,h),'Holes must be fully inside the plate and must not overlap.');parts=[part('MOUNTING PLATE',[rect(w,h),...[[t,t],[w-t,t],[w-t,h-t],[t,h-t]].map(([x,y])=>circle(x,y,r,true))])];break;}
  case 'rect-frame':{check(v.innerW<w&&v.innerH<h,'The opening must be smaller than the frame.');parts=[part('RECT FRAME',[rect(w,h),rect(v.innerW,v.innerH,(w-v.innerW)/2,(h-v.innerH)/2,true)])];break;}
  case 'round-ring':{check(v.innerD<v.outerD,'The opening diameter must be smaller than the outside diameter.');const r=v.outerD/2;parts=[part('RING',[circle(r,r,r),circle(r,r,v.innerD/2,true)])];break;}
  case 'oval-frame':{const f=v.flange;check(w>=h,'Flat-oval width must be at least its height.');check(f*2<h,'Frame width must be less than half the overall height.');parts=[part('OVAL FRAME',[capsule(w,h),capsule(w-2*f,h-2*f,f,f,true)])];notes.push('Flat-oval frame: two straight sides and two semicircles, with a constant frame width.');break;}
 }
 check(parts.length>0,'No geometry is available for this pattern.');
 return {id,definition:def,values:v,parts,notes};
}
function movePath(p,rotation,dx,dy){const rot=([x,y])=>rotation===90?[-y,x]:[x,y];if(p.type==='circle'){const [x,y]=rot([p.cx,p.cy]);return {...p,cx:x+dx,cy:y+dy};}return {...p,points:p.points.map(q=>{const [x,y]=rot(q);return [x+dx,y+dy];})};}
function place(p,rotation,x,y){const b=bounds(p.cuts.map(path=>movePath(path,rotation,0,0))),dx=x-b.x0,dy=y-b.y0;return {...p,cuts:p.cuts.map(q=>movePath(q,rotation,dx,dy)),folds:p.folds.map(q=>movePath(q,rotation,dx,dy)),x,y,w:b.w,h:b.h,rotation};}
function pack(input,settings){
 const {sheetW:W,sheetH:H,gap,margin}=settings;for(const n of [W,H,gap,margin])check(typeof n==='number'&&Number.isFinite(n),'Check the stock sheet dimensions.');
 check(W>0&&H>0&&W<=100000&&H<=100000&&gap>=0&&margin>=0&&2*margin<Math.min(W,H),'Sheet dimensions or edge margins are invalid.');
 check(input.length<=600,'A job can contain at most 600 flat parts.');
 const sheets=[],errors=[];const list=input.map((p,index)=>({...p,index})).sort((a,b)=>b.bounds.w*b.bounds.h-a.bounds.w*a.bounds.h||a.index-b.index);
 for(const p of list){
  const bw=p.bounds.w,bh=p.bounds.h;
  if(!((bw<=W-2*margin+EPS&&bh<=H-2*margin+EPS)||(bh<=W-2*margin+EPS&&bw<=H-2*margin+EPS))){errors.push(`${p.name}: ${p.bounds.w.toFixed(1)} × ${p.bounds.h.toFixed(1)} mm does not fit within the sheet margins.`);continue;}
  let best=null;
  for(let si=0;si<sheets.length;si++)for(let fi=0;fi<sheets[si].free.length;fi++)for(const rotation of [0,90]){const f=sheets[si].free[fi],w=rotation?bh:bw,h=rotation?bw:bh;if(w<=f.w+EPS&&h<=f.h+EPS){const score=Math.min(f.w-w,f.h-h)*100000+f.w*f.h-w*h;if(!best||score<best.score)best={si,fi,rotation,w,h,score};}}
  if(!best){check(sheets.length<100,'A job can contain at most 100 sheets.');sheets.push({parts:[],free:[{x:margin,y:margin,w:W-2*margin,h:H-2*margin}]});best={si:sheets.length-1,fi:0,rotation:0,w:bw,h:bh};if(bw>W-2*margin+EPS||bh>H-2*margin+EPS)best={...best,rotation:90,w:bh,h:bw};}
  const sheet=sheets[best.si],f=sheet.free.splice(best.fi,1)[0],rw=f.w-best.w-gap,rh=f.h-best.h-gap;
  if(rw>rh){if(rw>EPS)sheet.free.push({x:f.x+best.w+gap,y:f.y,w:rw,h:f.h});if(rh>EPS)sheet.free.push({x:f.x,y:f.y+best.h+gap,w:best.w,h:rh});}
  else{if(rh>EPS)sheet.free.push({x:f.x,y:f.y+best.h+gap,w:f.w,h:rh});if(rw>EPS)sheet.free.push({x:f.x+best.w+gap,y:f.y,w:rw,h:best.h});}
  sheet.parts.push(place(p,best.rotation,f.x,f.y));
 }
 for(const sheet of sheets){delete sheet.free;sheet.area=sheet.parts.reduce((n,p)=>n+p.area,0);sheet.utilization=sheet.area/(W*H);sheet.cutLength=sheet.parts.reduce((n,p)=>n+p.cutLength,0);}
 return {sheets,errors,valid:!errors.length&&input.length>0,settings:{...settings},partCount:input.length,placedCount:sheets.reduce((n,s)=>n+s.parts.length,0)};
}
function job(items,settings){const parts=[],notes=[];check(Array.isArray(items)&&items.length<=100,'Invalid job list.');for(const item of items){check(Number.isInteger(item.quantity)&&item.quantity>=1&&item.quantity<=100,'Quantity must be a whole number from 1 to 100.');const g=create(item.patternId,item.values);notes.push(...g.notes);for(let i=0;i<item.quantity;i++)for(const p of g.parts)parts.push({...p,itemId:item.id,name:`${item.tag||g.definition.code} / ${p.name} #${i+1}`});}return {...pack(parts,settings),notes:[...new Set(notes)]};}
function dxf(layout,sheetIndex=0,options={}){
 check(layout&&layout.valid,'Correct the inputs before exporting.');const sheet=layout.sheets[sheetIndex];check(sheet,'Select a valid sheet.');const unit=options.unit==='mm'?'mm':'in',factor=unit==='in'?1/25.4:1,legacy=options.version==='R12',bend=!!options.includeBend,lines=[];
 const add=(...v)=>lines.push(...v.map(String)),num=x=>{const n=Number((x*factor).toFixed(7));return Object.is(n,-0)?0:n;};
 add(999,`AJ Duct Fabrication | ${unit.toUpperCase()} | 1:1 | Sheet ${sheetIndex+1}`,0,'SECTION',2,'HEADER',9,'$ACADVER',1,legacy?'AC1009':'AC1015',9,'$LUNITS',70,2,9,'$LUPREC',70,6);
 if(!legacy)add(9,'$INSUNITS',70,unit==='mm'?4:1,9,'$MEASUREMENT',70,unit==='mm'?1:0);
 add(9,'$EXTMIN',10,0,20,0,30,0,9,'$EXTMAX',10,num(layout.settings.sheetW),20,num(layout.settings.sheetH),30,0,0,'ENDSEC',0,'SECTION',2,'TABLES',0,'TABLE',2,'LTYPE',70,1,0,'LTYPE',2,'CONTINUOUS',70,0,3,'Solid line',72,65,73,0,40,0,0,'ENDTAB',0,'TABLE',2,'LAYER',70,bend?2:1);
 for(const [name,color]of [['CUT',7],...(bend?[['BEND',3]]:[])])add(0,'LAYER',2,name,70,0,62,color,6,'CONTINUOUS');
 add(0,'ENDTAB',0,'ENDSEC',0,'SECTION',2,'ENTITIES');
 const modern=type=>{if(!legacy)add(100,'AcDbEntity',8,type);};
 function draw(p,layer){
  if(p.type==='circle'){add(0,'CIRCLE');if(legacy)add(8,layer);else{modern(layer);add(100,'AcDbCircle');}add(10,num(p.cx),20,num(p.cy),30,0,40,num(p.r));return;}
  if(legacy){add(0,'POLYLINE',8,layer,66,1,70,p.closed?1:0,10,0,20,0,30,0);for(const [x,y]of p.points)add(0,'VERTEX',8,layer,10,num(x),20,num(y),30,0);add(0,'SEQEND',8,layer);}
  else{add(0,'LWPOLYLINE');modern(layer);add(100,'AcDbPolyline',90,p.points.length,70,p.closed?1:0,38,0);for(const [x,y]of p.points)add(10,num(x),20,num(y));}
 }
 // Internal contours precede external contours; controller/CAM still sets the final cut order.
 for(const p of sheet.parts){for(const path of [...p.cuts].sort((a,b)=>Number(b.hole)-Number(a.hole)))draw(path,'CUT');if(bend)for(const path of p.folds)draw(path,'BEND');}
 add(0,'ENDSEC',0,'EOF');return lines.join('\r\n')+'\r\n';
}
function svgPath(p){return p.type==='circle'?`M ${p.cx-p.r} ${p.cy} a ${p.r} ${p.r} 0 1 0 ${2*p.r} 0 a ${p.r} ${p.r} 0 1 0 ${-2*p.r} 0`:`M ${p.points.map(q=>q.join(' ')).join(' L ')}${p.closed?' Z':''}`;}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function svg(layout,index=0,{includeBend=true}={}){check(layout&&layout.valid,'No valid sheet is available.');const s=layout.sheets[index],W=layout.settings.sheetW,H=layout.settings.sheetH;return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="white"/><g transform="translate(0 ${H}) scale(1 -1)">${s.parts.map(p=>`<path d="${p.cuts.map(svgPath).join(' ')}" fill="#dbeafe" fill-rule="evenodd" stroke="#2563eb" stroke-width="0.6"/>${includeBend?p.folds.map(q=>`<path d="${svgPath(q)}" fill="none" stroke="#b45309" stroke-width="0.4" stroke-dasharray="4 3"/>`).join(''):''}`).join('')}</g></svg>`;}
// Stored ZIP format: valid UTF-8 filenames and CRC32, with no download dependencies.
function zip(files){const enc=new TextEncoder(),chunks=[],central=[];let offset=0;const u16=(v,o,x)=>v.setUint16(o,x,true),u32=(v,o,x)=>v.setUint32(o,x>>>0,true);const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return(c^0xffffffff)>>>0;};for(const f of files){const name=enc.encode(f.name),data=enc.encode(f.content),c=crc(data),local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);u32(lv,0,0x04034b50);u16(lv,4,20);u16(lv,6,0x800);u16(lv,12,33);u32(lv,14,c);u32(lv,18,data.length);u32(lv,22,data.length);u16(lv,26,name.length);local.set(name,30);const cen=new Uint8Array(46+name.length),cv=new DataView(cen.buffer);u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x800);u16(cv,14,33);u32(cv,16,c);u32(cv,20,data.length);u32(cv,24,data.length);u16(cv,28,name.length);u32(cv,42,offset);cen.set(name,46);chunks.push(local,data);central.push(cen);offset+=local.length+data.length;}const cs=central.reduce((s,c)=>s+c.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);u32(ev,0,0x06054b50);u16(ev,8,files.length);u16(ev,10,files.length);u32(ev,12,cs);u32(ev,16,offset);const out=new Uint8Array(offset+cs+22);let pos=0;for(const chunk of [...chunks,...central,end]){out.set(chunk,pos);pos+=chunk.length;}return out;}
return {definitions,definition,defaults,parseDimension,create,pack,job,dxf,svg,svgPath,bounds,area,pathLength,zip,escape,version:'1.0.0'};
});
