import { byId } from './dom.js';

export function createMovementView({ store, actions }) {
  const { state } = store;
  let opened = false;
  const $ = byId;
  const cell = (x,y) => `${x},${y}`;
  function current() {
    const permit = state.room?.movementPermit;
    const id = state.participantId;
    return state.role === 'player' && permit?.active && permit.characterId === id ? permit : null;
  }
  function renderDm() {
    const selector = $('moveCharacter');
    if (!selector) return;
    const order = state.room?.combat?.order || [];
    const turn = order[state.room?.combat?.currentIndex || 0];
    const chars = Object.entries(state.room?.characters || {});
    const selected = selector.value;
    selector.replaceChildren();
    chars.forEach(([id, value]) => { const o = new Option(value.name || 'Personaje',id);selector.append(o); });
    selector.value = chars.some(([id])=>id===selected) ? selected : (chars.some(([id])=>id===turn) ? turn : chars[0]?.[0] || '');
    const permit = state.room?.movementPermit;
    $('moveDmStatus').textContent = permit?.active ? `${state.room.characters?.[permit.characterId]?.name || 'Personaje'} · ${permit.steps} casillas · ${permit.used ? 'destino elegido; pendiente de cierre del DM' : 'esperando destino'}` : 'No hay desplazamiento habilitado.';
    $('moveCancel').disabled = !permit?.active;
  }
  function renderPlayer() {
    const permit = current(), map=state.room?.map || {};
    $('movePlayerNotice').hidden = !permit;
    if (!permit) { opened = false; $('movePlayerOverlay').hidden = true; return; }
    $('movePlayerStatus').textContent = permit.used ? 'Desplazamiento realizado. El DM puede continuar la narración.' : `El DM habilitó hasta ${permit.steps} casillas.`;
    if (!opened) { $('movePlayerOverlay').hidden = true; return; }
    $('movePlayerOverlay').hidden = false;
    const container = $('movePlayerGrid');container.replaceChildren();
    const cw=Math.max(16, Number(map.cellWidth)||60), ch=Math.max(16,Number(map.cellHeight)||60);
    const cols=Math.max(1,Math.min(80,Math.floor(((map.width||900)-(map.offsetX||0))/cw)));
    const rows=Math.max(1,Math.min(80,Math.floor(((map.height||650)-(map.offsetY||0))/ch)));
    const key=`characters_${state.participantId}`;
    const ids=Object.keys(state.room.characters||{}),index=ids.indexOf(state.participantId);
    const pos=map.positions?.[key]||{x:2+index%8,y:2+Math.floor(index/8)};
    // Muestra alrededor del personaje, sin exigir navegar por un mapa gigante en el móvil.
    const span=Math.max(3,Math.min(6,permit.steps+1));
    const x0=Math.max(0,Math.min(cols-Math.min(cols,span*2+1),pos.x-span));
    const y0=Math.max(0,Math.min(rows-Math.min(rows,span*2+1),pos.y-span));
    const viewCols=Math.min(cols,span*2+1),viewRows=Math.min(rows,span*2+1);
    container.style.gridTemplateColumns=`repeat(${viewCols}, minmax(0, 1fr))`;
    container.classList.add("move-grid-image");
    // Mismo mapa, zoom y coordenadas que el tablero. Imagen de fondo bajo las casillas.
    if (/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(map.image || "")) {
      const backdrop=document.createElement("div"); backdrop.className="move-map-backdrop";
      backdrop.style.backgroundImage=`url("${map.image}")`;
      const regionW=viewCols*cw,regionH=viewRows*ch;
      backdrop.style.width=`${map.width/regionW*100}%`;
      backdrop.style.height=`${map.height/regionH*100}%`;
      backdrop.style.left=`${-(x0*cw+(map.offsetX||0))/regionW*100}%`;
      backdrop.style.top=`${-(y0*ch+(map.offsetY||0))/regionH*100}%`;
      container.append(backdrop);
    }
    const radiusSeen=new Set();
    if(map.fog && map.fogMode!=="manual"){
      const entries=Object.entries(state.room?.characters||{});
      entries.forEach(([id,actor],index)=>{
        if(actor.visible===false)return;
        const p=map.positions?.[`characters_${id}`]||{x:2+index%8,y:2+Math.floor(index/8)};
        const range=Number(map.vision?.[`characters_${id}`]??3);
        for(let dy=-range;dy<=range;dy++)for(let dx=-range;dx<=range;dx++)if(dx*dx+dy*dy<=range*range)radiusSeen.add(`c_${p.x+dx}_${p.y+dy}`);
      });
    }
    for(let y=y0;y<y0+viewRows;y++)for(let x=x0;x<x0+viewCols;x++){
      const distance=Math.abs(pos.x-x)+Math.abs(pos.y-y),allowed=!permit.used&&distance>0&&distance<=permit.steps;
      const tile=`c_${x}_${y}`;
      const fogHidden=map.fog && (map.fogMode==="manual" ? !map.revealed?.[tile] : !map.explored?.[tile] && !radiusSeen.has(tile));
      const fogExplored=map.fog && map.fogMode!=="manual" && !radiusSeen.has(tile) && !!map.explored?.[tile];
      const btn=document.createElement('button');btn.type='button';btn.className='move-cell move-map-image'+(allowed?' allowed':'')+(pos.x===x&&pos.y===y?' here':'')+(fogHidden?' fog-hidden':'')+(fogExplored?' fog-explored':'');
      btn.disabled=!allowed;btn.title=`Casilla ${x+1}, ${y+1}`;btn.setAttribute('aria-label',`${btn.title}${allowed?', elegir destino':''}`);
      if(!fogHidden){
        if(pos.x===x&&pos.y===y){const hero=document.createElement('span');hero.className='move-hero';hero.textContent='◆';btn.append(hero);}
        else {
          const actors=['characters','enemies','npcs','objects'].flatMap(group=>Object.entries(state.room?.[group]||{}).map(([id,a])=>({group,id,a})));
          const found=actors.find(({group,id,a},index)=>{
            const actorKey=`${group}_${id}`;
            const at=map.positions?.[actorKey]||{x:2+index%8,y:2+Math.floor(index/8)};
            return at.x===x&&at.y===y&&a.visible!==false&&map.tokenVisible?.[actorKey]!==false&&(!map.fog||group==='characters'||!fogExplored);
          });
          if(found){
            const token=document.createElement('span');token.className='move-actor-token';
            token.textContent=found.group==='enemies'?'⚔':found.group==='npcs'?'🧙':found.group==='objects'?'◆':'♟';
            token.title=found.a.name||'Actor';btn.append(token);
          } else if(allowed){const dot=document.createElement('span');dot.className='move-range';dot.textContent='•';btn.append(dot);}
        }
      } else if(allowed){const dot=document.createElement('span');dot.className='move-range';dot.textContent='·';btn.append(dot);}
      btn.addEventListener('click',async()=>{
        if(!window.confirm(`¿Elegir casilla ${x+1}, ${y+1} como destino?`))return;
        btn.disabled=true;
        try { const ok=await actions.movement.chooseDestination(x,y);if(ok){opened=false;renderPlayer();}else {window.alert('El permiso cambió. Consultá con el DM.');renderPlayer();} }
        catch {window.alert('No se pudo sincronizar la posición.');renderPlayer();}
      });container.append(btn);
    }
    $('movePlayerMapTitle').textContent=map.image ? 'Elegí tu destino en el mapa' : 'Elegí tu destino en la cuadrícula';
    $('movePlayerHint').textContent=permit.used?'Destino registrado. Esperá al DM.':'Las casillas verdes señalan destinos acordados. Las zonas oscuras mantienen la niebla del tablero. Hablá con el DM antes de moverte.';
  }
  function render(){if(!state.room)return;renderDm();renderPlayer();}
  function bind(){
    $('moveAllow').addEventListener('click',()=>actions.movement.authorize($('moveCharacter').value,$('moveSteps').value));
    $('moveCancel').addEventListener('click',()=>actions.movement.close());
    $('movePlayerOpen').addEventListener('click',()=>{opened=true;renderPlayer();});
    $('movePlayerClose').addEventListener('click',()=>{opened=false;renderPlayer();});
  }
  return {bind,render};
}
