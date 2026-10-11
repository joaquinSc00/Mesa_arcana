// Mesa Arcana V13 — Dados facetados en Canvas: sin dependencias, sin alterar las reglas.
const PI = Math.PI;
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(n=>n/l); };
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0);
function hullTriangles(vs) {
  const fs=[];
  for(let i=0;i<vs.length;i++)for(let j=i+1;j<vs.length;j++)for(let k=j+1;k<vs.length;k++){
    const normal=cross(sub(vs[j],vs[i]),sub(vs[k],vs[i]));
    if(Math.hypot(...normal)<.001)continue;
    let positive=false,negative=false;
    for(let l=0;l<vs.length;l++)if(![i,j,k].includes(l)){
      const d=dot(normal,sub(vs[l],vs[i]));if(d>1e-4)positive=true;if(d< -1e-4)negative=true;
    }
    if(positive&&negative)continue;
    // Only use this for strictly triangular faces (tetra/octa/icosa); cube uses quads.
    fs.push(positive?[i,k,j]:[i,j,k]);
  }
  return fs;
}
const ico=(()=>{const p=(1+Math.sqrt(5))/2;return [[-1,p,0],[1,p,0],[-1,-p,0],[1,-p,0],[0,-1,p],[0,1,p],[0,-1,-p],[0,1,-p],[p,0,-1],[p,0,1],[-p,0,-1],[-p,0,1]].map(norm)})();
function dodecahedron(){
 const triangles=hullTriangles(ico);
 const vs=triangles.map(f=>norm(f.reduce((a,i)=>a.map((v,k)=>v+ico[i][k]),[0,0,0])));
 const faces=ico.map(v=>{
  const indices=triangles.map((f,i)=>f.includes(ico.indexOf(v))?i:-1).filter(i=>i>=0);
  const basis=norm(cross(Math.abs(v[2])>.8?[0,1,0]:[0,0,1],v)); const other=cross(v,basis);
  return indices.sort((a,b)=>Math.atan2(dot(vs[a],other),dot(vs[a],basis))-Math.atan2(dot(vs[b],other),dot(vs[b],basis)));
 });return {vs,faces};
}
function shape(sides){
 if(sides===4){const vs=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(norm);return {vs,faces:hullTriangles(vs)};}
 if(sides===6){const vs=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(norm);return {vs,faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]};}
 if(sides===8){const vs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];return {vs,faces:hullTriangles(vs)};}
 if(sides===10){const vs=[[0,0,1.5],[0,0,-1.5]];for(let i=0;i<5;i++)vs.push([Math.cos(i*2*PI/5),Math.sin(i*2*PI/5),0]);const faces=[];for(let i=0;i<5;i++){faces.push([0,2+i,2+(i+1)%5]);faces.push([1,2+(i+1)%5,2+i]);}return {vs,faces};}
 if(sides===12)return dodecahedron();
 return {vs:ico,faces:hullTriangles(ico)};
}
function rotate(v,ry,rx,rz){let [x,y,z]=v;const cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx),cz=Math.cos(rz),sz=Math.sin(rz);[x,z]=[x*cy+z*sy,z*cy-x*sy];[y,z]=[y*cx-z*sx,z*cx+y*sx];[x,y]=[x*cz-y*sz,x*sz+y*cz];return [x,y,z];}
export function drawDie(ctx, sides, value, turn=0, settled=false, cx=180,cy=170,size=117){
 const {vs,faces}=shape(sides); const spin=settled?4.4:turn;
 const verts=vs.map(v=>rotate(v,spin*.95+.3,spin*.72-.15,spin*.21));
 const polygons=faces.map((ids,i)=>{const ps=ids.map(k=>verts[k]);const center=ps.reduce((a,v)=>a.map((n,j)=>n+v[j]/ps.length),[0,0,0]);let normal=norm(cross(sub(ps[1],ps[0]),sub(ps[2],ps[0])));if(dot(normal,center)<0)normal=normal.map(n=>-n);return {ps,center,normal,i};}).filter(p=>p.normal[2]>0).sort((a,b)=>a.center[2]-b.center[2]);
 ctx.save();ctx.shadowColor='#e8a84c';ctx.shadowBlur=35;
 const hue=(sides===20)?38:(sides===12)?261:(sides===10)?200:(sides===8)?160:(sides===6)?350:45;
 const front=polygons.reduce((best,p)=>!best||p.normal[2]>best.normal[2]?p:best,null);
 polygons.forEach(p=>{
  const light=Math.max(0,dot(p.normal,norm([-.6,-.7,1.5])));
  const brightness=Math.round(21+light*27);
  ctx.beginPath();p.ps.forEach((v,i)=>{const f=3.15/(3.5-v[2]*.25);const px=cx+v[0]*size*f,py=cy+v[1]*size*f;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();
  ctx.fillStyle=`hsl(${hue} 46% ${brightness}%)`;ctx.fill();ctx.lineWidth=2.2;ctx.strokeStyle=`hsla(${hue},85%,${60+light*25}%,.92)`;ctx.stroke();
  ctx.save();ctx.shadowBlur=0;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`800 ${Math.round(size*.25)}px Georgia,serif`;ctx.fillStyle='#fff5d7';const f=3.15/(3.5-p.center[2]*.25);ctx.fillText(String(settled&&p===front?value:(p.i%sides)+1),cx+p.center[0]*size*f,cy+p.center[1]*size*f);ctx.restore();
 });ctx.restore();
}
export function drawDiceFrame(canvas, sides, value, progress=1){
 if(!canvas)return;
 const dpi=Math.min(2,globalThis.devicePixelRatio||1);const w=canvas.clientWidth||360,h=canvas.clientHeight||300;
 if(canvas.width!==Math.round(w*dpi)||canvas.height!==Math.round(h*dpi)){canvas.width=Math.round(w*dpi);canvas.height=Math.round(h*dpi);}
 const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpi,0,0,dpi,0,0);ctx.clearRect(0,0,w,h);
 const bright=ctx.createRadialGradient(w/2,h*.56,5,w/2,h*.55,w*.47);bright.addColorStop(0,'#b9784738');bright.addColorStop(1,'#120d2a00');ctx.fillStyle=bright;ctx.fillRect(0,0,w,h);
 const spin=(1-Math.pow(1-Math.min(1,progress),3))*12.4;const tilt=Math.sin(progress*PI)*16;
 drawDie(ctx,sides,value,spin,progress>=1,w/2,h*.51-tilt,Math.min(w*.29,h*.4,115));
}
