import { system } from "../game-system.js?v=modules-1";
import { byId } from "./dom.js";

// Privado y local por diseño. Nunca enviar secretos ni notas a rutas públicas de Firebase.
export function createAdventurePlanner({ store, actions }) {
  const $ = byId;
  const key = () => `mesaArcanaPrivatePlans:v1:${store.state.roomCode || "sin-sala"}`;
  const fresh = () => ({ scenes: [], world: {}, selected: "" });
  let data = fresh(), currentKey = "";
  const fields = { title:"planTitle", chapter:"planChapter", type:"planType", public:"planPublic", secrets:"planSecrets", clues:"planClues", consequences:"planConsequences", transition:"planTransition", group:"planGroup" };
  const worldFields = { synopsis:"worldSynopsis", conflict:"worldConflict", places:"worldPlaces", factions:"worldFactions", quests:"worldQuests", journal:"worldJournal" };
  const id = () => globalThis.crypto?.randomUUID?.() || `escena-${Date.now()}`;
  const text = (v) => String(v ?? "");
  const selected = () => data.scenes.find(s => s.id === data.selected);
  function persist() {
    try { localStorage.setItem(key(), JSON.stringify(data)); return true; }
    catch { alert("No se pudo guardar: el almacenamiento del navegador está lleno o deshabilitado. Exportá un respaldo."); return false; }
  }
  function load() {
    if (currentKey === key()) return;
    currentKey = key();
    try { const obj = JSON.parse(localStorage.getItem(key()) || "null"); data = obj && Array.isArray(obj.scenes) && typeof obj.world === "object" ? obj : fresh(); }
    catch { data = fresh(); }
    data.selected = data.scenes.some(s => s.id === data.selected) ? data.selected : data.scenes[0]?.id || "";
    render();
  }
  function readScene() {
    const original = selected(); if (!original) return null;
    const next = { ...original };
    for (const [field, element] of Object.entries(fields)) next[field] = $(element).value;
    return next;
  }
  function saveScene() {
    load(); const next = readScene(); if (!next) return false;
    data.scenes = data.scenes.map(x => x.id === next.id ? next : x);
    if (!persist()) return false;
    renderList();
    $("planSceneStatus").textContent = `Borrador guardado · ${new Date().toLocaleTimeString()}`;
    return true;
  }
  function renderList() {
    const list = $("planSceneList"); list.replaceChildren();
    if (!data.scenes.length) { list.textContent = "No hay escenas. Creá la primera."; return; }
    for (const item of data.scenes.filter(s => !$("planGroupFilter").value || (s.group || "") === $("planGroupFilter").value)) {
      const button = document.createElement("button"); button.type = "button";
      button.className = "dm-plan-scene" + (item.id === data.selected ? " active" : "");
      const name = document.createElement("strong"); name.textContent = item.title || "Escena sin título";
      const sub = document.createElement("small"); sub.textContent = `${item.group || "Sin grupo"} · ${item.chapter || "Sin capítulo"} · ${item.type || "Exploración"}`;
      button.append(name, sub); button.addEventListener("click", () => { saveScene(); data.selected = item.id; persist(); render(); }); list.append(button);
    }
  }
  function renderEncounter() {
    const list = $("planEncounterList"); list.replaceChildren();
    const scene = selected(); if (!scene?.encounter?.length) { list.textContent = "Todavía no preparaste entidades para esta escena."; return; }
    scene.encounter.forEach((entry,index) => {
      const line = document.createElement("div"); line.className = "dm-plan-entry";
      const name = document.createElement("span"); name.textContent = `${entry.name}${entry.wave ? " · Oleada: " + entry.wave : ""} · ${entry.kind === "enemies" ? "Enemigo" : entry.kind === "npcs" ? "NPC" : "Objeto"}`;
      const remove = document.createElement("button"); remove.type="button"; remove.textContent="Quitar";
      remove.addEventListener("click", () => { if (!confirm(`¿Quitar «${entry.name}» del encuentro preparado?`)) return; scene.encounter.splice(index,1); persist(); renderEncounter(); });
      line.append(name,remove); list.append(line);
    });
  }
  function renderCards() {
    const kind = $("planEntityType").value;
    const select = $("planEntityCard"); select.replaceChildren();
    (system.cardLibrary[kind] || []).forEach((card,i) => { const opt = document.createElement("option"); opt.value = String(i); opt.textContent = card.name; select.append(opt); });
  }
  function render() {
    const groups = [...new Set(data.scenes.map(s => s.group || "").filter(Boolean))].sort();
    const filter = $("planGroupFilter"), previousFilter = filter.value; filter.replaceChildren(new Option("Todos los grupos", ""), ...groups.map(g => new Option(g,g))); filter.value = groups.includes(previousFilter) ? previousFilter : "";
    const suggestions = $("planGroupSuggestions"); suggestions.replaceChildren(...groups.map(g => {const o=document.createElement("option");o.value=g;return o;}));
    renderList(); const scene = selected();
    for (const [field, element] of Object.entries(fields)) $(element).value = text(scene?.[field] || (field === "type" ? "Exploración" : ""));
    $("planSceneStatus").textContent = scene ? `Borrador privado · ${scene.encounter?.length || 0} elementos preparados` : "Creá una escena para empezar";
    for (const id of ["planSave","planDelete","planAddEntity","planPublish","planDeploy","planDeployWave"]) $(id).disabled = !scene;
    for (const [field, element] of Object.entries(worldFields)) $(element).value = text(data.world?.[field]);
    renderCards(); renderEncounter();
    $("planMapStatus").textContent=scene?.mapSnapshot?.image ? `Mapa guardado en esta escena · ${scene.mapSnapshot.width} × ${scene.mapSnapshot.height} px` : "Sin mapa preparado para esta escena.";
    $("planCaptureMap").disabled=!scene || !store.state.room?.map?.image;
    $("planApplyMap").disabled=!scene?.mapSnapshot?.image;
    $("planClearMap").disabled=!scene?.mapSnapshot;
  }
  function createScene() {
    load(); saveScene();
    const scene = { id:id(), title:`Escena ${data.scenes.length+1}`, chapter:"", type:"Exploración", public:"", secrets:"", clues:"", consequences:"", transition:"", group:"", encounter:[], mapSnapshot:null };
    data.scenes.push(scene); data.selected = scene.id; persist(); render(); $("planTitle").focus();
  }
  async function publish() {
    if (!saveScene()) return;
    const scene = selected(); if (!scene) return;
    const title = scene.title || "Escena sin título";
    if (!confirm(`¿Publicar «${title}» en el tablero? Se enviará solo su descripción pública.`)) return;
    try { await actions.scenes.saveScene({ title, description:scene.public || "", mode:"wide" }); alert("Escena enviada al tablero. El encuentro NO se publicó."); }
    catch (err) { alert(`No se pudo publicar: ${err.message}`); }
  }
  async function deploy() {
    if (!saveScene()) return;
    const scene = selected(); if (!scene?.encounter?.length) return alert("Prepará al menos una entidad.");
    if (!confirm(`¿Mostrar ${scene.encounter.length} entidades en la sala? Serán visibles en Actores y en el tablero.`)) return;
    let count = 0;
    for (const entity of scene.encounter) {
      const card = system.cardLibrary[entity.kind]?.[entity.index];
      if (!card || card.name !== entity.name) continue;
      try { await actions.library.showLibraryCard(entity.kind, entity.index); count++; }
      catch (err) { alert(`Se mostraron ${count} entidades. Error: ${err.message}`); return; }
    }
    alert(`Se agregaron ${count} entidades a la sala. Si volvés a mostrar el encuentro crearás nuevas instancias.`);
  }
  async function deployWave() {
    if (!saveScene()) return;
    const scene = selected(); if (!scene) return;
    const waves = [...new Set((scene.encounter || []).map(e => e.wave || "General"))];
    if (!waves.length) return alert("Prepará al menos una entidad.");
    const choice = prompt(`Elegí qué oleada mostrar (escribí el nombre exacto):\n${waves.join("\n")}`, waves[0]);
    if (!choice || !waves.includes(choice)) return;
    const entries = scene.encounter.filter(e => (e.wave || "General") === choice);
    if (!confirm(`¿Mostrar ${entries.length} entidades de «${choice}»?`)) return;
    let count = 0;
    for (const e of entries) {
      const card = system.cardLibrary[e.kind]?.[e.index];
      if (!card || card.name !== e.name) continue;
      try { await actions.library.showLibraryCard(e.kind,e.index); count++; }
      catch(err) { alert(`Se mostraron ${count}. Error: ${err.message}`); return; }
    }
    alert(`Oleada «${choice}»: ${count} entidades agregadas. Repetirla creará nuevas instancias.`);
  }
  function captureMap(){
    if(!saveScene())return;
    const scene=selected(),map=store.state.room?.map;
    if(!scene||!map?.image)return alert("Primero cargá un mapa en En vivo → Escena y tablero.");
    scene.mapSnapshot=JSON.parse(JSON.stringify(map));
    if(persist())render();
  }
  async function applyMap(){
    if(!saveScene())return;
    const scene=selected();if(!scene?.mapSnapshot?.image)return;
    if(!confirm(`¿Cambiar el mapa público por el mapa preparado de «${scene.title}»? El texto y las criaturas NO se publicarán.`))return;
    try{ await actions.map.replaceMap(JSON.parse(JSON.stringify(scene.mapSnapshot)));alert("Mapa de la escena enviado al tablero."); }
    catch(err){alert(`No se pudo cargar el mapa: ${err.message}`);}
  }
  function clearMap(){const scene=selected();if(!scene?.mapSnapshot||!confirm("¿Desvincular el mapa de esta escena? El mapa público no cambia."))return;scene.mapSnapshot=null;persist();render();}
  function saveWorld() {
    load(); data.world = Object.fromEntries(Object.entries(worldFields).map(([f,e])=>[f,$(e).value]));
    if (persist()) alert("Notas privadas de campaña guardadas en este navegador.");
  }
  function exportData() {
    load(); saveScene(); data.world = Object.fromEntries(Object.entries(worldFields).map(([f,e])=>[f,$(e).value]));
    const blob = new Blob([JSON.stringify({format:"mesa-arcana-private-planner",version:1,...data},null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`mesa-arcana-plan-${store.state.roomCode || "local"}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importData(file) {
    try {
      if (file.size > 2*1024*1024) throw new Error("Archivo demasiado grande");
      const obj = JSON.parse(await file.text());
      if (obj.format !== "mesa-arcana-private-planner" || !Array.isArray(obj.scenes) || typeof obj.world !== "object" || obj.scenes.length>500) throw new Error("No es un respaldo válido de Mesa Arcana");
      if (!confirm("Importar este respaldo reemplazará los borradores privados de esta sala en este navegador. ¿Continuar?")) return;
      data={ scenes:obj.scenes.map(s=>({id:text(s.id),title:text(s.title),chapter:text(s.chapter),type:text(s.type),public:text(s.public),secrets:text(s.secrets),clues:text(s.clues),consequences:text(s.consequences),transition:text(s.transition),group:text(s.group),mapSnapshot:s.mapSnapshot?.image && typeof s.mapSnapshot.image === "string" && s.mapSnapshot.image.length<210000 ? s.mapSnapshot : null,encounter:Array.isArray(s.encounter)?s.encounter.filter(e=>["enemies","npcs","objects"].includes(e.kind)&&Number.isInteger(e.index)&&e.index>=0).map(e=>({...e,wave:text(e.wave).slice(0,60)})).slice(0,100):[]})), world:Object.fromEntries(Object.keys(worldFields).map(k=>[k,text(obj.world[k])])), selected:text(obj.selected) };
      if (!data.scenes.some(x=>x.id===data.selected)) data.selected=data.scenes[0]?.id || "";
      persist(); render(); alert("Respaldo importado.");
    } catch(err) { alert(`Error al importar: ${err.message}`); }
  }
  function bind() {
    $("planNewScene").addEventListener("click",createScene);
    $("planSave").addEventListener("click",()=>saveScene());
    $("planDelete").addEventListener("click",()=>{ const scene=selected(); if(!scene||!confirm(`¿Eliminar el borrador «${scene.title}»?`))return; data.scenes=data.scenes.filter(s=>s.id!==scene.id); data.selected=data.scenes[0]?.id||""; persist(); render(); });
    $("planEntityType").addEventListener("change",renderCards);
    $("planAddEntity").addEventListener("click",()=>{ const scene=selected(); if(!scene)return; const kind=$("planEntityType").value,index=Number($("planEntityCard").value),card=system.cardLibrary[kind]?.[index];if(!card)return;scene.encounter ||= [];scene.encounter.push({kind,index,name:card.name,wave:$("planWave").value.trim().slice(0,60)});persist();renderEncounter(); });
    $("planPublish").addEventListener("click",publish);
    $("planDeploy").addEventListener("click",deploy);
    $("planDeployWave").addEventListener("click",deployWave);
    $("planCaptureMap").addEventListener("click",captureMap);
    $("planApplyMap").addEventListener("click",applyMap);
    $("planClearMap").addEventListener("click",clearMap);
    $("planGroupFilter").addEventListener("change",renderList);
    $("worldSave").addEventListener("click",saveWorld);
    $("plannerExport").addEventListener("click",exportData);
    $("plannerImport").addEventListener("click",()=>$("plannerImportFile").click());
    $("plannerImportFile").addEventListener("change",event=>{const file=event.target.files?.[0];if(file)importData(file);event.target.value="";});
    document.querySelectorAll('[data-dm-nav="adventure"],[data-dm-nav="world"]').forEach(button=>button.addEventListener("click",load));
    document.querySelectorAll('[data-dm-mode="prep"]').forEach(button=>button.addEventListener("click",load));
  }
  return {bind,load};
}
