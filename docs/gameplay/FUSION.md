# Fusion

*Cơ chế đặc trưng của game — hợp nhất 2 vũ khí thành 1. Vũ khí gốc xem [WEAPONS.md](./WEAPONS.md); cách slot được chọn khi level up xem [UPGRADE.md](./UPGRADE.md). Số liệu thật: `src/data/fusions.json`, `fusionWeapons.json`.*

## Cơ chế

Khi 1 vũ khí đạt **max level** và người chơi đang sở hữu vũ khí/status tương ứng, `LevelUpScene` ưu tiên hiện thêm 1 lựa chọn Fusion (luôn chiếm 1/3 slot khi điều kiện khớp).

**Quy tắc:**
- Fusion thay thế 2 thành phần gốc bằng 1 vũ khí mới trong cùng slot — `FusionSystem.applyFusion()` chỉ filter đúng 2 `weaponId` trong `fusion.requires`, không đụng tới vũ khí khác đang trang bị.
- Vũ khí đã fusion thì không fusion tiếp (không có tier 2).
- Nhiều công thức khớp cùng lúc → chọn ngẫu nhiên 1 công thức để hiện.

## 15 công thức

| Công thức | Kết quả | Hiệu ứng |
|---|---|---|
| Fireball + Lightning | Thunder Flame | Nổ gây sét lan sang quái gần |
| Ice Shard + Boomerang | Frozen Boomerang | Boomerang đóng băng đường bay |
| Sword + Poison | Venom Blade | Chém gây độc theo thời gian |
| Sword + Fireball | Flame Edge | Chém tạo sóng lửa tầm ngắn |
| Lightning + Boomerang | Chain Return | Boomerang giật điện lan quái khi quay lại |
| Ice Shard + Fireball | Steam Burst | Xuyên quái + nổ hơi nước gây choáng |
| Sword + Ice Shard | Frost Blade | Chém có % làm chậm |
| Fireball + Boomerang | Homing Fireball | Cầu lửa bay vòng quay lại |
| Lightning + Ice Shard | Static Freeze | Sét có % đóng băng |
| Sword + Lightning | Storm Slash | Chém phóng tia sét ngẫu nhiên |
| Sword + Burn | Ember Blade | Đòn chém để lại vệt lửa trên đất |
| Fireball + Freeze Chance | Ice Bomb | Nổ gây đóng băng diện rộng |
| Boomerang + Life Steal | Vampiric Boomerang | Hút máu mỗi lần trúng |
| Ice Shard + Poison | Toxic Frost | Làm chậm + độc |
| Lightning + Burn | Plasma Bolt | Sét gây thêm cháy lan |

Mỗi fusion có bảng hành vi riêng (chain lightning, slow/stun, DOT, lifesteal, AoE) trong `data/fusionWeapons.json` — data-driven, không hardcode trong `FusionSystem`.

**Liên kết:** [WEAPONS.md](./WEAPONS.md), [UPGRADE.md](./UPGRADE.md), [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) (`FusionSystem`)
