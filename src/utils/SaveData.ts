import charactersData from "@data/characters.json";
import achievementsData from "@data/achievements.json";
import dailyChallengesData from "@data/dailyChallenges.json";
import { CharacterDef, AchievementDef, DailyChallengeDef } from "@types/index";

const characters = charactersData as CharacterDef[];
const achievements = achievementsData as AchievementDef[];
const dailyChallenges = dailyChallengesData as DailyChallengeDef[];

/** Lưu trữ persistent qua localStorage — nền tảng cho Unlock Character/Weapon/Permanent Upgrade. */
const COIN_TOTAL_KEY = "soulhunter_coin_total";
const UNLOCKED_CHARACTERS_KEY = "soulhunter_unlocked_characters";
const SELECTED_CHARACTER_KEY = "soulhunter_selected_character";
const PERMANENT_UPGRADES_KEY = "soulhunter_permanent_upgrades";
const TOTAL_KILLS_KEY = "soulhunter_total_kills";
const CLAIMED_ACHIEVEMENTS_KEY = "soulhunter_claimed_achievements";
const DAILY_CHALLENGE_CLAIM_KEY = "soulhunter_daily_challenge_claim";

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

/** Tổng số quái đã giết tích lũy qua MỌI ván (khác `kills` trong 1 ván riêng lẻ) — dùng cho Achievement. */
export function getTotalKills(): number {
  return Number(localStorage.getItem(TOTAL_KILLS_KEY) ?? "0");
}

export function addTotalKills(amount: number): number {
  const total = getTotalKills() + amount;
  localStorage.setItem(TOTAL_KILLS_KEY, String(total));
  return total;
}

function getClaimedAchievementIds(): string[] {
  const raw = localStorage.getItem(CLAIMED_ACHIEVEMENTS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export function isAchievementClaimed(id: string): boolean {
  return getClaimedAchievementIds().includes(id);
}

function claimAchievement(id: string): void {
  const claimed = getClaimedAchievementIds();
  if (!claimed.includes(id)) {
    claimed.push(id);
    localStorage.setItem(CLAIMED_ACHIEVEMENTS_KEY, JSON.stringify(claimed));
  }
}

export function getAllAchievements(): AchievementDef[] {
  return achievements;
}

/** Trả về mốc achievement tiếp theo chưa đạt (theo killThreshold tăng dần), null nếu đã đạt hết. */
export function getNextAchievement(totalKills: number): AchievementDef | null {
  return achievements.find((def) => totalKills < def.killThreshold) ?? null;
}

/** So totalKills mới với các mốc chưa nhận thưởng — tự claim + cộng Coin, trả về danh sách vừa mở khóa. */
export function checkAndClaimNewAchievements(totalKills: number): AchievementDef[] {
  const unlocked: AchievementDef[] = [];
  for (const def of achievements) {
    if (totalKills >= def.killThreshold && !isAchievementClaimed(def.id)) {
      claimAchievement(def.id);
      addCoin(def.rewardCoin);
      unlocked.push(def);
    }
  }
  return unlocked;
}

/** Chọn 1 Daily Challenge cố định theo ngày thực tế (hash chuỗi ngày) — cùng ngày mọi người thấy cùng challenge. */
export function getDailyChallengeForToday(): DailyChallengeDef {
  const dateStr = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return dailyChallenges[hash % dailyChallenges.length];
}

/** Đã nhận thưởng Coin nhân hệ số của Daily Challenge hôm nay chưa — cho chơi lại thoải mái, chỉ giới hạn phần thưởng. */
export function hasClaimedDailyChallengeToday(): boolean {
  const raw = localStorage.getItem(DAILY_CHALLENGE_CLAIM_KEY);
  if (!raw) return false;
  const { date } = JSON.parse(raw) as { date: string };
  return date === new Date().toDateString();
}

export function markDailyChallengeClaimedToday(): void {
  localStorage.setItem(DAILY_CHALLENGE_CLAIM_KEY, JSON.stringify({ date: new Date().toDateString() }));
}
