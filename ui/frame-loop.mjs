// One pending frame at most; no animation callbacks while idle or hidden.
export class FrameLoop {
  constructor(draw,{request=callback=>requestAnimationFrame(callback),cancel=id=>cancelAnimationFrame(id)}={}){
    this.draw=draw;this.request=request;this.cancel=cancel;this.pending=null;this.paused=false;this.previous=null;
    this.tick=now=>{
      this.pending=null;
      if(this.paused)return;
      const elapsed=this.previous===null?1000/60:Math.min(50,now-this.previous);
      this.previous=now;
      if(this.draw(now,elapsed))this.wake();else this.previous=null;
    };
  }
  wake(){if(!this.paused&&this.pending===null)this.pending=this.request(this.tick);}
  setPaused(paused){
    this.paused=Boolean(paused);
    if(this.paused){if(this.pending!==null)this.cancel(this.pending);this.pending=null;this.previous=null;}
    else this.wake();
  }
}
