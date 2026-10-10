export function initials(value) {
  return String(value || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}
export function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function formatBonus(value) { return Number(value || 0) >= 0 ? `+${value}` : String(value); }
export function normalizeRoomCode(value) { return String(value || "").trim().toUpperCase(); }
export function generateRoomCode() {
  const words = ["LUNA", "FORJA", "NEXO", "BRUMA", "RUNA", "ASTRO", "HIERRO"];
  return `${words[randomInt(0, words.length - 1)]}-${randomInt(100, 999)}`;
}
export function buildOfflineRoom() {
  return { campaignName: "Mesa local", scene: { title: "Mesa local", description: "La sincronizacion todavia no esta conectada.", mode: "wide" },
    characters: {}, enemies: {}, npcs: {}, objects: {}, rolls: {}, combat: { active: false, order: [], currentIndex: 0 } };
}
