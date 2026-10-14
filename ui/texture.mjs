const palettes = {
  wine: ['#752f2c', '#b36c4c', '#c7ad7b', '#303b3b', '#e0cba2'],
  indigo: ['#29404c', '#597882', '#c4b28e', '#202e37', '#e0d1ae'],
  moss: ['#4a5440', '#8d8f65', '#c3b78b', '#2b392f', '#e0d2aa']
};
export function texture(theme) {
  const c = document.createElement('canvas'); c.width = 840; c.height = 600;
  const g = c.getContext('2d'), p = palettes[theme] || palettes.wine;
  g.fillStyle = p[0]; g.fillRect(0,0,840,600);
  const diamond = (x,y,w,h,color) => { g.fillStyle=color; g.beginPath(); g.moveTo(x,y-h);g.lineTo(x+w,y);g.lineTo(x,y+h);g.lineTo(x-w,y);g.closePath();g.fill(); };
  const motif = (x,y,r) => {
    diamond(x,y,r,r,p[2]); diamond(x,y,r*.76,r*.76,p[3]); diamond(x,y,r*.47,r*.47,p[1]); diamond(x,y,r*.23,r*.23,p[4]);
    g.strokeStyle=p[2];g.lineWidth=3;
    for(let k=0;k<4;k++){g.save();g.translate(x,y);g.rotate(k*Math.PI/2);g.beginPath();g.moveTo(0,-r*.8);g.lineTo(0,-r*1.2);g.lineTo(8,-r*1.2);g.lineTo(8,-r*1.07);g.stroke();g.restore();}
  };
  g.fillStyle=p[2];g.fillRect(7,7,826,586);g.fillStyle=p[3];g.fillRect(12,12,816,576);
  g.fillStyle=p[1];g.fillRect(23,23,794,554);g.fillStyle=p[3];g.fillRect(27,27,786,546);
  for(let x=48;x<810;x+=38){motif(x,50,11);motif(x,550,11);}
  for(let y=88;y<540;y+=38){motif(48,y,11);motif(792,y,11);}
  g.fillStyle=p[2];g.fillRect(70,73,700,454);g.fillStyle=p[0];g.fillRect(77,80,686,440);
  g.strokeStyle=p[1];g.lineWidth=3;g.strokeRect(86,89,668,422);
  for(let y=112;y<504;y+=34)for(let x=104;x<748;x+=34){
    diamond(x,y,3,6,p[1]);g.fillStyle=p[2];g.fillRect(x-1,y-1,2,2);
  }
  // Three stepped medallions, inspired by woven Anatolian kilims.
  for(const [x,r] of [[235,83],[420,112],[605,83]]){
    for(let k=0;k<5;k++)diamond(x,300,r-k*12,(r-k*12)*1.43,p[[2,3,1,2,0][k]]);
    motif(x,300,r*.23);
    for(const s of [-1,1]){motif(x,300+s*r*1.08,10);motif(x+s*r*.73,300,9);}
  }
  for(const [x,y,sx,sy] of [[101,104,1,1],[739,104,-1,1],[101,496,1,-1],[739,496,-1,-1]]){
    g.save();g.translate(x,y);g.scale(sx,sy);g.fillStyle=p[2];g.beginPath();g.moveTo(0,0);g.lineTo(85,0);g.lineTo(0,85);g.fill();motif(22,22,11);g.restore();
  }
  // Deterministic yarn variation and warp/weft, no image assets or network requests.
  let seed=37;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<600;y+=2){g.fillStyle=`rgba(244,221,177,${.025+rand()*.065})`;g.fillRect(0,y,840,1);}
  for(let x=0;x<840;x+=3){g.fillStyle=`rgba(22,17,12,${.025+rand()*.06})`;g.fillRect(x,0,1,600);}
  for(let i=0;i<18000;i++){g.fillStyle=rand()>.5?'#f3d7a312':'#130c0915';g.fillRect(rand()*840,rand()*600,1,1);}
  return c;
}
