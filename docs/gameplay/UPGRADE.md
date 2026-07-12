# Upgrade

*Hệ thống nâng cấp khi level up. Vũ khí gốc xem [WEAPONS.md](./WEAPONS.md); Fusion xem [FUSION.md](./FUSION.md). Số liệu thật: `src/data/upgrades.json`.*

## Chọn upgrade khi level up

`LevelUpScene` hiện 3 lựa chọn mỗi lần: vũ khí mới / nâng cấp level vũ khí đã có / stat upgrade — xử lý bởi `UpgradeSystem`. Nếu điều kiện Fusion khớp, 1 slot ưu tiên đổi thành lựa chọn Fusion — xem [FUSION.md](./FUSION.md).

## Danh sách upgrade (20+ loại, chọn ngẫu nhiên 3)

Damage, Attack Speed, Move Speed, Critical Chance, Critical Damage, Projectile +1, Fireball Size, Sword Range, Freeze Chance, Burn, Poison, Life Steal, Max HP, Shield, Magnet, HP Regen, Pickup Radius, Cooldown Reduction, Dodge Chance, Armor, **Shrapnel**.

## Shrapnel

Chỉ áp dụng Fireball/Ice Shard (`appliesTo: string[]` trong `UpgradeDef`): mỗi lần trúng quái, tự bắn thêm N tia phụ (damage giảm 50%) dàn đều quanh 1 hướng ngẫu nhiên. Stackable — mỗi lần chọn lại tăng thêm 1 tia (2 → 3 → 4...). Chặn đệ quy bằng cờ `Projectile.isShrapnel` (tia phụ trúng không tự bắn thêm tia phụ) — xem `WeaponSystem.spawnShrapnel()`.

**Liên kết:** [WEAPONS.md](./WEAPONS.md), [FUSION.md](./FUSION.md), [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) (`UpgradeSystem`)
