import { createFakeFirebase } from './helpers/fake-firebase.js';
import { buildOfflineRoom } from '../core/utils.js';
window.fixture = createFakeFirebase({ mesaArcana: { rooms: { 'TEST-001': buildOfflineRoom() } } });
window.clients = {};
window.nextPrompt = '';
const checks = document.getElementById('checks');
let passed = 0;
const pause = () => new Promise(resolve => setTimeout(resolve, 40));
function assert(value, label) { if (!value) throw new Error(label); }
async function check(label, run) {
  const item = document.createElement('li'); checks.append(item);
  try { await run(); passed++; item.className='pass'; item.textContent=`OK: ${label}`; }
  catch(error) { item.className='fail'; item.textContent=`ERROR: ${label}: ${error.message}`; throw error; }
}
const doc = role => window.clients[role].document;
const id = (role, name) => doc(role).getElementById(name);
function click(role, selector) {
  const button=doc(role).querySelector(selector); assert(button,`No existe ${selector}`);
  const row=button.closest('[data-entity-id]');
  if(row && button.matches('button') && !row.classList.contains('is-inspected')) row.click();
  assert(button.getClientRects().length>0,`Control oculto: ${selector}`);
  button.click();
}
function fill(role, name, value) { const input=id(role,name); input.value=value; input.dispatchEvent(new Event('input',{bubbles:true})); }
function change(role, name, value) { const input=id(role,name); input.value=value; input.dispatchEvent(new Event('change',{bubbles:true})); }
function dmPage(page) { click('dm',`[data-dm-nav="${page}"]`); }
for (const role of ['dm','player','board']) {
  const iframe=document.createElement('iframe'); iframe.title=`Rol ${role}`; iframe.src=`role.html?role=${role}`;
  document.getElementById('roles').append(iframe);
}
try {
  const start=Date.now();
  while (Object.keys(window.clients).length<3) { if(Date.now()-start>15000) throw new Error('Los tres roles no inicializaron'); await pause(); }
  await check('DM, jugador y tablero inicializan los modulos ES',async()=> {
    for(const role of ['dm','player','board']) assert(id(role,`${role}View`).classList.contains('active'),role);
  });
  await check('Crear sala, listar y volver a entrar conserva la navegacion',async()=> {
    click('dm','#goHomeButton'); fill('dm','campaignNameInput','Prueba modular'); fill('dm','hostNameInput','DM');
    click('dm','#createRoomForm button[type="submit"]'); await pause();
    assert(window.clients.dm.app.store.state.room.campaignName==='Prueba modular','crear');
    await window.clients.dm.app.sync.connectToRoom('TEST-001','dm','Director','dm'); await pause();
    click('dm','#goHomeButton'); await pause();
    assert(id('dm','activeRoomsList').textContent.includes('TEST-001'),'salas');
    click('dm','[data-join-room="TEST-001"][data-join-role="dm"]'); await pause();
  });
  await check('Borrador, atributos, habilidades y ficha final llegan al DM',async()=> {
    fill('player','characterNameInput','Ayla');
    change('player','lineageSelect','elf');change('player','classSelect','arcanist');change('player','backgroundSelect','arcane_apprentice');
    click('player','[data-player-nav="inventory"]');fill('player','characterInventoryInput','Espada');
    click('player','[data-player-nav="notes"]');fill('player','characterNotesInput','Origen');
    click('player','[data-player-nav="stats"]');
    click('player','.skills-panel .panel-toggle');
    click('player','[aria-label="Subir Fuerza"]'); click('player','[aria-label="Alternar Sigilo"]');
    click('player','#saveCharacterButton'); await pause();
    assert(window.clients.dm.app.store.state.room.characters.hero.status==='draft','borrador');
    dmPage('actors'); assert(id('dm','dmCharactersList').textContent.includes('Borrador'),'estado DM');
    click('player','#finalizeCharacterButton'); await pause();
    click('player','[data-player-nav="character"]');
    assert(id('player','characterForm').hidden,'bloqueo'); assert(id('player','finalCharacterCard').textContent.includes('Ayla'),'carta');
    assert(window.clients.dm.app.store.state.room.characters.hero.lineage==='elf','linaje');
    assert(window.clients.dm.app.store.state.room.characters.hero.classKey==='arcanist','clase');
    assert(window.clients.dm.app.store.state.room.characters.hero.background==='arcane_apprentice','trasfondo');
    assert(id('dm','dmCharactersList').textContent.includes('Listo'),'listo DM');
  });
  await check('Dados libres y atributos se reflejan en DM y tablero',async()=> {
    click('player','[data-player-nav="dice"]'); click('player','#playerQuickRolls button'); await pause();
    click('player','#playerQuickRolls button:nth-child(7)'); await pause();
    assert(window.clients.board.app.store.state.room.rolls && Object.keys(window.clients.board.app.store.state.room.rolls).length===2,'sincronizacion dados');
    assert(id('dm','dmRollFeed').textContent.includes('Consulta de Fuerza'),'registro DM');
    assert(id('board','rollFeed').textContent.includes('Ayla'),'registro tablero');
  });
  await check('Biblioteca muestra enemigos, NPCs y objetos; controles manuales funcionan',async()=> {
    click('dm','[data-dm-mode="prep"]'); dmPage('library');
    for(const kind of ['enemies','npcs','objects']) { click('dm',`[data-library-tab="${kind}"]`); click('dm','[data-library-kind]'); await pause(); }
    click('dm','[data-dm-mode="live"]'); dmPage('actors');
    const row=doc('dm').querySelector('[data-entity-id="hero"]'); row.click();
    assert(row.classList.contains('is-inspected'),'detalle');
    const before=window.clients.dm.app.store.state.room.characters.hero.hpCurrent;
    click('dm','[data-entity-id="hero"] [data-action="damage"]'); await pause();
    assert(window.clients.player.app.store.state.room.characters.hero.hpCurrent===before-1,'vida');
    click('dm','[data-entity-id="hero"] [data-action="manaUp"]'); await pause();
    for(const [action,text] of [['inventory','Llave'],['condition','Herido'],['note','Pista']]) {
      window.nextPrompt=text; click('dm',`[data-entity-id="hero"] [data-action="${action}"]`); await pause();
    }
    assert(window.clients.player.app.store.state.room.characters.hero.inventory.includes('Llave'),'objeto');
    assert(window.clients.player.app.store.state.room.characters.hero.conditions==='Herido','condicion');
    assert(window.clients.player.app.store.state.room.characters.hero.dmNotes==='Pista','nota');
  });
  await check('Iniciativa, siguiente turno, turno manual y filtros conservan la consulta',async()=> {
    dmPage('combat'); click('dm','#startCombatButton'); await pause();
    assert(id('board','boardTurnName').textContent==='Ayla','turno inicial');
    click('dm','[data-focus-filter="misterio"]'); assert(id('dm','dmFocusDetails').textContent.includes('Arcano/Misterio'),'filtro');
    click('dm','#nextTurnButton'); await pause(); assert(id('board','boardTurnName').textContent==='Rata de cripta','siguiente');
    dmPage('actors'); click('dm','[data-entity-id="hero"] [data-action="turn"]'); await pause();
    assert(id('board','boardTurnName').textContent==='Ayla','manual');
  });
  await check('Escena publica y modos se sincronizan en los tres roles',async()=> {
    dmPage('scene'); fill('dm','sceneTitleInput','Santuario'); fill('dm','sceneDescriptionInput','Runas'); change('dm','sceneModeSelect','room');
    click('dm','#broadcastSceneButton'); await pause();
    assert(id('board','boardTitle').textContent==='Santuario','titulo'); assert(id('board','boardStage').classList.contains('room'),'modo');
    assert(id('player','playerSceneDescription').textContent==='Runas','jugador');
  });
  await check('Imagen de mapa, cuadricula, vision, niebla y movimiento llegan al tablero',async()=> {
    const canvas=doc('dm').createElement('canvas'); canvas.width=600;canvas.height=400;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#638466';ctx.fillRect(0,0,600,400);ctx.fillStyle='#caaf80';ctx.fillRect(120,80,340,240);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const dt=new DataTransfer();dt.items.add(new File([blob],'mapa-prueba.png',{type:'image/png'}));
    id('dm','mapFile').files=dt.files;id('dm','mapFile').dispatchEvent(new Event('change',{bubbles:true}));
    for(let i=0;i<40&&!window.clients.board.app.store.state.room.map?.enabled;i++)await pause();
    assert(window.clients.board.app.store.state.room.map.enabled,'carga');
    click('dm','.map-controls details:nth-of-type(1) summary');
    change('dm','mapCellWidth','50');change('dm','mapCellHeight','50');await pause();
    click('dm','.map-controls details:nth-of-type(2) summary');
    id('dm','mapFog').checked=true;id('dm','mapFog').dispatchEvent(new Event('change',{bubbles:true}));await pause();
    id('dm','mapVision').value='2';id('dm','mapVision').dispatchEvent(new Event('change',{bubbles:true}));await pause();
    const mapCanvas=id('dm','dmMapCanvas');mapCanvas.focus();
    mapCanvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await pause();
    assert(window.clients.board.app.store.state.room.map.positions.characters_hero.x===3,'movimiento');
    assert(window.clients.board.app.store.state.room.map.vision.characters_hero===2,'vision');
    assert(Object.keys(window.clients.board.app.store.state.room.map.explored).length>0,'exploracion');
    const publicCanvas=id('board','publicMapCanvas');assert(!publicCanvas.hidden && publicCanvas.width>0,'canvas');
    const pixels=publicCanvas.getContext('2d').getImageData(0,0,publicCanvas.width,publicCanvas.height).data;
    assert(pixels.some((v,i)=>i%4!==3&&v>100),'mapa no vacio');
    click('dm','#mapToggle');await pause();assert(publicCanvas.hidden,'ocultar');click('dm','#mapToggle');await pause();
  });
  await check('Paneles plegables, navegacion del jugador y vista limpia funcionan',async()=> {
    click('dm','#sceneForm .panel-toggle');assert(doc('dm').querySelector('#sceneForm .collapsible-content').hidden,'plegable');
    click('player','[data-player-nav="inventory"]');assert(!doc('player').querySelector('[data-ready-section="inventory"]').hidden,'inventario');
    click('board','#toggleBoardScaleButton');assert(id('board','boardShell').classList.contains('focused'),'limpia');
  });
  await check('Quitar entidades actualiza tablero y mantiene las otras fichas',async()=> {
    dmPage('actors');click('dm','[data-entity-type="enemy"] [data-action="remove"]');await pause();
    assert(Object.keys(window.clients.board.app.store.state.room.enemies||{}).length===0,'quitar');
    assert(window.clients.board.app.store.state.room.characters.hero.name==='Ayla','personaje');
  });
  document.getElementById('result').textContent=`PASS: ${passed} grupos de pruebas; tres roles sincronizados.`;
  document.body.dataset.status='passed';
} catch(error) {
  document.getElementById('result').textContent=`FAIL: ${error.message}`;document.body.dataset.status='failed';console.error(error);
}
