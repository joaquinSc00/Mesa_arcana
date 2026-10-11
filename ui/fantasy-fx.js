import { drawDiceFrame } from './fantasy-dice.js';
const PI = Math.PI;
const palette={fire:['#ff6a1f','#ffd081'],slash:['#a2dffe','#fffdf0'],arcane:['#a76aff','#bde3ff'],shield:['#52cffa','#c5faff'],heal:['#5bff9e','#fff1a9'],curse:['#d24dff','#7b3eca'],impact:['#ffe0a0','#ff9263']};
const label={fire:'LLAMARADA',slash:'GOLPE DE ACERO',arcane:'ENERGÍA ARCANA',shield:'ESCUDO MÍSTICO',heal:'CURACIÓN',curse:'MALDICIÓN',impact:'IMPACTO'};
const make=(tag,cls,parent)=>{const el=document.createElement(tag);el.className=cls;parent.append(el);return el;};
const motionReduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
export function createFantasyFxView({store,actions,map}){
  const {state,emit}=store;
  let dialog,dieCanvas,title,result,details,dieClose,stageCanvas,stageCtx;
  let lastRoll=null,lastFx=null,seededRoom='',animDice=0,animFx=0,playedAt=0;
  let stageW=0,stageH=0,activeFx=null,boardCloseTimer=0;
  function root(){
    if(dialog)return;
    dialog=make('section','fantasy-roll-overlay',document.body);dialog.hidden=true;dialog.setAttribute('role','status');dialog.setAttribute('aria-label','Tirada de dados animada');
    const panel=make('div','fantasy-roll-card',dialog);
    dieClose=make('button','fantasy-roll-close',panel);dieClose.type='button';dieClose.textContent='Cerrar';dieClose.setAttribute('aria-label','Cerrar animación de tirada');dieClose.addEventListener('click',closeDie);
    make('div','fantasy-roll-crest',panel).textContent='MESA ARCANA  ·  EL DESTINO HABLA';
    title=make('h2','fantasy-roll-title',panel);dieCanvas=make('canvas','fantasy-die-canvas',panel);result=make('div','fantasy-roll-result',panel);details=make('p','fantasy-roll-details',panel);
    const stage=document.getElementById('boardStage');if(stage){stageCanvas=make('canvas','fantasy-stage-fx',stage);stageCtx=stageCanvas.getContext('2d');}
    buildDmControls();
  }
  function closeDie(){if(dialog)dialog.hidden=true;cancelAnimationFrame(animDice);clearTimeout(boardCloseTimer);}
  function buildDmControls(){
    const combat=document.getElementById('dmCombatOrder');if(!combat||document.getElementById('fantasyFxDm'))return;
    const panel=document.createElement('details');panel.id='fantasyFxDm';panel.className='fantasy-fx-controls';
    panel.innerHTML=`<summary>✦ Efectos fantásticos del tablero <span class="fx-only-visual">Solo visuales</span></summary>
      <div class="fantasy-fx-fields"><label>Efecto<select id="fantasyFxKind"><option value="fire">Fuego — explosión</option><option value="slash">Ataque físico — corte</option><option value="arcane">Magia — runas arcanas</option><option value="shield">Defensa — escudo</option><option value="heal">Curación — aura</option><option value="curse">Maldición — energía oscura</option><option value="impact">Impacto — onda expansiva</option></select></label>
      <label>Desde<select id="fantasyFxSource"><option value="">Centro del escenario</option></select></label>
      <label>Hacia / sobre<select id="fantasyFxTarget"><option value="">Centro del escenario</option></select></label></div>
      <button id="fantasyFxSend" type="button" class="primary-button">Proyectar efecto en el tablero</button>
      <p class="quiet-hint">El DM decide cuándo mostrarlo. No aplica daño, curación ni reglas automáticamente.</p>`;
    combat.insertAdjacentElement('afterend',panel);
    panel.querySelector('#fantasyFxSend').addEventListener('click',async()=>{
      try{await actions.fx.perform({kind:document.getElementById('fantasyFxKind').value,source:document.getElementById('fantasyFxSource').value,target:document.getElementById('fantasyFxTarget').value});}
      catch(error){emit('notice',error.message||'No se pudo reproducir el efecto.');}
    });
  }
  function updateControls(){
    if(state.role!=='dm'||!document.getElementById('fantasyFxSource'))return;
    const room=state.room||{},map=room.map||{};
    const actors=['characters','enemies','npcs','objects'].flatMap(group=>Object.entries(room[group]||{}).filter(([id,entity])=>entity.visible!==false&&map.tokenVisible?.[`${group}_${id}`]!==false).map(([id,entity])=>({key:`${group}_${id}`,name:entity.name||id})));
    for(const name of ['fantasyFxSource','fantasyFxTarget']){
      const select=document.getElementById(name),previous=select.value;
      const fingerprint=actors.map(actor=>actor.key+':'+actor.name).join('|');
      if(select.dataset.fingerprint===fingerprint)continue;
      select.dataset.fingerprint=fingerprint;select.replaceChildren(new Option('Centro del escenario',''));
      for(const actor of actors)select.append(new Option(actor.name,actor.key));
      select.value=actors.some(actor=>actor.key===previous)?previous:'';
    }
  }
  function showDie(roll){
    if(!dialog||document.visibilityState==='hidden')return;
    const boardMode=state.role==='board';dialog.classList.toggle('is-board',boardMode);
    const stage=document.getElementById('boardStage');if(boardMode&&stage&&dialog.parentElement!==stage)stage.append(dialog);
    else if(!boardMode&&dialog.parentElement!==document.body)document.body.append(dialog);
    const sides=Number(roll.breakdown?.[0]?.label?.match(/d(\d+)/i)?.[1]||20);
    const safe=[4,6,8,10,12,20].includes(sides)?sides:20;
    const value=Number(roll.die)||1;
    const critical=safe===20&&(value===20||value===1);
    dialog.dataset.critical=critical?(value===20?'high':'low'):'none';
    clearTimeout(boardCloseTimer);
    dialog.hidden=false;title.textContent=roll.actor||'La aventura';result.textContent='—';
    // El tablero público no debe quedar tapado por una tirada vieja.
    if(boardMode)boardCloseTimer=setTimeout(closeDie,4400);
    details.textContent=roll.label||`Tirada de d${safe}`;
    cancelAnimationFrame(animDice);const duration=motionReduced()?120:1450;const start=performance.now();
    const frame=now=>{const t=Math.min(1,(now-start)/duration);drawDiceFrame(dieCanvas,safe,value,t);if(t<1){animDice=requestAnimationFrame(frame);}else{result.textContent=`${roll.total}  ·  d${safe}: ${value}`;details.textContent=`${roll.label||'Tirada'} · ${critical?(value===20?'¡20 NATURAL!':'1 NATURAL'): 'Resultado registrado — el DM decide'}`;}};
    animDice=requestAnimationFrame(frame);
  }
  function point(key){
    const stage=document.getElementById('boardStage'),map=state.room?.map||{};
    const w=stage?.clientWidth||800,h=stage?.clientHeight||520;
    if(!key)return{x:w*.5,y:h*.53};
    if(map && state.room?.map?.enabled){const projected=map.projectToken('public',key);if(projected)return projected;}
    const all=['characters','enemies','npcs','objects'].flatMap(g=>Object.keys(state.room?.[g]||{}).map(i=>`${g}_${i}`));
    const index=all.indexOf(key),p=map.positions?.[key]||{x:2+index%8,y:2+Math.floor(index/8)};
    if(map.enabled){const mapW=Number(map.width)||900,mapH=Number(map.height)||650;const s=Math.min(w/mapW,h/mapH)*.96;return{x:(w-mapW*s)/2+((map.offsetX||0)+(p.x+.5)*(map.cellWidth||60))*s,y:(h-mapH*s)/2+((map.offsetY||0)+(p.y+.5)*(map.cellHeight||60))*s};}
    return{x:w*(.1+(Math.max(0,index)%5)*.16),y:h*(.14+Math.floor(Math.max(0,index)/5)*.18)};
  }
  function playFx(fx){
    if(!stageCanvas||!stageCtx||document.visibilityState==='hidden')return;
    const stage=document.getElementById('boardStage');if(!stage)return;
    const dpi=Math.min(2,devicePixelRatio||1);stageW=stage.clientWidth;stageH=stage.clientHeight;
    stageCanvas.width=Math.max(1,Math.round(stageW*dpi));stageCanvas.height=Math.max(1,Math.round(stageH*dpi));
    stageCtx.setTransform(dpi,0,0,dpi,0,0);
    cancelAnimationFrame(animFx);
    const source=point(fx.source),target=point(fx.target);const kind=palette[fx.kind]?fx.kind:'impact';
    const colors=palette[kind],count=motionReduced()?10:115;
    const particles=Array.from({length:count},(_,i)=>({angle:i*2.39996+Math.random()*.7,reach:25+Math.random()*220,size:1.5+Math.random()*5,phase:Math.random()*.4}));
    activeFx={kind,colors,source,target,particles,started:performance.now(),duration:motionReduced()?280:1750};
    const frame=now=>{
      const fx=activeFx;if(!fx)return;const t=Math.min(1,(now-fx.started)/fx.duration),e=1-Math.pow(1-t,2.8),ctx=stageCtx;
      ctx.clearRect(0,0,stageW,stageH);ctx.save();ctx.globalCompositeOperation='screen';
      const x=fx.target.x,y=fx.target.y;const dist=Math.hypot(x-fx.source.x,y-fx.source.y);
      if(['fire','arcane','slash','curse','impact'].includes(kind)&&dist>18){
        const bx=fx.source.x+(x-fx.source.x)*Math.min(1,e*1.7),by=fx.source.y+(y-fx.source.y)*Math.min(1,e*1.7);
        ctx.beginPath();ctx.moveTo(fx.source.x,fx.source.y);ctx.lineTo(bx,by);ctx.strokeStyle=colors[0];ctx.lineWidth=kind==='fire'?19:kind==='slash'?12:8;ctx.shadowColor=colors[0];ctx.shadowBlur=37;ctx.stroke();
        ctx.beginPath();ctx.moveTo(fx.source.x,fx.source.y);ctx.lineTo(bx,by);ctx.strokeStyle=colors[1];ctx.lineWidth=3.5;ctx.stroke();
      }
      const radius=(kind==='shield'?95:kind==='fire'?180:145)*Math.sin(PI*Math.min(1,t*1.1));
      const grd=ctx.createRadialGradient(x,y,0,x,y,Math.max(5,radius));grd.addColorStop(0,colors[1]+'ee');grd.addColorStop(.22,colors[0]+'aa');grd.addColorStop(1,colors[0]+'00');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(x,y,Math.max(6,radius),0,PI*2);ctx.fill();
      ctx.strokeStyle=colors[1];ctx.lineWidth=kind==='shield'?7:3;ctx.shadowBlur=18;ctx.shadowColor=colors[0];ctx.globalAlpha=Math.max(0,1-t);
      for(let ring=0;ring<(kind==='shield'?3:2);ring++){ctx.beginPath();ctx.ellipse(x,y,20+(ring*31)+(t*(kind==='shield'?90:160)),22+ring*29+t*(kind==='shield'?85:154),kind==='arcane'?t*PI:0,0,PI*2);ctx.stroke();}
      ctx.globalAlpha=1;
      if(kind==='shield'||kind==='arcane'||kind==='curse'){
        for(let i=0;i<9;i++){const a=i*2*PI/9+t*(kind==='arcane'?3:-1),r=kind==='shield'?72:52+t*80;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;ctx.save();ctx.translate(px,py);ctx.rotate(a);ctx.strokeStyle=colors[1];ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(7,0);ctx.lineTo(0,10);ctx.lineTo(-7,0);ctx.closePath();ctx.stroke();ctx.restore();}
      }
      if(kind==='slash'){
        ctx.beginPath();ctx.arc(x,y,45+e*90,-2.4,.7);ctx.lineWidth=17*(1-t)+2;ctx.strokeStyle=colors[1];ctx.stroke();
      }
      for(const p of fx.particles){const k=Math.min(1,Math.max(0,(t-p.phase)*1.7));const rr=k*p.reach;ctx.globalAlpha=Math.max(0,1-k);ctx.fillStyle=p.angle%2>1?colors[0]:colors[1];ctx.shadowColor=colors[0];ctx.shadowBlur=14;
        const px=x+Math.cos(p.angle)*rr,py=y+Math.sin(p.angle)*rr-(kind==='heal'?k*130:kind==='fire'?k*55:0);
        ctx.beginPath();ctx.ellipse(px,py,p.size*(1-k*.8),p.size*(kind==='fire'?2.6:1),p.angle,0,PI*2);ctx.fill();}
      ctx.restore();if(t<1)animFx=requestAnimationFrame(frame);else{ctx.clearRect(0,0,stageW,stageH);activeFx=null;}
    };
    animFx=requestAnimationFrame(frame);
  }
  function render(){
    if(!state.room)return;
    root();updateControls();
    const roomId=`${state.roomCode}:${state.role}:${state.participantId}`;
    const rolls=Object.values(state.room.rolls||{}).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));const newest=rolls[0];
    const fx=state.room.visualFx?.current;
    if(seededRoom!==roomId){seededRoom=roomId;lastRoll=newest?.id||null;lastFx=fx?.id||null;return;}
    if(newest?.id&&lastRoll!==newest.id){lastRoll=newest.id;if(Date.now()-(newest.createdAt||0)<10000&&(state.role==='board'||state.role==='dm'||(state.role==='player'&&newest.actorId===state.participantId)))showDie(newest);}
    if(fx?.id&&fx.id!==lastFx){lastFx=fx.id;if(Date.now()-(fx.createdAt||0)<10000){if(state.role==='board')playFx(fx);}}
  }
  function bind(){root();}
  function dispose(){cancelAnimationFrame(animDice);cancelAnimationFrame(animFx);clearTimeout(boardCloseTimer);}
  return {bind,render,dispose};
}
