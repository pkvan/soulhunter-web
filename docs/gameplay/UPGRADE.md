# Upgrade

*Hệ thống nâng cấp khi level up. Vũ khí gốc xem [WEAPONS.md](./WEAPONS.md); Fusion xem [FUSION.md](./FUSION.md). Số liệu thật: `src/data/upgrades.json`.*

## Chọn upgrade khi level up

`LevelUpScene` hiện 3 lựa chọn mỗi lần: vũ khí mới / nâng cấp level vũ khí đã có / stat upgrade — xử lý bởi `UpgradeSystem`. Nếu điều kiện Fusion khớp, 1 slot ưu tiên đổi thành lựa chọn Fusion — xem [FUSION.md](./FUSION.md).

## Danh sách upgrade (20+ loại, chọn ngẫu nhiên 3)

Damage, Attack Speed, Move Speed, Critical Chance, Critical Damage, Projectile +1, Fireball Size, Sword Range, Freeze Chance, Burn, Poison, Life Steal, Max HP, Shield, Magnet, HP Regen, Pickup Radius, Cooldown Reduction, Dodge Chance, Armor, **Shrapnel**.

## Shrapnel

Chỉ áp dụng Fireball/Ice Shard (`appliesTo: string[]` trong `UpgradeDef`): mỗi lần trúng quái, tự bắn thêm N tia phụ (damage giảm 50%) dàn đều quanh 1 hướng ngẫu nhiên. Stackable — mỗi lần chọn lại tăng thêm 1 tia (2 → 3 → 4...). Chặn đệ quy bằng cờ `Projectile.isShrapnel` (tia phụ trúng không tự bắn thêm tia phụ) — xem `WeaponSystem.spawnShrapnel()`.

## Cơ chế đọc/áp dụng từng stat (nơi CONSUME, không phải chỉ set)

`UpgradeSystem.applyUpgrade()` chỉ làm 1 việc DUY NHẤT: `player.stats[def.stat] += def.value` (cộng dồn theo key string từ data — do TypeScript index signature `[key: string]: number` trên `PlayerStats`, việc SET này luôn "thành công" kể cả khi không có code nào đọc lại field đó, không có lỗi/warning nào xuất hiện). Vì vậy mỗi stat PHẢI có code thật ở nơi khác đọc lại và áp dụng — liệt kê ở đây để không lặp lại bug "set mà không ai đọc":

| Stat (`upgrades.json.stat`) | Nơi đọc/áp dụng | Ghi chú |
|---|---|---|
| `damageMultiplier`, `cooldownMultiplier`, `critChance`, `critDamageMultiplier`, `pickupRadiusMultiplier`, `lifeStealPercent`, `shieldCharges` | Pre-init = giá trị nền (1, 1, 0.05, 1.5, 1, 0, 0) trong `Player` constructor — đọc thẳng, không cần `?? 0` | `WeaponSystem.fire()`/`SoulSystem.update()`/`Player.takeDamage()` |
| `moveSpeedMultiplier`, `fireballSizeMultiplier`, `swordRangeMultiplier`, `soulValueMultiplier` | KHÔNG pre-init (bắt đầu undefined) — nơi đọc PHẢI tự `1 + (stat ?? 0)`, không đọc thẳng | `Player.update()` / `WeaponSystem.fire()` (fireball/sword lọc theo `def.id`) / `WeaponSystem.applyDamage()` |
| `freezeChance`, `burnChance`, `shrapnelCount`, `poisonChance`, `hpRegenPerSecond`, `globalCooldownReduction`, `dodgeChance`, `flatDamageReduction` | KHÔNG pre-init — nơi đọc tự `?? 0` | `WeaponSystem.applyOnHitEffects()`/`fire()`, `Player.update()`/`takeDamage()` |
| `projectileCount` | KHÔNG pre-init — `1 + (stat ?? 0)` = tổng số viên/mục tiêu mỗi lượt bắn | `WeaponSystem.fire()` (projectile fan-spread hoặc random_target multi-zap) |
| `maxHp` | `UpgradeSystem.applyUpgrade()` cộng thêm CẢ `currentHp` cùng lúc (giống `Player.syncSwordHpBonus()`) | không chỉ nâng trần, tăng máu ngay lập tức |

**Đã fix 1 sprint** (trước đó 14/21 upgrade set giá trị vào `player.stats` nhưng KHÔNG CÓ code nào đọc lại — người chơi chọn card nhưng hoàn toàn không có tác dụng): Move Speed, Critical Chance/Damage (toàn bộ hệ thống crit chưa tồn tại), Projectile +1, Fireball Size, Sword Range, Poison (chưa gắn proc nào), Life Steal (code cũ đọc nhầm `WeaponDef.lifeStealPercent` — lifesteal RIÊNG của 1 vũ khí fusion — thay vì `player.stats.lifeStealPercent`), Shield/Dodge/Armor (3 stat này y hệt 1 dòng TODO bỏ ngỏ trong `Player.takeDamage()`), HP Regen, Cooldown Reduction, Soul Value. Thứ tự phòng thủ khi player nhận damage: Shield (miễn nhiễm, tiêu 1 charge) → Dodge (né hẳn) → Armor/`flatDamageReduction` (trừ thẳng, sàn 0) → trừ HP.

**Liên kết:** [WEAPONS.md](./WEAPONS.md), [FUSION.md](./FUSION.md), [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) (`UpgradeSystem`)
