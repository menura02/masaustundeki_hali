export function coveredIcons(cloth,icons){
  const b=cloth.bounds();
  return icons.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height&&cloth.contains(p.x,p.y));
}
