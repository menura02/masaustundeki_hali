export function resizeEdge(rect,x,y,margin=8){
  if(x<rect.x-margin||x>rect.x+rect.width+margin||y<rect.y-margin||y>rect.y+rect.height+margin)return '';
  const left=Math.abs(x-rect.x)<=margin,right=Math.abs(x-rect.x-rect.width)<=margin;
  const top=Math.abs(y-rect.y)<=margin,bottom=Math.abs(y-rect.y-rect.height)<=margin;
  return (top?'n':bottom?'s':'')+(left?'w':right?'e':'');
}
export function resizeBounds(start,edge,dx,dy,viewport){
  const minW=Math.min(180,viewport.width-20),minH=Math.min(125,viewport.height-20);
  let left=start.x,right=start.x+start.width,top=start.y,bottom=start.y+start.height;
  if(edge.includes('w'))left=Math.max(10,Math.min(right-minW,left+dx));
  if(edge.includes('e'))right=Math.min(viewport.width-10,Math.max(left+minW,right+dx));
  if(edge.includes('n'))top=Math.max(10,Math.min(bottom-minH,top+dy));
  if(edge.includes('s'))bottom=Math.min(viewport.height-10,Math.max(top+minH,bottom+dy));
  return {x:left,y:top,width:right-left,height:bottom-top};
}
