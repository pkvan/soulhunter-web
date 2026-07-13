import { EventBus, GameEvents } from "@utils/EventBus";
import { addCoin, addPermanentUpgradeTokens, getCheapestLockedWeapon, unlockWeapon } from "@utils/SaveData";
import challengeDaysData from "@data/challengeDays.json";
import challengeMilestonesData from "@data/challengeMilestones.json";
import weaponsData from "@data/weapons.json";
import fusionWeaponsData from "@data/fusionWeapons.json";
import { ChallengeDayDef, ChallengeMissionDef, ChallengeMilestoneDef, WeaponDef } from "@types/index";

const challengeDays = challengeDaysData as ChallengeDayDef[];
const challengeMilestones = challengeMilestonesData as ChallengeMilestoneDef[];
const allWeapons = [...(weaponsData as WeaponDef[]), ...(fusionWeaponsData as WeaponDef[])];

const STATE_KEY = "soulhunter_challenge7days_state";

export type ChallengeDayState = "locked" | "current" | "completed";
/** locked: chưa đủ sao. available: đủ sao, chưa nhận. claimed: đã nhận (reward Coin/token trừu tượng).
 * owned: riêng rewardType "weapon_unlock" đã nhận VÀ thực sự sở hữu vũ khí (phân biệt với "claimed" chung chung). */
export type ChallengeMilestoneState = "locked" | "available" | "claimed" | "owned";

interface Challenge7DaysState {
  currentDay: number; // ngày đang mở để chơi, 1-7 — không tăng nữa sau khi hoàn thành ngày 7
  progressByDay: Record<number, number>; // 1 bộ đếm dùng chung cho mọi mission "kill_enemies" trong cùng ngày (mốc luỹ tiến)
  completedMissionIds: string[]; // để chỉ cộng rewardStars đúng 1 lần/mission
  completedDays: number[];
  totalStars: number;
  claimedMilestones: number[]; // requiredStars đã claim
  weaponRewardGranted: Record<number, string>; // requiredStars -> weaponId THỰC TẾ đã unlock (chỉ rewardType "weapon_unlock")
}

function defaultState(): Challenge7DaysState {
  return {
    currentDay: 1,
    progressByDay: {},
    completedMissionIds: [],
    completedDays: [],
    totalStars: 0,
    claimedMilestones: [],
    weaponRewardGranted: {}
  };
}

function loadState(): Challenge7DaysState {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) return defaultState();
  return { ...defaultState(), ...(JSON.parse(raw) as Challenge7DaysState) };
}

function saveState(state: Challenge7DaysState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/**
 * Quản lý toàn bộ trạng thái Thử Thách 7 Ngày. Mỗi ngày có 3-4 mission cùng chia sẻ 1 bộ đếm luỹ tiến
 * (progressByDay) — mission targetValue càng lớn thì cần bộ đếm càng cao mới hoàn thành, giống các mốc
 * nhiệm vụ tăng dần trong cùng 1 ngày. Ngày mở TUẦN TỰ khi TẤT CẢ mission trong ngày hiện tại hoàn thành —
 * không gắn theo lịch thật (khác Daily Login Reward trong SaveData.ts, tránh trùng cơ chế 2 hệ thống 7-ngày).
 * Milestone reward CHỈ tái dùng cơ chế thật đã có trong SaveData (Coin/unlockWeapon/PermanentUpgradeToken) —
 * không có reward "giả" chỉ để hiển thị. UI (Challenge7DaysScene và các component con) CHỈ đọc qua các hàm
 * get* và gọi addKillProgress()/claimMilestone() — không tự đọc/ghi localStorage.
 */
export class Challenge7DaysManager {
  static getAllDays(): ChallengeDayDef[] {
    return challengeDays;
  }

  static getDayDef(day: number): ChallengeDayDef | undefined {
    return challengeDays.find((d) => d.day === day);
  }

  static getCurrentDay(): number {
    return loadState().currentDay;
  }

  static getDayState(day: number): ChallengeDayState {
    const state = loadState();
    if (state.completedDays.includes(day)) return "completed";
    if (day === state.currentDay) return "current";
    return "locked";
  }

  static getDayProgress(day: number): number {
    return loadState().progressByDay[day] ?? 0;
  }

  static isMissionCompleted(missionId: string): boolean {
    return loadState().completedMissionIds.includes(missionId);
  }

  /** progress hiển thị cho 1 mission — kẹp trong [0, targetValue] vì bộ đếm dùng chung có thể đã vượt qua mission dễ hơn. */
  static getMissionProgress(day: number, mission: ChallengeMissionDef): number {
    return Math.min(this.getDayProgress(day), mission.targetValue);
  }

  static getTotalStars(): number {
    return loadState().totalStars;
  }

  static getMaxStars(): number {
    return challengeDays.reduce((sum, d) => sum + d.missions.reduce((s, m) => s + m.rewardStars, 0), 0);
  }

  static getMilestones(): ChallengeMilestoneDef[] {
    return challengeMilestones;
  }

  static getMilestoneState(def: ChallengeMilestoneDef): ChallengeMilestoneState {
    const state = loadState();
    if (state.claimedMilestones.includes(def.requiredStars)) {
      return def.rewardType === "weapon_unlock" ? "owned" : "claimed";
    }
    if (state.totalStars >= def.requiredStars) return "available";
    return "locked";
  }

  /** Nhãn hiển thị cuối cùng cho reward — với "weapon_unlock" đã claim, trả về TÊN THẬT của vũ khí vừa mở khóa thay vì tên chung chung, để UI phân biệt rõ "đã sở hữu và có thể dùng" là vũ khí gì. */
  static getMilestoneRewardLabel(def: ChallengeMilestoneDef): string {
    if (def.rewardType === "weapon_unlock") {
      const grantedId = loadState().weaponRewardGranted[def.requiredStars];
      if (grantedId) {
        const weapon = allWeapons.find((w) => w.id === grantedId);
        if (weapon) return weapon.name;
      }
    }
    return def.rewardName;
  }

  /** Gọi mỗi khi 1 quái bị giết trong lúc chơi (xem GameScene.registerKill) — chỉ cộng vào ngày đang mở, missionType "kill_enemies". */
  static addKillProgress(amount = 1): void {
    const state = loadState();
    const dayDef = this.getDayDef(state.currentDay);
    if (!dayDef) return;
    if (state.completedDays.includes(state.currentDay)) return;

    const killMissions = dayDef.missions.filter((m) => m.missionType === "kill_enemies");
    if (killMissions.length === 0) return;

    const maxTarget = Math.max(...killMissions.map((m) => m.targetValue));
    const current = state.progressByDay[state.currentDay] ?? 0;
    const next = Math.min(current + amount, maxTarget);
    state.progressByDay[state.currentDay] = next;

    killMissions.forEach((m) => {
      if (next >= m.targetValue && !state.completedMissionIds.includes(m.id)) {
        state.completedMissionIds.push(m.id);
        state.totalStars += m.rewardStars;
      }
    });

    let dayUnlocked = false;
    const allMissionsDone = dayDef.missions.every((m) => state.completedMissionIds.includes(m.id));
    if (allMissionsDone) {
      state.completedDays.push(state.currentDay);
      if (state.currentDay < 7) {
        state.currentDay += 1;
        dayUnlocked = true;
      }
    }

    saveState(state);
    EventBus.emit(GameEvents.CHALLENGE_PROGRESS_UPDATED, { day: dayDef.day, progress: next });
    if (dayUnlocked) EventBus.emit(GameEvents.CHALLENGE_DAY_UNLOCKED, { day: state.currentDay });
  }

  static claimMilestone(requiredStars: number): boolean {
    const state = loadState();
    const def = challengeMilestones.find((m) => m.requiredStars === requiredStars);
    if (!def) return false;
    if (state.claimedMilestones.includes(requiredStars)) return false;
    if (state.totalStars < requiredStars) return false;

    state.claimedMilestones.push(requiredStars);

    if (def.rewardType === "coin") {
      if (def.rewardCoin) addCoin(def.rewardCoin);
    } else if (def.rewardType === "permanent_upgrade_token") {
      addPermanentUpgradeTokens(1);
    } else if (def.rewardType === "weapon_unlock") {
      const weapon = getCheapestLockedWeapon();
      if (weapon) {
        unlockWeapon(weapon.id);
        state.weaponRewardGranted[requiredStars] = weapon.id;
      } else if (def.rewardCoin) {
        addCoin(def.rewardCoin); // đã unlock hết vũ khí đặc biệt — trả Coin thay thế, giống SaveData.claimLoginReward
      }
    }

    saveState(state);
    EventBus.emit(GameEvents.CHALLENGE_REWARD_CLAIMED, { requiredStars, rewardId: def.rewardId });
    return true;
  }
}
