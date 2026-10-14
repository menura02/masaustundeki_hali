const {test}=require('node:test');
const assert=require('node:assert/strict');
test('desktop icons count independently of stashed files and follow rug placement',async()=>{
  const {Cloth}=await import('../ui/cloth.mjs');
  const {coveredIcons}=await import('../ui/coverage.mjs');
  const cloth=new Cloth(500,360,100,100);
  const icons=[{name:'corner',x:110,y:110},{name:'middle',x:350,y:280},{name:'outside',x:900,y:900}];
  assert.deepEqual(coveredIcons(cloth,icons).map(p=>p.name),['corner','middle']);
  cloth.bumps=[{u:.5,v:.5},{u:.5,v:.5}];
  assert.equal(coveredIcons(cloth,icons).length,2);
  cloth.translate(600,0);
  assert.deepEqual(coveredIcons(cloth,icons),[]);
  cloth.translate(-600,0);
  assert.equal(coveredIcons(cloth,icons).length,2);
});
