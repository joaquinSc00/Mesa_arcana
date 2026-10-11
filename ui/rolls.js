import { formatBonus } from "../core/utils.js";
export function renderRolls(feed, room) {
  const rolls = Object.entries(room.rolls || {}).sort((a, b) => b[1].createdAt - a[1].createdAt).slice(0, 8);
  feed.innerHTML = rolls.length ? rolls.map(([id, roll]) => {
    const breakdown = roll.breakdown || [];
    return `
      <div class="roll-item" data-roll-id="${id}">
        <strong class="roll-number-gem">${roll.total}</strong>
        <span>${roll.actor} - ${roll.label}</span>
        <div class="roll-breakdown">
          ${breakdown.map((part) => `<span>${part.label}: ${formatBonus(part.value)}</span>`).join("")}
        </div>
        <span class="resolution-pill">Anotacion para el DM</span>
      </div>
    `;
  }).join("") : `<div class="roll-item"><span>Todavia no hubo tiradas.</span></div>`;
}
