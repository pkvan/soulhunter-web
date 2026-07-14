# Map

*Thiết kế map hiện tại và chướng ngại vật (Wall). Spawn quái xem [ENEMIES.md](./ENEMIES.md).*

## Map hiện tại

10 map, data-driven hoàn toàn qua `src/data/maps.json` (đọc qua `utils/MapData.ts`, không hardcode trong Scene) — mỗi map là 1 world khép kín dạng vô tận (procedural/tile lặp lại), không có tilemap/background thật riêng theo map (TODO, hiện dùng placeholder màu theo `theme_color`, xem [ASSET_GUIDE.md](../assets/ASSET_GUIDE.md)). Chọn map qua `MapSelectScene` (world map dạng đảo liên kết, `ui/MapRenderer.ts` vẽ) — mở khóa tuần tự (`unlockRequires` trỏ id map trước, map đầu `null`), `difficultyMultiplier` tăng dần nhân thêm vào độ khó gốc của `SpawnSystem` lúc spawn quái (KHÔNG nhân sẵn vào số liệu quái/boss trong data — giữ đúng 1 nguồn tính toán duy nhất).

| Order | Map (`id`) | Boss | `difficultyMultiplier` | Quái data (`src/data/`) |
|---|---|---|---|---|
| 1 | Forest (`forest`) | Giant Skeleton | 1.0 | `enemies.json` |
| 2 | Graveyard (`graveyard`) | Grave Keeper | 1.15 | `enemies_graveyard.json` |
| 3 | Swamp (`swamp`) | Poison Hydra | 1.3 | `enemies_swamp.json` |
| 4 | Frozen Tundra (`frozen_tundra`) | Frost Titan | 1.45 | `enemies_frozen_tundra.json` |
| 5 | Volcanic (`volcanic`) | Inferno Behemoth | 1.6 | `enemies_volcanic.json` |
| 6 | Desert Ruins (`desert_ruins`) | Pharaoh's Curse | 1.75 | `enemies_desert_ruins.json` |
| 7 | Corrupted Castle (`corrupted_castle`) | Fallen King | 1.9 | `enemies_corrupted_castle.json` |
| 8 | Crystal Caves (`crystal_caves`) | Crystal Guardian | 2.05 | `enemies_crystal_caves.json` |
| 9 | Sky Sanctum (`sky_sanctum`) | Storm Dragon | 2.2 | `enemies_sky_sanctum.json` |
| 10 | Void Abyss (`void_abyss`) | Soul Devourer (4 skill, mạnh nhất) | 2.35 | `enemies_void_abyss.json` |

Mỗi map (trừ Forest/Graveyard, xem [ENEMIES.md](./ENEMIES.md)) có đúng 5 quái thường theo cùng 1 khuôn vai trò (slime/basic-ground/phasing/tanky/flying — tương ứng slime/skeleton/ghost/orc/bat của Forest), số liệu HP/damage giữ baseline gần Forest (không tự nhân theo map order), chỉ khác tên/màu (`tintColor`) theo theme riêng để phân biệt trực quan. Boss mỗi map đều `isFinalBoss: true` (chi tiết `skillIds`/`introText` xem [BOSSES.md](./BOSSES.md)) — hạ được boss là map "cleared", mở khóa map kế tiếp.

Thêm file `enemies_*.json` mới BẮT BUỘC phải đăng ký thủ công vào `ENEMY_DATA_REGISTRY` trong `utils/MapData.ts` — Vite không hỗ trợ import động theo chuỗi runtime từ `maps.json.enemyDataFile`, quên bước này thì map sẽ fallback về quái Forest.

## Wall (chướng ngại vật)

Rải ~14 cụm static physics body quanh khu vực player xuất phát (`GameScene.spawnWalls()`), đủ thưa để không cản trở gameplay chính. Player và mọi Enemy va chạm (chặn đường đi) qua Arcade `collider`, **TRỪ Ghost** (`def.flag === "phasing"`) — đúng đặc điểm "đi xuyên vật cản" trong [ENEMIES.md](./ENEMIES.md). Lọc Ghost qua `processCallback` đọc `sprite.getData("enemyInstance")` vì cùng 1 sprite pool được tái sử dụng cho nhiều loại quái — xem gotcha pooling trong [ARCHITECTURE.md](../architecture/ARCHITECTURE.md).

**Liên kết:** [ENEMIES.md](./ENEMIES.md), [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) (gotcha `processCallback`)
