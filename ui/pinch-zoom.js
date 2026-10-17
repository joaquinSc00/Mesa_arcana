// Camera-only gesture: never writes positions or consumes movement permissions.
export function bindPinchZoom(element, { read, write, min = 0.1, max = 8 }) {
  let gesture = null, blockClickUntil = 0;
  const sample = (touches) => {
    const rect = element.getBoundingClientRect();
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
      y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
      distance: Math.max(1, Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY))
    };
  };
  const start = (event) => {
    if (event.touches.length !== 2) { gesture = null; return; }
    event.preventDefault();
    gesture = { ...sample(event.touches), camera: { ...read() } };
    blockClickUntil = Infinity;
  };
  const move = (event) => {
    if (!gesture || event.touches.length !== 2) return;
    event.preventDefault();
    const next = sample(event.touches), camera = gesture.camera;
    const zoom = Math.max(min, Math.min(max, camera.zoom * next.distance / gesture.distance));
    write({ zoom, x: next.x - (gesture.x - camera.x) * zoom / camera.zoom,
      y: next.y - (gesture.y - camera.y) * zoom / camera.zoom });
  };
  const end = () => {
    if (gesture || blockClickUntil === Infinity) blockClickUntil = Date.now() + 400;
    gesture = null;
  };
  const click = (event) => {
    if (Date.now() < blockClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  element.addEventListener("touchstart", start, { passive: false });
  element.addEventListener("touchmove", move, { passive: false });
  element.addEventListener("touchend", end);
  element.addEventListener("touchcancel", end);
  element.addEventListener("click", click, true);
  return () => {
    element.removeEventListener("touchstart", start);
    element.removeEventListener("touchmove", move);
    element.removeEventListener("touchend", end);
    element.removeEventListener("touchcancel", end);
    element.removeEventListener("click", click, true);
  };
}
