import mapsData from "@data/maps.json";
import enemiesForest from "@data/enemies.json";
import enemiesGraveyard from "@data/enemies_graveyard.json";
import enemiesSwamp from "@data/enemies_swamp.json";
import enemiesFrozenTundra from "@data/enemies_frozen_tundra.json";
import enemiesVolcanic from "@data/enemies_volcanic.json";
import enemiesDesertRuins from "@data/enemies_desert_ruins.json";
import enemiesCorruptedCastle from "@data/enemies_corrupted_castle.json";
import enemiesCrystalCaves from "@data/enemies_crystal_caves.json";
import enemiesSkySanctum from "@data/enemies_sky_sanctum.json";
import enemiesVoidAbyss from "@data/enemies_void_abyss.json";
import bossesData from "@data/bosses.json";
import { MapDef, EnemyDef, BossDef } from "@types/index";

const maps = mapsData as MapDef[];
const bosses = bossesData as BossDef[];

/** enemyDataFile (string trong maps.json) -> mảng EnemyDef thật đã import sẵn — Vite không hỗ trợ import động theo chuỗi runtime. */
const ENEMY_DATA_REGISTRY: Record<string, EnemyDef[]> = {
  "enemies.json": enemiesForest as EnemyDef[],
  "enemies_graveyard.json": enemiesGraveyard as EnemyDef[],
  "enemies_swamp.json": enemiesSwamp as EnemyDef[],
  "enemies_frozen_tundra.json": enemiesFrozenTundra as EnemyDef[],
  "enemies_volcanic.json": enemiesVolcanic as EnemyDef[],
  "enemies_desert_ruins.json": enemiesDesertRuins as EnemyDef[],
  "enemies_corrupted_castle.json": enemiesCorruptedCastle as EnemyDef[],
  "enemies_crystal_caves.json": enemiesCrystalCaves as EnemyDef[],
  "enemies_sky_sanctum.json": enemiesSkySanctum as EnemyDef[],
  "enemies_void_abyss.json": enemiesVoidAbyss as EnemyDef[]
};

export function getAllMaps(): MapDef[] {
  return [...maps].sort((a, b) => a.order - b.order);
}

export function getMapById(id: string): MapDef | undefined {
  return maps.find((m) => m.id === id);
}

export function getEnemyDataForMap(map: MapDef): EnemyDef[] {
  return ENEMY_DATA_REGISTRY[map.enemyDataFile] ?? (enemiesForest as EnemyDef[]);
}

/** Boss cuối của map — dùng để hiển thị panel MapSelectScene (tên boss), không dùng trong gameplay (GameScene tự resolve qua bossId). */
export function getBossForMap(map: MapDef): BossDef | undefined {
  return bosses.find((b) => b.id === map.bossId);
}

const CLEARED_MAPS_KEY = "soulhunter_cleared_maps";

function getClearedMapIds(): string[] {
  const raw = localStorage.getItem(CLEARED_MAPS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export function isMapCleared(id: string): boolean {
  return getClearedMapIds().includes(id);
}

/** Gọi ngay khi Final Boss của map chết (thắng), TRƯỚC khi chuyển GameOverScene — để map tiếp theo mở khóa ngay. */
export function markMapCleared(id: string): void {
  const cleared = getClearedMapIds();
  if (!cleared.includes(id)) {
    cleared.push(id);
    localStorage.setItem(CLEARED_MAPS_KEY, JSON.stringify(cleared));
  }
}

/** unlockRequires null (map đầu) HOẶC map yêu cầu đã nằm trong danh sách cleared. */
export function isMapUnlocked(map: MapDef): boolean {
  return map.unlockRequires === null || isMapCleared(map.unlockRequires);
}

/** Map unlock gần nhất chưa clear (mặc định chọn khi mở MapSelectScene) — fallback map đầu tiên nếu chưa clear map nào. */
export function getLatestUnlockedMap(): MapDef {
  const all = getAllMaps();
  const firstUncleared = all.find((m) => isMapUnlocked(m) && !isMapCleared(m.id));
  if (firstUncleared) return firstUncleared;
  // đã clear hết map hiện có -> quay lại map cuối cùng đã unlock
  const unlocked = all.filter((m) => isMapUnlocked(m));
  return unlocked[unlocked.length - 1] ?? all[0];
}

/** Map kế tiếp theo `order` — dùng cho nút "Map tiếp theo" ở VictoryScene. undefined nếu currentMapId là map cuối cùng. */
export function getNextMap(currentMapId: string): MapDef | undefined {
  const all = getAllMaps();
  const currentIndex = all.findIndex((m) => m.id === currentMapId);
  if (currentIndex === -1) return undefined;
  return all[currentIndex + 1];
}
