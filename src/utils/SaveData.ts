import charactersData from "@data/characters.json";
import { CharacterDef } from "@types/index";

const characters = charactersData as CharacterDef[];

/** Lưu trữ persistent qua localStorage — nền tảng cho Unlock Character/Weapon/Permanent Upgrade. */
const COIN_TOTAL_KEY = "soulhunter_coin_total";
const UNLOCKED_CHARACTERS_KEY = "soulhunter_unlocked_characters";
const SELECTED_CHARACTER_KEY = "soulhunter_selected_character";
const PERMANENT_UPGRADES_KEY = "soulhunter_permanent_upgrades";

export function getTotalCoin(): number {
  return Number(localStorage.getItem(COIN_TOTAL_KEY) ?? "0");
}

/** Cộng dồn Coin kiếm được 1 ván vào tổng đã lưu, trả về tổng mới. */
export function addCoin(amount: number): number {
  const total = getTotalCoin() + amount;
  localStorage.setItem(COIN_TOTAL_KEY, String(total));
  return total;
}

/** Trừ Coin nếu đủ (dùng cho unlock/permanent upgrade) — trả về false và không trừ gì nếu không đủ. */
export function spendCoin(amount: number): boolean {
  const total = getTotalCoin();
  if (total < amount) return false;
  localStorage.setItem(COIN_TOTAL_KEY, String(total - amount));
  return true;
}

function getUnlockedCharacterIds(): string[] {
  const raw = localStorage.getItem(UNLOCKED_CHARACTERS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

/** unlocked=true trong characters.json (vd nhân vật khởi điểm) HOẶC đã mở khóa bằng Coin trước đó. */
export function isCharacterUnlocked(character: CharacterDef): boolean {
  return character.unlocked || getUnlockedCharacterIds().includes(character.id);
}

export function unlockCharacter(id: string): void {
  const unlocked = getUnlockedCharacterIds();
  if (!unlocked.includes(id)) {
    unlocked.push(id);
    localStorage.setItem(UNLOCKED_CHARACTERS_KEY, JSON.stringify(unlocked));
  }
}

/** Trả về id nhân vật đã chọn, tự fallback về nhân vật khởi điểm nếu chưa chọn hoặc lựa chọn cũ chưa unlock. */
export function getSelectedCharacterId(): string {
  const id = localStorage.getItem(SELECTED_CHARACTER_KEY);
  const def = characters.find((c) => c.id === id);
  if (def && isCharacterUnlocked(def)) return def.id;
  return characters.find((c) => c.unlocked)?.id ?? characters[0].id;
}

export function setSelectedCharacterId(id: string): void {
  localStorage.setItem(SELECTED_CHARACTER_KEY, id);
}

function getPermanentUpgradeCounts(): Record<string, number> {
  const raw = localStorage.getItem(PERMANENT_UPGRADES_KEY);
  return raw ? (JSON.parse(raw) as Record<string, number>) : {};
}

export function getPermanentUpgradeCount(id: string): number {
  return getPermanentUpgradeCounts()[id] ?? 0;
}

export function incrementPermanentUpgrade(id: string): number {
  const counts = getPermanentUpgradeCounts();
  counts[id] = (counts[id] ?? 0) + 1;
  localStorage.setItem(PERMANENT_UPGRADES_KEY, JSON.stringify(counts));
  return counts[id];
}
