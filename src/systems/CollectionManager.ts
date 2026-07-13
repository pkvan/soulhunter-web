import enemiesForestData from "@data/enemies.json";
import enemiesGraveyardData from "@data/enemies_graveyard.json";
import weaponsData from "@data/weapons.json";
import fusionWeaponsData from "@data/fusionWeapons.json";
import bossesData from "@data/bosses.json";
import bossSkillsData from "@data/bossSkills.json";
import upgradesData from "@data/upgrades.json";
import { EnemyDef, WeaponDef, BossDef, BossSkillDef, UpgradeDef, CollectionTabId } from "@types/index";
import {
  isMonsterDiscovered,
  discoverMonster,
  isWeaponDiscovered,
  discoverWeapon,
  isBossDiscovered,
  discoverBoss,
  isCardDiscovered,
  discoverCard
} from "@utils/CollectionSaveData";
import { EventBus, GameEvents } from "@utils/EventBus";

const enemiesForest = enemiesForestData as EnemyDef[];
const enemiesGraveyard = enemiesGraveyardData as EnemyDef[];
const weapons = weaponsData as WeaponDef[];
const fusionWeapons = fusionWeaponsData as WeaponDef[];
const bosses = bossesData as BossDef[];
const bossSkills = bossSkillsData as BossSkillDef[];
const upgrades = upgradesData as UpgradeDef[];

export interface MonsterEntry {
  def: EnemyDef;
  unlocked: boolean;
}

export interface WeaponEntry {
  def: WeaponDef;
  unlocked: boolean;
}

export interface BossEntry {
  def: BossDef;
  skillNames: string[];
  unlocked: boolean;
}

export interface CardEntry {
  def: UpgradeDef;
  unlocked: boolean;
}

/** Payload của GameEvents.COLLECTION_UNLOCKED — CollectionScene dùng `type` để biết có cần refresh tab đang mở hay không. */
export interface CollectionUnlockedPayload {
  type: CollectionTabId;
  id: string;
}

/** Trộn enemies.json (Forest) + enemies_graveyard.json (Graveyard), loại trùng theo id — 2 map dùng chung 1 danh sách quái nếu id trùng. */
function getAllMonsterDefs(): EnemyDef[] {
  const combined = [...enemiesForest, ...enemiesGraveyard];
  const seen = new Set<string>();
  return combined.filter((def) => {
    if (seen.has(def.id)) return false;
    seen.add(def.id);
    return true;
  });
}

/** Trộn weapons.json (5 khởi điểm + 2 đặc biệt) + fusionWeapons.json (15 công thức) — Collection xem tất cả là "vũ khí" như nhau. */
function getAllWeaponDefs(): WeaponDef[] {
  return [...weapons, ...fusionWeapons];
}

/**
 * DEV-ONLY (yêu cầu tạm thời để dễ kiểm tra giao diện Collection khi chưa cày đủ tiến trình thật): ép
 * TẤT CẢ entry hiện `unlocked: true` bất kể đã khám phá thật hay chưa. CHỈ ảnh hưởng lớp HIỂN THỊ của
 * getXEntries() bên dưới — is*Discovered()/discoverX() và toàn bộ hook unlock* vẫn ghi nhận tiến trình
 * THẬT bình thường (không tắt), nên chỉ cần đổi hằng số này về `false` là quay lại đúng cơ chế unlock
 * theo gameplay ngay, không mất dữ liệu đã ghi trong lúc bật flag này.
 */
const DEV_UNLOCK_ALL = true;

/**
 * Không tạo `monsters.json`/`weapons.json`/`bosses.json`/`cards.json` riêng như đề bài liệt kê ở mục 8 —
 * `weapons.json`/`bosses.json` đã tồn tại với vai trò data gốc cho gameplay (WeaponSystem/BossSystem đọc
 * trực tiếp), tạo file trùng tên/trùng nội dung sẽ vi phạm nguyên tắc "1 nguồn dữ liệu duy nhất" trong
 * CODING_RULES.md và dễ lệch dữ liệu giữa 2 nơi. Toàn bộ nội dung Collection ở đây được tính lại từ đúng
 * các file data GAMEPLAY THẬT đã có (enemies.json/enemies_graveyard.json/weapons.json/fusionWeapons.json/
 * bosses.json/bossSkills.json/upgrades.json), chỉ thêm field hiển thị còn thiếu (rarity, tên skill) trực
 * tiếp vào các file đó. Trạng thái "đã khám phá" (is*Discovered) đọc qua utils/CollectionSaveData.ts.
 */
export class CollectionManager {
  static getMonsterEntries(): MonsterEntry[] {
    return getAllMonsterDefs().map((def) => ({ def, unlocked: DEV_UNLOCK_ALL || isMonsterDiscovered(def.id) }));
  }

  static getWeaponEntries(): WeaponEntry[] {
    return getAllWeaponDefs().map((def) => ({ def, unlocked: DEV_UNLOCK_ALL || isWeaponDiscovered(def.id) }));
  }

  static getBossEntries(): BossEntry[] {
    return bosses.map((def) => ({
      def,
      skillNames: def.skillIds.map((id) => bossSkills.find((s) => s.id === id)?.name ?? id),
      unlocked: DEV_UNLOCK_ALL || isBossDiscovered(def.id)
    }));
  }

  static getCardEntries(): CardEntry[] {
    return upgrades.map((def) => ({ def, unlocked: DEV_UNLOCK_ALL || isCardDiscovered(def.id) }));
  }

  /**
   * 4 điểm ghi DUY NHẤT cho trạng thái Collection — mọi hệ thống gameplay (WeaponSystem/UpgradeSystem/
   * FusionSystem/BossSystem) gọi các hàm unlock* này thay vì tự ghi thẳng vào utils/CollectionSaveData.ts.
   * Tự kiểm tra đã unlock chưa để không ghi trùng/không bắn event thừa; chỉ khi THỰC SỰ mở khóa mới mới
   * emit COLLECTION_UNLOCKED để CollectionScene (nếu đang mở) tự cập nhật đúng tab liên quan, không cần
   * đóng/mở lại màn hình.
   */
  static unlockMonster(id: string): boolean {
    if (isMonsterDiscovered(id)) return false;
    discoverMonster(id);
    EventBus.emit(GameEvents.COLLECTION_UNLOCKED, { type: "monsters", id } satisfies CollectionUnlockedPayload);
    return true;
  }

  static unlockWeapon(id: string): boolean {
    if (isWeaponDiscovered(id)) return false;
    discoverWeapon(id);
    EventBus.emit(GameEvents.COLLECTION_UNLOCKED, { type: "weapons", id } satisfies CollectionUnlockedPayload);
    return true;
  }

  static unlockBoss(id: string): boolean {
    if (isBossDiscovered(id)) return false;
    discoverBoss(id);
    EventBus.emit(GameEvents.COLLECTION_UNLOCKED, { type: "bosses", id } satisfies CollectionUnlockedPayload);
    return true;
  }

  static unlockCard(id: string): boolean {
    if (isCardDiscovered(id)) return false;
    discoverCard(id);
    EventBus.emit(GameEvents.COLLECTION_UNLOCKED, { type: "cards", id } satisfies CollectionUnlockedPayload);
    return true;
  }
}
