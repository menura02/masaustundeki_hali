export class Cloth {
  constructor(width, height, x, y, cols = 32, rows = 24) {
    Object.assign(this, { width, height, x, y, cols, rows });
    this.points = []; this.links = []; this.grab = null; this.flattening = false;
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
    this.mesh=[];
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;
      this.mesh.push([this.points[a],this.points[b],this.points[c]],[this.points[b],this.points[d],this.points[c]]);
    }
    this.drawOrder=this.mesh.slice();
    this.boundary=[];
    for(let i=0;i<=cols;i++)this.boundary.push(this.points[i]);
    for(let j=1;j<=rows;j++)this.boundary.push(this.points[j*(cols+1)+cols]);
    for(let i=cols-1;i>=0;i--)this.boundary.push(this.points[rows*(cols+1)+i]);
    for(let j=rows-1;j>0;j--)this.boundary.push(this.points[j*(cols+1)]);
  }
  setWeight(value){
    this.weight=Number.isFinite(value)?Math.max(0,Math.min(1,value)):.5;
    const w=this.weight;
    // A perceptual material control, not a claim about real kilograms.
    this.motion={gravity:.18+.4*w,airDrag:.985-.04*w,groundDrag:.8-.16*w,
      gripFollow:.36-.24*w,liftFollow:.32-.24*w,gripStrength:.21-.1*w,
      bend:.55+.9*w,rebound:.2-.16*w,lift:1.3-.6*w,moveFollow:.48-.32*w};
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
  translate(dx, dy) {
    this.x += dx; this.y += dy;
    for (const p of this.points) { p.x += dx; p.ox += dx; p.y += dy; p.oy += dy; }
  }
  project(p) { return { x: p.x, y: p.y - p.z * .6 }; }
  bounds(){
    let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
    for(const p of this.points){const py=p.y-p.z*.6;x=Math.min(x,p.x);y=Math.min(y,py);right=Math.max(right,p.x);bottom=Math.max(bottom,py);}
    return {x,y,width:right-x,height:bottom-y};
  }
  nearest(x, y) {
    let index = 0, distance = Infinity;
    this.points.forEach((p, i) => { const q = this.project(p), d = Math.hypot(q.x - x, q.y - y); if (d < distance) { distance = d; index = i; } });
    return { index, distance, point: this.points[index] };
  }
  triangles() {
    return this.drawOrder.sort((a,b)=>(a[0].z+a[1].z+a[2].z)-(b[0].z+b[1].z+b[2].z));
  }
  contains(x, y) {
    const bounds=this.bounds();
    if(x<bounds.x||y<bounds.y||x>bounds.x+bounds.width||y>bounds.y+bounds.height)return false;
    for(const [a,b,c] of this.mesh){
      const ay=a.y-a.z*.6,by=b.y-b.z*.6,cy=c.y-c.z*.6;
      // Edge-on triangles have no clickable area.
      if(Math.abs((b.x-a.x)*(cy-ay)-(c.x-a.x)*(by-ay))<1e-8)continue;
      const d1=(x-b.x)*(ay-by)-(a.x-b.x)*(y-by);
      const d2=(x-c.x)*(by-cy)-(b.x-c.x)*(y-cy);
      const d3=(x-a.x)*(cy-ay)-(c.x-a.x)*(y-ay);
      if(!((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0)))return true;
    }
    return false;
  }
  isResting(tolerance=.04){return !this.grab&&this.points.every(p=>Math.abs(p.x-p.ox)<tolerance&&Math.abs(p.y-p.oy)<tolerance&&Math.abs(p.z-p.oz)<tolerance);}
}
