const {test}=require('node:test');
const assert=require('node:assert/strict');

async function harness(draw){
  const {FrameLoop}=await import('../ui/frame-loop.mjs');
  const queue=new Map();let sequence=0;
  const loop=new FrameLoop(draw,{request:callback=>{queue.set(++sequence,callback);return sequence;},cancel:id=>queue.delete(id)});
  const frame=now=>{assert.equal(queue.size,1);const [id,callback]=queue.entries().next().value;queue.delete(id);callback(now);};
  return {loop,queue,frame};
}

test('idle animation has no scheduled frames and repeated input coalesces into one frame',async()=>{
  let moving=false,draws=0;
  const {loop,queue,frame}=await harness(()=>{draws++;return moving;});
  for(let i=0;i<100;i++)loop.wake();
  frame(100);assert.equal(draws,1);assert.equal(queue.size,0);
  moving=true;loop.wake();frame(200);frame(216);assert.equal(queue.size,1);
  moving=false;frame(232);assert.equal(queue.size,0);
  loop.wake();frame(5000);assert.equal(draws,5);assert.equal(queue.size,0);
});

test('hidden animation cancels work and resumes without simulating time spent hidden',async()=>{
  const elapsed=[];
  const {loop,queue,frame}=await harness((_now,delta)=>{elapsed.push(delta);return true;});
  loop.wake();frame(100);frame(116);
  loop.setPaused(true);loop.wake();assert.equal(queue.size,0);
  loop.setPaused(false);frame(60000);
  assert.equal(elapsed.at(-1),1000/60);
  frame(61000);assert.equal(elapsed.at(-1),50);
  loop.setPaused(true);assert.equal(queue.size,0);
});
