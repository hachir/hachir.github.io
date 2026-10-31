const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js');
const settings={sheetW:3048,sheetH:1524,gap:6.35,margin:12.7};
const item=(id,quantity=1,overrides={})=>({id,tag:id,patternId:id,values:{...E.defaults(id),...overrides},quantity});
const close=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<=eps,`${a} differs from ${b}`);

test('all 16 patterns generate finite, positive, closed cutting geometry',()=>{
 assert.equal(E.definitions.length,16);
 for(const def of E.definitions){const g=E.create(def.id,E.defaults(def.id));assert.ok(g.parts.length);for(const p of g.parts){assert.ok(p.area>0);assert.ok(p.bounds.w>0&&p.bounds.h>0);for(const c of p.cuts){assert.equal(c.closed,true);if(c.type==='poly'){assert.ok(c.points.length>=3);for(const xy of c.points)assert.ok(xy.every(Number.isFinite));}else assert.ok(c.r>0);}}const layout=E.job([item(def.id)],settings);assert.equal(layout.valid,true,def.id);assert.equal(layout.partCount,layout.placedCount);}
});
test('inch fractions are strict, decimals and signed dimensions work',()=>{
 close(E.parseDimension('12 1/2'),12.5);close(E.parseDimension('12-1/2'),12.5);close(E.parseDimension('-1/4'),-.25);close(E.parseDimension('-.5'),-.5);close(E.parseDimension('٠.٥'),.5);
 for(const value of ['', '12abc','1/0','NaN','Infinity','1e4','12/2/1'])assert.throws(()=>E.parseDimension(value));
});
test('rectangular wrap and end allowances preserve exact full-scale dimensions',()=>{
 const g=E.create('rect-straight',{width:12*25.4,height:11*25.4,length:36*25.4,seam:.5*25.4,endA:25.4,endB:2*25.4});
 close(g.parts[0].bounds.w,46.5*25.4);close(g.parts[0].bounds.h,39*25.4);assert.equal(g.parts[0].folds.length,6);
});
test('transition panel edges match independently calculated 3D edge distances',()=>{
 const v={w1:650,h1:400,w2:300,h2:250,length:700,offsetX:-80,offsetY:130};const g=E.create('rect-transition',v);
 const [top,,left]=g.parts;const points=top.cuts[0].points;
 close(Math.hypot(points[3][0],points[3][1]),Math.hypot((v.w1-v.w2)/2+v.offsetX,v.length,v.offsetY+(v.h2-v.h1)/2));
 close(left.cuts[0].points[2][0]-left.cuts[0].points[3][0],v.h2);
});
test('cone development has correct slant and circumferential lengths, including nearly equal diameters',()=>{
 for(const difference of [300,.001,.0000003]){const v={d1:600,d2:600-difference,length:450},g=E.create('round-reducer',v),p=g.parts[0];assert.ok(Number.isFinite(p.area));const expected=Math.PI*(v.d1+v.d2)/2*Math.hypot(450,difference/2);assert.ok(Math.abs(p.area-expected)/expected<.001);}
});
test('gore lengths vary with radius and angle and remain positive',()=>{
 const v={diameter:300,radius:450,angle:90,segments:5,seam:0},g=E.create('round-elbow',v),half=Math.PI/180*90/8;
 assert.equal(g.parts.length,5);close(g.parts[0].bounds.w,Math.PI*300);close(g.parts[0].bounds.h,(450+150)*Math.tan(half));close(g.parts[1].bounds.h,2*(450+150)*Math.tan(half));
 assert.throws(()=>E.create('round-elbow',{...v,radius:150}));
});
test('holes subtract area and use exact circles',()=>{
 const v={width:450,height:300,holeD:10,inset:25};const p=E.create('plate-holes',v).parts[0];close(p.area,450*300-4*Math.PI*25);assert.equal(p.cuts.filter(c=>c.type==='circle').length,4);assert.equal(p.cuts.filter(c=>c.hole).length,4);
});
test('multi-sheet packing preserves quantities, margins, spacing and no overlap',()=>{
 const items=E.definitions.map((d,i)=>item(d.id,2+(i%3)));const result=E.job(items,settings);assert.ok(result.valid);assert.ok(result.sheets.length>1);assert.equal(result.partCount,items.reduce((n,i)=>n+E.create(i.patternId,i.values).parts.length*i.quantity,0));
 const m=settings.margin,gap=settings.gap;
 for(const sheet of result.sheets){assert.ok(sheet.utilization>0&&sheet.utilization<=1);for(const [i,a]of sheet.parts.entries()){assert.ok(a.x>=m-1e-6&&a.y>=m-1e-6);assert.ok(a.x+a.w<=settings.sheetW-m+1e-6&&a.y+a.h<=settings.sheetH-m+1e-6);for(const b of sheet.parts.slice(i+1)){assert.ok(a.x+a.w+gap<=b.x+1e-6||b.x+b.w+gap<=a.x+1e-6||a.y+a.h+gap<=b.y+1e-6||b.y+b.h+gap<=a.y+1e-6,'bounding boxes overlap or spacing is too small');}}}
});
test('an oversized part blocks partial export and invalid values never produce DXF',()=>{
 const layout=E.job([item('flat-plate',1,{width:10000,height:10000}),item('round-ring')],settings);assert.equal(layout.valid,false);assert.ok(layout.errors.length);assert.throws(()=>E.dxf(layout));
 assert.throws(()=>E.job([item('flat-plate',0)],settings));assert.throws(()=>E.create('flat-plate',{width:NaN,height:10}));assert.throws(()=>E.pack([],{...settings,margin:900}));
 assert.throws(()=>E.create('rect-frame',{width:100,height:100,innerW:101,innerH:50}));assert.throws(()=>E.create('plate-holes',{width:100,height:100,holeD:30,inset:10}));
});
test('DXF contains CUT only by default; BEND stays optional; no stock or annotations',()=>{
 const layout=E.job([item('rect-straight')],settings),a=E.dxf(layout,0,{unit:'in'}),b=E.dxf(layout,0,{unit:'mm',includeBend:true});
 assert.ok(!a.includes('BEND'));assert.ok(b.includes('BEND'));assert.ok(a.includes('$INSUNITS\r\n70\r\n1'));assert.ok(b.includes('$INSUNITS\r\n70\r\n4'));assert.ok(!E.dxf(layout,0,{version:'R12'}).includes('LWPOLYLINE'));assert.ok(!a.includes('\r\nTEXT\r\n'));
});

// Fixtures are used by an independent DXF parser and ZIP reader, not by the writer itself.
const dir=path.join(__dirname,'fixtures');fs.mkdirSync(dir,{recursive:true});
const meta=[];
for(const d of E.definitions){const l=E.job([item(d.id)],settings);for(const unit of ['in','mm'])for(const version of ['2000','R12']){const name=`${d.id}-${unit}-${version}.dxf`;fs.writeFileSync(path.join(dir,name),E.dxf(l,0,{unit,version,includeBend:true}));meta.push({name,unit,version,parts:l.sheets[0].parts.map(p=>({name:p.name,cutCount:p.cuts.length,foldCount:p.folds.length,area:p.area})),bounds:E.bounds(l.sheets[0].parts.flatMap(p=>p.cuts))});}}
fs.writeFileSync(path.join(dir,'metadata.json'),JSON.stringify(meta));
fs.writeFileSync(path.join(dir,'sheets.zip'),E.zip([{name:'sheet-01.dxf',content:E.dxf(E.job([item('round-ring')],settings))},{name:'notes.txt',content:'Full-scale 1:1, CUT layer.'}]));
