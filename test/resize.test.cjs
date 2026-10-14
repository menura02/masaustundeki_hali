const {test}=require('node:test');
const assert=require('node:assert/strict');
test('outer edges resize while the inner grip remains available for folding',async()=>{
  const {resizeEdge}=await import('../ui/resize.mjs');const r={x:100,y:100,width:500,height:350};
  assert.equal(resizeEdge(r,100,100),'nw');assert.equal(resizeEdge(r,600,450),'se');
  assert.equal(resizeEdge(r,350,100),'n');assert.equal(resizeEdge(r,97,260),'w');
  assert.equal(resizeEdge(r,122,122),'');assert.equal(resizeEdge(r,50,260),'');
});
test('all eight directions keep opposite edges fixed and enforce screen / minimum sizes',async()=>{
  const {resizeBounds}=await import('../ui/resize.mjs');const r={x:100,y:100,width:500,height:350},screen={width:1000,height:800};
  for(const edge of ['n','s','w','e','nw','ne','sw','se']){
    const b=resizeBounds(r,edge,40,30,screen);
    if(edge.includes('w'))assert.equal(b.x+b.width,600);else assert.equal(b.x,100);
    if(edge.includes('n'))assert.equal(b.y+b.height,450);else assert.equal(b.y,100);
  }
  assert.equal(resizeBounds(r,'se',-1000,-1000,screen).width,180);
  assert.equal(resizeBounds(r,'nw',1000,1000,screen).height,125);
  assert.equal(resizeBounds(r,'se',1000,1000,screen).x+resizeBounds(r,'se',1000,1000,screen).width,990);
});
