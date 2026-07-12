import charactersData from "@data/characters.json";
import achievementsData from "@data/achievements.json";
import dailyChallengesData from "@data/dailyChallenges.json";
import weaponsData from "@data/weapons.json";
import dailyRewardsData from "@data/dailyRewards.json";
import { CharacterDef, AchievementDef, DailyChallengeDef, WeaponDef, DailyRewardDef } from "@types/index";

const characters = charactersData as CharacterDef[];
const achievements = achievementsData as AchievementDef[];
const dailyChallenges = dailyChallengesData as DailyChallengeDef[];
const weapons = weaponsData as WeaponDef[];
const dailyRewards = dailyRewardsData as DailyRewardDef[];

/** Lưu trữ persistent qua localStorage — nền tảng cho Unlock Character/Weapon/Permanent Upgrade. */
const COIN_TOTAL_KEY = "soulhunter_coin_total";
const UNLOCKED_CHARACTERS_KEY = "soulhunter_unlocked_characters";
const SELECTED_CHARACTER_KEY = "soulhunter_selected_character";
const PERMANENT_UPGRADES_KEY = "soulhunter_permanent_upgrades";
const TOTAL_KILLS_KEY = "soulhunter_total_kills";
const CLAIMED_ACHIEVEMENTS_KEY = "soulhunter_claimed_achievements";
const DAILY_CHALLENGE_CLAIM_KEY = "soulhunter_daily_challenge_claim";
const UNLOCKED_WEAPONS_KEY = "soulhunter_unlocked_weapons";
const LOGIN_STREAK_KEY = "soulhunter_login_streak";
const DAY7_BONUS_CLAIMED_KEY = "soulhunter_day7_bonus_claimed";
const PERMANENT_UPGRADE_TOKENS_KEY = "soulhunter_permanent_upgrade_tokens";

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

function getUnlockedWeaponIds(): string[] {
  const raw = localStorage.getItem(UNLOCKED_WEAPONS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

/** locked !== true trong weapons.json (5 vũ khí khởi điểm) HOẶC đã mở khóa qua Daily Login Day7/Boss Loot Wheel trước đó. */
export function isWeaponUnlocked(weapon: WeaponDef): boolean {
  return !weapon.locked || getUnlockedWeaponIds().includes(weapon.id);
}

export function unlockWeapon(id: string): void {
  const unlocked = getUnlockedWeaponIds();
  if (!unlocked.includes(id)) {
    unlocked.push(id);
    localStorage.setItem(UNLOCKED_WEAPONS_KEY, JSON.stringify(unlocked));
  }
}

/** Vũ khí đặc biệt (locked=true) rẻ nhất trong số CHƯA unlock — dùng cho Daily Login Day7 + Boss Loot "unlock_weapon". null nếu đã unlock hết. */
export function getCheapestLockedWeapon(): WeaponDef | null {
  const locked = weapons.filter((w) => w.locked && !isWeaponUnlocked(w));
  if (locked.length === 0) return null;
  return locked.reduce((cheapest, w) => ((w.unlockCostCoin ?? 0) < (cheapest.unlockCostCoin ?? 0) ? w : cheapest));
}

export function getPermanentUpgradeTokens(): number {
  return Number(localStorage.getItem(PERMANENT_UPGRADE_TOKENS_KEY) ?? "0");
}

export function addPermanentUpgradeTokens(amount: number): number {
  const total = getPermanentUpgradeTokens() + amount;
  localStorage.setItem(PERMANENT_UPGRADE_TOKENS_KEY, String(total));
  return total;
}

/** Trừ 1 token nếu có, dùng để mua Permanent Upgrade miễn phí ở UnlockScene thay vì trừ Coin — false nếu không đủ token. */
export function usePermanentUpgradeToken(): boolean {
  const total = getPermanentUpgradeTokens();
  if (total <= 0) return false;
  localStorage.setItem(PERMANENT_UPGRADE_TOKENS_KEY, String(total - 1));
  return true;
}

interface LoginStreakState {
  currentDay: number; // 1-7
  lastLoginDate: string | null; // toDateString() của lần mở game gần nhất đã tính streak (dù đã claim hay đang chờ claim)
  claimed: boolean; // đã bấm "Nhận thưởng" cho currentDay ứng với lastLoginDate hiện tại chưa
}

function getLoginStreakState(): LoginStreakState {
  const raw = localStorage.getItem(LOGIN_STREAK_KEY);
  if (!raw) return { currentDay: 0, lastLoginDate: null, claimed: true };
  return JSON.parse(raw) as LoginStreakState;
}

function saveLoginStreakState(state: LoginStreakState): void {
  localStorage.setItem(LOGIN_STREAK_KEY, JSON.stringify(state));
}

/**
 * Gọi 1 lần lúc MenuScene.create(): so lastLoginDate với hôm nay để TÍNH currentDay mới (không tự cộng
 * thưởng — chỉ đánh dấu claimed=false để MenuScene biết cần hiện popup "Nhận thưởng"). Ngày kế tiếp liên
 * tục -> +1 (quay về 1 sau ngày 7); bỏ lỡ >1 ngày hoặc lần đầu chơi -> reset về 1; đã tính hôm nay rồi
 * (dù đã claim hay đang chờ claim) -> không làm gì, tránh tính lại streak nếu mở lại Menu nhiều lần trong ngày.
 */
export function checkAndAdvanceLoginStreak(): void {
  const state = getLoginStreakState();
  const today = new Date().toDateString();
  if (state.lastLoginDate === today) return;

  let nextDay: number;
  if (!state.lastLoginDate) {
    nextDay = 1;
  } else {
    const diffDays = Math.round((new Date(today).getTime() - new Date(state.lastLoginDate).getTime()) / 86400000);
    nextDay = diffDays === 1 ? (state.currentDay >= 7 ? 1 : state.currentDay + 1) : 1;
  }
  saveLoginStreakState({ currentDay: nextDay, lastLoginDate: today, claimed: false });
}

export function getLoginStreakDay(): number {
  return getLoginStreakState().currentDay;
}

export function hasPendingLoginReward(): boolean {
  return !getLoginStreakState().claimed;
}

export function getDailyRewardForDay(day: number): DailyRewardDef {
  return dailyRewards.find((r) => r.day === day) ?? dailyRewards[0];
}

function isDay7BonusClaimedEver(): boolean {
  return localStorage.getItem(DAY7_BONUS_CLAIMED_KEY) === "true";
}

/**
 * Áp dụng phần thưởng Daily Login cho currentDay hiện tại + đánh dấu đã claim (chặn hiện popup lại trong
 * ngày). specialUnlock (Day 7) chỉ thật sự mở khóa vũ khí LẦN ĐẦU TIÊN trong toàn bộ lịch sử chơi — các
 * lần quay lại Day 7 sau đó vẫn nhận đủ Coin bình thường nhưng không unlock thêm vũ khí nào nữa.
 */
export function claimLoginReward(): { reward: DailyRewardDef; unlockedWeapon: WeaponDef | null } {
  const state = getLoginStreakState();
  const reward = getDailyRewardForDay(state.currentDay);
  addCoin(reward.coin);
  if (reward.permanentUpgradeToken) addPermanentUpgradeTokens(1);

  let unlockedWeapon: WeaponDef | null = null;
  if (reward.specialUnlock && !isDay7BonusClaimedEver()) {
    unlockedWeapon = getCheapestLockedWeapon();
    if (unlockedWeapon) unlockWeapon(unlockedWeapon.id);
    localStorage.setItem(DAY7_BONUS_CLAIMED_KEY, "true");
  }

  saveLoginStreakState({ ...state, claimed: true });
  return { reward, unlockedWeapon };
}
