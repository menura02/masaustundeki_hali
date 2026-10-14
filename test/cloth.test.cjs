const {test}=require('node:test');
const assert=require('node:assert/strict');
test('cloth stays finite during dragging, release and stacked collisions',async()=>{
  const {Cloth}=await import('../ui/cloth.mjs');const cloth=new Cloth(500,360,100,100);
  cloth.bumps=Array.from({length:8},()=>({u:.5,v:.5}));
  cloth.grab={index:0,x:450,y:300,z:130};for(let i=0;i<90;i++)cloth.step();cloth.grab=null;
  for(let i=0;i<180;i++)cloth.step();
  for(const p of cloth.points){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z));assert.ok(p.z>=0);}
  assert.ok(cloth.points.some(p=>p.z>25));
});
test('resize preserves the opposite anchor, bumps and material dimensions',async()=>{
  const {Cloth}=await import('../ui/cloth.mjs');const cloth=new Cloth(500,360,100,100);
  cloth.bumps=[{u:.5,v:.5}];cloth.resize(700,400,50,70);
  assert.equal(cloth.points[0].x,50);assert.equal(cloth.points.at(-1).x,750);
  assert.equal(cloth.points.at(-1).y,470);assert.equal(cloth.bumps.length,1);
  for(let i=0;i<100;i++)cloth.step();
  const center=cloth.points[Math.floor(cloth.rows/2)*(cloth.cols+1)+Math.floor(cloth.cols/2)];
  assert.ok(center.z>10);assert.ok(Math.abs(center.x-400)<20);
});
test('grip eases toward the pointer and flatten settles without teleporting',async()=>{
  const {Cloth}=await import('../ui/cloth.mjs');const cloth=new Cloth(500,360,100,100);
  cloth.grab={index:0,x:300,y:220,z:150};cloth.step();
  assert.ok(cloth.points[0].x>100&&cloth.points[0].x<300);
  for(let i=0;i<60;i++)cloth.step();
  const before=cloth.points[0].z;cloth.flatten();assert.equal(cloth.points[0].z,before);
  for(let i=0;i<240;i++)cloth.step();
  assert.ok(cloth.points[0].z<1);assert.ok(Math.abs(cloth.points[0].x-100)<3);
});
test('translation carries mesh and collision origins together',async()=>{
  const {Cloth}=await import('../ui/cloth.mjs');const cloth=new Cloth(500,360,100,100);
  assert.equal(cloth.contains(350,280),true);assert.equal(cloth.contains(1,1),false);
  cloth.translate(50,75);assert.equal(cloth.x,150);assert.equal(cloth.points[0].ox,150);assert.equal(cloth.points[0].y,175);
});
test('released fabric keeps its new location instead of returning to its original rectangle',async()=>{
  const {Cloth}=await import('../ui/cloth.mjs');const cloth=new Cloth(500,360,100,100);
  cloth.grab={index:0,x:750,y:300,z:100};for(let i=0;i<180;i++)cloth.step();
  cloth.settle();const placed=cloth.x;
  assert.ok(placed>180);
  for(let i=0;i<360;i++)cloth.step();
  const actualCenter=cloth.points.reduce((sum,p)=>sum+p.x,0)/cloth.points.length;
  assert.ok(Math.abs(actualCenter-(placed+250))<25);
  assert.ok(actualCenter>430);
});
test('heavy fabric follows the same grip more slowly and falls sooner',async()=>{
  const {Cloth}=await import('../ui/cloth.mjs');
  const light=new Cloth(500,360,100,100),heavy=new Cloth(500,360,100,100);
  light.setWeight(0);heavy.setWeight(1);
  for(const cloth of [light,heavy]){cloth.grab={index:0,x:300,y:200,z:100};cloth.step();}
  assert.ok(light.points[0].x>heavy.points[0].x+20);
  assert.ok(light.points[0].z>heavy.points[0].z+10);
  for(const cloth of [light,heavy]){
    cloth.grab=null;
    for(const p of cloth.points){p.z=100;p.oz=100;}
    for(let i=0;i<15;i++)cloth.step();
  }
  const average=cloth=>cloth.points.reduce((sum,p)=>sum+p.z,0)/cloth.points.length;
  assert.ok(average(light)>average(heavy)+20);
});
test('weight can change on a folded rug without resetting it and remains stable at both extremes',async()=>{
  const {Cloth}=await import('../ui/cloth.mjs');
  for(const weight of [0,1]){
    const cloth=new Cloth(500,360,100,100);
    cloth.grab={index:0,x:350,y:250,z:120};for(let i=0;i<30;i++)cloth.step();
    const before=cloth.points.map(p=>[p.x,p.y,p.z]);cloth.setWeight(weight);
    assert.deepEqual(cloth.points.map(p=>[p.x,p.y,p.z]),before);
    for(let i=0;i<60;i++)cloth.step();cloth.settle();
    for(let i=0;i<180;i++)cloth.step();
    for(const p of cloth.points)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z)&&p.z>=0);
  }
});
test('center grip deforms the cloth instead of translating every point equally',async()=>{
  const {Cloth}=await import('../ui/cloth.mjs');const cloth=new Cloth(500,360,100,100);
  const index=12*33+16,held=cloth.points[index];
  const start=cloth.points.map(p=>({x:p.x,y:p.y,z:p.z}));
  cloth.grab={index,x:held.x+100,y:held.y,z:80};
  for(let i=0;i<25;i++)cloth.step();
  const centerShift=cloth.points[index].x-start[index].x;
  const shifts=cloth.points.map((p,i)=>p.x-start[i].x);
  assert.ok(centerShift>80);assert.ok(Math.max(...shifts)-Math.min(...shifts)>50);
  assert.ok(cloth.points[index].z>60);assert.ok(cloth.points[0].z<20);
  cloth.settle();const placed=cloth.x;
  for(let i=0;i<180;i++)cloth.step();
  const mean=cloth.points.reduce((sum,p)=>sum+p.x,0)/cloth.points.length;
  assert.ok(Math.abs(mean-(placed+250))<25);
});
