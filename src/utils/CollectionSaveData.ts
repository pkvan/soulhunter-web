/**
 * Lưu trữ persistent các mục đã "khám phá" cho màn Collection — 4 key riêng biệt trong localStorage,
 * mỗi key là 1 mảng id. Tách khỏi SaveData.ts (dù cùng layer utils) vì đây là dữ liệu THUẦN HIỂN THỊ
 * (đã từng thấy/sở hữu qua chưa), không lẫn với các key gameplay-effect khác (Coin, Unlock thật...) của
 * SaveData.ts. CHỈ CollectionManager (systems/) được gọi các hàm ở file này — mọi hệ thống gameplay khác
 * (WeaponSystem/UpgradeSystem/FusionSystem/BossSystem) phải gọi qua CollectionManager.unlockX(id), không
 * import file này trực tiếp, để CollectionManager luôn là nơi DUY NHẤT kiểm tra trùng + bắn event unlock.
 */
const DISCOVERED_MONSTERS_KEY = "soulhunter_collection_monsters";
const DISCOVERED_WEAPONS_KEY = "soulhunter_collection_weapons";
const DISCOVERED_BOSSES_KEY = "soulhunter_collection_bosses";
const DISCOVERED_CARDS_KEY = "soulhunter_collection_cards";

function getIds(key: string): string[] {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

function addId(key: string, id: string): void {
  const ids = getIds(key);
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(key, JSON.stringify(ids));
  }
}

/** Monster: mở khi giết lần đầu (gọi từ WeaponSystem.applyDamage lúc enemy chết). */
export function isMonsterDiscovered(id: string): boolean {
  return getIds(DISCOVERED_MONSTERS_KEY).includes(id);
}
export function discoverMonster(id: string): void {
  addId(DISCOVERED_MONSTERS_KEY, id);
}

/** Weapon: mở khi thực sự trang bị/sở hữu (gọi từ UpgradeSystem.applyWeaponChoice khi isNew, FusionSystem.applyFusion). */
export function isWeaponDiscovered(id: string): boolean {
  return getIds(DISCOVERED_WEAPONS_KEY).includes(id);
}
export function discoverWeapon(id: string): void {
  addId(DISCOVERED_WEAPONS_KEY, id);
}

/** Boss: mở khi gặp (gọi từ BossSystem.spawnBoss — đánh bại luôn kéo theo đã từng gặp nên không cần hook riêng). */
export function isBossDiscovered(id: string): boolean {
  return getIds(DISCOVERED_BOSSES_KEY).includes(id);
}
export function discoverBoss(id: string): void {
  addId(DISCOVERED_BOSSES_KEY, id);
}

/** Card (Upgrade): mở khi đã từng chọn ít nhất 1 lần (gọi từ UpgradeSystem.applyUpgrade). */
export function isCardDiscovered(id: string): boolean {
  return getIds(DISCOVERED_CARDS_KEY).includes(id);
}
export function discoverCard(id: string): void {
  addId(DISCOVERED_CARDS_KEY, id);
}
