export function createMap({ document = globalThis.document, window = globalThis.window,
  ResizeObserver = globalThis.ResizeObserver, Image = globalThis.Image } = {}) {
  const $ = (id) => document.getElementById(id);
  const defaults = { width: 900, height: 650, cellWidth: 60, cellHeight: 60, offsetX: 0, offsetY: 0, grid: true, publicGrid: true, fog: false, visionOutline: false };
  const view = { dm: { zoom: 1, x: 0, y: 0, fitted: false }, public: { zoom: 1, x: 0, y: 0, fitted: false } };
  let room = null;
  let write = null;
  let map = defaults;
  let image = null;
  let imageSource = "";
  let selected = "";
  let align = false;
  let drag = null;
  let ready = false;

  function actors() {
    if (!room) return [];
    return ["characters", "enemies", "npcs", "objects"].flatMap((group) =>
      Object.entries(room[group] || {}).map(([id, actor]) => ({ key: `${group}_${id}`, group, name: actor.name || "?" }))
    );
  }

  function position(actor, index) {
    return map.positions?.[actor.key] || { x: 2 + index % 8, y: 2 + Math.floor(index / 8) };
  }

  function vision(actor) {
    return Math.max(0, Math.min(20, Number(map.vision?.[actor.key] ?? 3)));
  }

  function cellKey(x, y) { return `c_${x}_${y}`; }

  function visible() {
    const result = new Set();
    actors().forEach((actor, index) => {
      if (actor.group !== "characters") return;
      const p = position(actor, index);
      const radius = vision(actor);
      for (let y = p.y - radius; y <= p.y + radius; y++) {
        for (let x = p.x - radius; x <= p.x + radius; x++) {
          if (x >= 0 && y >= 0 && (x - p.x) ** 2 + (y - p.y) ** 2 <= radius ** 2 + 0.1) result.add(cellKey(x, y));
        }
      }
    });
    return result;
  }

  function reveal() {
    const patch = {};
    visible().forEach((key) => { if (!map.explored?.[key]) patch[`explored/${key}`] = true; });
    if (Object.keys(patch).length) write(patch);
  }

  function fit(role) {
    const canvas = $(role === "dm" ? "dmMapCanvas" : "publicMapCanvas");
    if (!canvas?.clientWidth || !canvas.clientHeight) return;
    const scale = Math.min(canvas.clientWidth / map.width, canvas.clientHeight / map.height) * 0.96;
    Object.assign(view[role], { zoom: scale, x: (canvas.clientWidth - map.width * scale) / 2, y: (canvas.clientHeight - map.height * scale) / 2, fitted: true });
    draw(role);
  }

  function draw(role) {
    const canvas = $(role === "dm" ? "dmMapCanvas" : "publicMapCanvas");
    if (!canvas || !canvas.clientWidth || !canvas.clientHeight) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const ctx = canvas.getContext("2d");
    const local = view[role];
    if (!local.fitted) fit(role);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#111826";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.save();
    ctx.translate(local.x, local.y);
    ctx.scale(local.zoom, local.zoom);
    ctx.fillStyle = "#343b40";
    ctx.fillRect(0, 0, map.width, map.height);
    if (image?.complete && image.naturalWidth) ctx.drawImage(image, 0, 0, map.width, map.height);
    else {
      ctx.fillStyle = "#9c917d";
      ctx.textAlign = "center";
      ctx.font = "22px Georgia";
      ctx.fillText("Carga un mapa para compartirlo con el tablero", map.width / 2, map.height / 2);
    }
    const cw = map.cellWidth, ch = map.cellHeight, ox = map.offsetX, oy = map.offsetY;
    const seen = visible();
    const explored = map.explored || {};
    if (map.fog) {
      const cols = Math.min(160, Math.ceil((map.width - ox) / cw));
      const rows = Math.min(160, Math.ceil((map.height - oy) / ch));
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const key = cellKey(x, y);
        const alpha = role === "dm" ? (seen.has(key) ? 0.04 : explored[key] ? 0.23 : 0.5) : seen.has(key) ? 0 : explored[key] ? 0.7 : 0.98;
        ctx.fillStyle = `rgba(5,8,14,${alpha})`;
        ctx.fillRect(ox + x * cw, oy + y * ch, cw + 1, ch + 1);
      }
    }
    if (map.grid && (role === "dm" || map.publicGrid)) {
      ctx.strokeStyle = role === "dm" ? "#dfba84a0" : "#eee3c372";
      ctx.lineWidth = 1 / local.zoom;
      ctx.beginPath();
      for (let x = ox; x <= map.width; x += cw) { ctx.moveTo(x, 0); ctx.lineTo(x, map.height); }
      for (let y = oy; y <= map.height; y += ch) { ctx.moveTo(0, y); ctx.lineTo(map.width, y); }
      ctx.stroke();
    }
    actors().forEach((actor, index) => {
      const p = position(actor, index);
      if (role === "public" && map.fog && actor.group !== "characters" && !seen.has(cellKey(p.x, p.y))) return;
      const x = ox + (p.x + 0.5) * cw, y = oy + (p.y + 0.5) * ch;
      const radius = Math.min(cw, ch) * 0.34;
      const color = { characters: "#85d2a8", enemies: "#e18d8d", npcs: "#a7baf0", objects: "#e4c782" }[actor.group];
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#17202e"; ctx.fill(); ctx.lineWidth = 3 / local.zoom; ctx.strokeStyle = color; ctx.stroke();
      ctx.fillStyle = "#fff8e9"; ctx.font = `bold ${Math.max(12, radius * 0.8)}px system-ui`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(actor.name.slice(0, 1).toUpperCase(), x, y);
      if (role === "dm" && actor.key === selected) {
        ctx.beginPath(); ctx.arc(x, y, radius + 5, 0, Math.PI * 2); ctx.strokeStyle = "#fff1c3"; ctx.lineWidth = 2 / local.zoom; ctx.stroke();
      }
      if (role === "dm" && map.visionOutline && actor.group === "characters") {
        ctx.beginPath(); ctx.ellipse(x, y, vision(actor) * cw, vision(actor) * ch, 0, 0, Math.PI * 2);
        ctx.strokeStyle = color; ctx.lineWidth = 1 / local.zoom; ctx.stroke();
      }
    });
    ctx.restore();
  }

  function drawAll() { draw("dm"); draw("public"); }

  function renderTokens() {
    const list = $("mapTokenList");
    if (!list) return;
    const entries = actors();
    if (!entries.some((actor) => actor.key === selected)) selected = entries[0]?.key || "";
    list.replaceChildren();
    entries.forEach((actor) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `map-token-button${actor.key === selected ? " active" : ""}`;
      button.textContent = actor.name;
      button.addEventListener("click", () => { selected = actor.key; renderTokens(); draw("dm"); });
      list.append(button);
    });
    const actor = entries.find((item) => item.key === selected);
    $("mapVision").value = actor ? vision(actor) : 3;
  }

  function sync(nextRoom, writer) {
    room = nextRoom;
    write = writer;
    map = { ...defaults, ...(room?.map || {}) };
    if (map.image !== imageSource) {
      imageSource = map.image || "";
      image = null;
      if (imageSource) {
        const next = new Image();
        next.onload = drawAll;
        next.src = imageSource;
        image = next;
      }
      view.dm.fitted = false; view.public.fitted = false;
    }
    $("publicMapCanvas").hidden = !map.enabled;
    $("boardStage").classList.toggle("has-map", !!map.enabled);
    $("mapToggle").textContent = map.enabled ? "Ocultar mapa publico" : "Mostrar mapa publico";
    $("mapToggle").disabled = !map.image;
    for (const [id, value] of Object.entries({ mapCellWidth: map.cellWidth, mapCellHeight: map.cellHeight, mapOffsetX: map.offsetX, mapOffsetY: map.offsetY })) {
      if (document.activeElement !== $(id)) $(id).value = value;
    }
    for (const [id, value] of Object.entries({ mapGrid: map.grid, mapPublicGrid: map.publicGrid, mapFog: map.fog, mapVisionOutline: map.visionOutline })) $(id).checked = value;
    renderTokens();
    drawAll();
  }

  function world(event) {
    const rect = $("dmMapCanvas").getBoundingClientRect();
    return { x: (event.clientX - rect.left - view.dm.x) / view.dm.zoom, y: (event.clientY - rect.top - view.dm.y) / view.dm.zoom };
  }

  function gridPoint(event) {
    const p = world(event);
    return { x: Math.floor((p.x - map.offsetX) / map.cellWidth), y: Math.floor((p.y - map.offsetY) / map.cellHeight) };
  }

  function init() {
    if (ready) return;
    ready = true;
    const canvas = $("dmMapCanvas");
    new ResizeObserver(() => drawAll()).observe(canvas);
    new ResizeObserver(() => draw("public")).observe($("publicMapCanvas"));
    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const point = gridPoint(event);
      const hit = actors().find((actor, index) => { const p = position(actor, index); return p.x === point.x && p.y === point.y; });
      drag = { x: event.clientX, y: event.clientY, vx: view.dm.x, vy: view.dm.y, ox: map.offsetX, oy: map.offsetY, point, hit, moved: false };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
      if (!drag.moved) return;
      if (align) { map.offsetX = Math.round(drag.ox + dx / view.dm.zoom); map.offsetY = Math.round(drag.oy + dy / view.dm.zoom); }
      else { view.dm.x = drag.vx + dx; view.dm.y = drag.vy + dy; }
      draw("dm");
    });
    canvas.addEventListener("pointerup", () => {
      if (!drag) return;
      if (drag.moved && align) write({ offsetX: map.offsetX, offsetY: map.offsetY });
      if (!drag.moved && !align) {
        if (drag.hit) selected = drag.hit.key;
        else if (selected && drag.point.x >= 0 && drag.point.y >= 0) {
          write({ [`positions/${selected}`]: drag.point });
          // El listener de Firebase revela casillas al recibir la nueva posicion.
        }
        renderTokens(); draw("dm");
      }
      drag = null;
    });
    canvas.addEventListener("pointercancel", () => { drag = null; });
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      const old = view.dm.zoom;
      view.dm.zoom = Math.max(0.1, Math.min(5, old * (event.deltaY < 0 ? 1.1 : 0.9)));
      view.dm.x = x - (x - view.dm.x) * view.dm.zoom / old;
      view.dm.y = y - (y - view.dm.y) * view.dm.zoom / old;
      draw("dm");
    }, { passive: false });
    $("mapFit").addEventListener("click", () => fit("dm"));
    $("mapZoomIn").addEventListener("click", () => { view.dm.zoom = Math.min(5, view.dm.zoom * 1.2); draw("dm"); });
    $("mapZoomOut").addEventListener("click", () => { view.dm.zoom = Math.max(0.1, view.dm.zoom / 1.2); draw("dm"); });
    $("mapToggle").addEventListener("click", () => write({ enabled: !map.enabled }));
    $("mapExport").addEventListener("click", () => {
      draw("dm");
      const link = document.createElement("a"); link.download = "mesa-arcana-mapa.png";
      link.href = canvas.toDataURL("image/png"); link.click();
    });
    $("mapResetFog").addEventListener("click", () => {
      if (!confirm("Reiniciar las areas descubiertas del mapa?")) return;
      write({ explored: Object.fromEntries([...visible()].map((key) => [key, true])) });
    });
    $("mapAlign").addEventListener("click", () => {
      align = !align; $("mapAlign").setAttribute("aria-pressed", String(align));
    });
    for (const [id, key] of Object.entries({ mapCellWidth: "cellWidth", mapCellHeight: "cellHeight", mapOffsetX: "offsetX", mapOffsetY: "offsetY" })) {
      $(id).addEventListener("change", () => {
        const value = Number($(id).value);
        if (!Number.isFinite(value)) return;
        write({ [key]: key.startsWith("cell") ? Math.max(16, Math.min(250, value)) : Math.max(-250, Math.min(250, value)) });
      });
    }
    for (const [id, key] of Object.entries({ mapGrid: "grid", mapPublicGrid: "publicGrid", mapFog: "fog", mapVisionOutline: "visionOutline" })) {
      $(id).addEventListener("change", () => write({ [key]: $(id).checked }));
    }
    $("mapVision").addEventListener("change", () => {
      if (selected) write({ [`vision/${selected}`]: Math.max(0, Math.min(20, Number($("mapVision").value) || 0)) });
    });
    $("mapFile").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) { alert("La imagen supera 15 MB. Elegi una mas liviana."); return; }
      const url = URL.createObjectURL(file);
      const source = new Image();
      source.onload = () => {
        URL.revokeObjectURL(url);
        const output = document.createElement("canvas");
        let scale = Math.min(1, 1200 / Math.max(source.naturalWidth, source.naturalHeight));
        let data = "";
        for (let attempt = 0; attempt < 4; attempt++) {
          output.width = Math.max(1, Math.round(source.naturalWidth * scale));
          output.height = Math.max(1, Math.round(source.naturalHeight * scale));
          output.getContext("2d").drawImage(source, 0, 0, output.width, output.height);
          data = output.toDataURL("image/jpeg", attempt === 0 ? 0.7 : 0.55);
          if (data.length <= 200000) break;
          scale *= 0.75;
        }
        if (data.length > 200000) { alert("El mapa comprimido sigue siendo demasiado grande. Usa una imagen mas sencilla."); return; }
        write({ enabled: true, image: data, width: output.width, height: output.height, explored: null });
        view.dm.fitted = false; view.public.fitted = false;
        event.target.value = "";
      };
      source.onerror = () => { URL.revokeObjectURL(url); alert("No se pudo leer la imagen."); };
      source.src = url;
    });
    window.addEventListener("keydown", (event) => {
      if (!$("dmView").classList.contains("active") || document.activeElement?.matches("input, textarea, select")) return;
      const delta = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
      const entries = actors();
      const index = entries.findIndex((actor) => actor.key === selected);
      if (!delta || index < 0 || $("dmMapStage").offsetParent === null) return;
      event.preventDefault();
      const p = position(entries[index], index);
      write({ [`positions/${selected}`]: { x: Math.max(0, p.x + delta[0]), y: Math.max(0, p.y + delta[1]) } });
    });
  }

  return { init, sync, reveal, fit };
}
