export class Cloth {
  constructor(width, height, x, y, cols = 32, rows = 24) {
    Object.assign(this, { width, height, x, y, cols, rows });
    this.points = []; this.links = []; this.grab = null; this.bumps = []; this.flattening = false;
    this.setWeight(.5);
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const px = x + i * width / cols, py = y + j * height / rows;
      this.points.push({ x: px, y: py, z: 0, ox: px, oy: py, oz: 0, u: i / cols, v: j / rows, ground: 0 });
    }
    const link = (a, b, stiffness) => {
      const p = this.points[a], q = this.points[b];
      this.links.push({ a, b, length: Math.hypot(p.x - q.x, p.y - q.y), stiffness });
    };
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const k = j * (cols + 1) + i;
      if (i < cols) link(k, k + 1, .9);
      if (j < rows) link(k, k + cols + 1, .9);
      if (i < cols && j < rows) { link(k, k + cols + 2, .55); link(k + 1, k + cols + 1, .55); }
      if (i < cols - 1) link(k, k + 2, .12);
      if (j < rows - 1) link(k, k + (cols + 1) * 2, .12);
    }
  }
  setWeight(value){
    this.weight=Number.isFinite(value)?Math.max(0,Math.min(1,value)):.5;
    const w=this.weight;
    // A perceptual material control, not a claim about real kilograms.
    this.motion={gravity:.18+.4*w,airDrag:.985-.04*w,groundDrag:.8-.16*w,
      gripFollow:.36-.24*w,liftFollow:.32-.24*w,gripStrength:.21-.1*w,
      bend:.55+.9*w,rebound:.2-.16*w,lift:1.3-.6*w,moveFollow:.48-.32*w};
  }
  ground(p) {
    let height = 0;
    for (const bump of this.bumps) {
      const dx = (p.x - (this.x + bump.u * this.width)) / 30;
      const dy = (p.y - (this.y + bump.v * this.height)) / 27;
      height += 19 * Math.exp(-(dx * dx + dy * dy) / 2);
    }
    return Math.min(100, height);
  }
  step() {
    const motion=this.motion;
    if (this.grab) {
      const p = this.points[this.grab.index];
      this.grab.current ??= { x: p.x, y: p.y, z: p.z };
      const c = this.grab.current;
      c.x += (this.grab.x-c.x)*motion.gripFollow;
      c.y += (this.grab.y+this.grab.z*.6-c.y)*motion.gripFollow;
      c.z += (this.grab.z-c.z)*motion.liftFollow;
    }
    for (const p of this.points) {
      p.ground += (this.ground(p)-p.ground)*.12;
      const friction=p.z<=p.ground+.8?motion.groundDrag:motion.airDrag+.01;
      const vx = Math.max(-18,Math.min(18,(p.x-p.ox)*friction));
      const vy = Math.max(-18,Math.min(18,(p.y-p.oy)*friction));
      const vz = Math.max(-16,Math.min(16,(p.z-p.oz)*motion.airDrag));
      p.ox = p.x; p.oy = p.y; p.oz = p.z;
      p.x += vx; p.y += vy; p.z += vz - motion.gravity;
      // A distributed grip lifts a little fabric rather than stretching one vertex.
      if(this.grab){
        const held=this.points[this.grab.index],c=this.grab.current;
        const d=Math.hypot((p.u-held.u)*this.width,(p.v-held.v)*this.height);
        const weight=Math.exp(-d*d/(2*26*26))*motion.gripStrength;
        p.x+=(c.x+(p.u-held.u)*this.width-p.x)*weight;
        p.y+=(c.y+(p.v-held.v)*this.height-p.y)*weight;
        p.z+=(c.z-p.z)*weight;
      }else if(this.flattening){
        p.x+=(this.x+p.u*this.width-p.x)*.075;
        p.y+=(this.y+p.v*this.height-p.y)*.075;
        p.z+=(p.ground-p.z)*.055;
      }
      if(p.z<p.ground){p.z=p.ground;p.oz=p.z+(vz<-.7?vz*motion.rebound:0);}
    }
    for (let iteration = 0; iteration < 8; iteration++) {
      for (const link of this.links) {
        const a = this.points[link.a], b = this.points[link.b];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const length = Math.hypot(dx, dy, dz) || .001;
        const correction = (length - link.length) / length * .5 * link.stiffness*(link.stiffness===.12?motion.bend:1);
        a.x += dx * correction; a.y += dy * correction; a.z += dz * correction;
        b.x -= dx * correction; b.y -= dy * correction; b.z -= dz * correction;
      }
      for (const p of this.points) p.z = Math.max(p.z, p.ground);
      if (this.grab) {
        const p = this.points[this.grab.index],c=this.grab.current;
        p.x=c.x;p.y=c.y;p.z=c.z;
      }
    }
  }
  resize(width,height,x=this.x,y=this.y){
    const sx=width/this.width,sy=height/this.height;
    for(const p of this.points){p.x=x+(p.x-this.x)*sx;p.ox=x+(p.ox-this.x)*sx;p.y=y+(p.y-this.y)*sy;p.oy=y+(p.oy-this.y)*sy;}
    Object.assign(this,{width,height,x,y});
    for(const link of this.links){const a=this.points[link.a],b=this.points[link.b];link.length=Math.hypot((a.u-b.u)*width,(a.v-b.v)*height);}
  }
  flatten(){this.grab=null;this.flattening=true;}
  settle(){
    this.grab=null;
    // The released fabric defines its new home, without attraction to the old rectangle.
    const center=this.points.reduce((c,p)=>({x:c.x+p.x,y:c.y+p.y}),{x:0,y:0});
    this.x=center.x/this.points.length-this.width/2;
    this.y=center.y/this.points.length-this.height/2;
    for(const p of this.points){p.ox=p.x;p.oy=p.y;}
  }
  ripple(u,v,strength){for(const p of this.points){const d=Math.hypot((p.u-u)*this.width,(p.v-v)*this.height);p.oz-=strength*Math.exp(-d*d/(2*65*65));}}
  translate(dx, dy) {
    this.x += dx; this.y += dy;
    for (const p of this.points) { p.x += dx; p.ox += dx; p.y += dy; p.oy += dy; }
  }
  project(p) { return { x: p.x, y: p.y - p.z * .6 }; }
  bounds(){
    const points=this.points.map(p=>this.project(p));
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
    return {x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y};
  }
  nearest(x, y) {
    let index = 0, distance = Infinity;
    this.points.forEach((p, i) => { const q = this.project(p), d = Math.hypot(q.x - x, q.y - y); if (d < distance) { distance = d; index = i; } });
    return { index, distance, point: this.points[index] };
  }
  triangles() {
    const result = [];
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
      const a = j * (this.cols + 1) + i, b = a + 1, c = a + this.cols + 1, d = c + 1;
      result.push([this.points[a], this.points[b], this.points[c]], [this.points[b], this.points[d], this.points[c]]);
    }
    return result.sort((a, b) => a.reduce((s,p) => s+p.z,0) - b.reduce((s,p) => s+p.z,0));
  }
  contains(x, y) {
    return this.triangles().some(t => {
      const [a,b,c] = t.map(p => this.project(p));
      const sign = (p,q,r) => (p.x-r.x)*(q.y-r.y)-(q.x-r.x)*(p.y-r.y);
      const p = {x,y}, d1 = sign(p,a,b), d2 = sign(p,b,c), d3 = sign(p,c,a);
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    });
  }
}
