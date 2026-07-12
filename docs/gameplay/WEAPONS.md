# Weapon

*Vũ khí khởi điểm và hiệu ứng baseline riêng của từng vũ khí. Hệ thống upgrade khi level up xem [UPGRADE.md](./UPGRADE.md); cơ chế Fusion xem [FUSION.md](./FUSION.md). Số liệu thật: `src/data/weapons.json`.*

## 5 vũ khí khởi điểm

| Vũ khí | Cơ chế |
|---|---|
| Sword | Đánh cận chiến, vòng đánh bám player mỗi frame — damage thấp nhất nhóm nhưng là vũ khí "tank": trang bị cộng thẳng +30 Max HP (`Player.syncSwordHpBonus()`), mất bonus ngay khi bị Fusion "nuốt" |
| Fireball | Bay thẳng, nổ khi trúng — kèm đốt DOT baseline |
| Ice Shard | Xuyên nhiều quái — kèm làm chậm baseline |
| Lightning | Đánh mục tiêu ngẫu nhiên |
| Boomerang | Bay ra xa rồi quay lại player — tầm bay xa nhất nhóm projectile (data-driven riêng theo vũ khí, không dùng hằng số chung `Projectile.ts`) |

## Cơ chế baseline (khác Upgrade — áp dụng mọi lượt trúng đòn, không cần chọn)

- **Ice Shard — Slow baseline**: mỗi lần trúng quái, làm chậm 30% moveSpeed trong ~2 giây rồi tự phục hồi (data-driven `slowFactor`/`slowDurationMs` trong `weapons.json`, tái dùng logic slow của fusion weapon). Upgrade **Freeze Chance** ([UPGRADE.md](./UPGRADE.md)) là vai trò riêng: % đóng băng HẲN (factor 1), đè lên slow baseline khi roll trúng.
- **Fireball — Burn DOT baseline**: mỗi lần trúng quái, gây thêm ~20% damage gốc/giây trong 3 giây (field `dotDamageRatio` — tỉ lệ theo damage thực tế, khác `dotDamage` flat cũ). Upgrade **Burn** không tạo hiệu ứng riêng — cộng dồn thêm % damage/giây vào DOT baseline này, stack mỗi lần chọn lại.

**Liên kết:** [UPGRADE.md](./UPGRADE.md), [FUSION.md](./FUSION.md), [ENEMIES.md](./ENEMIES.md) (đối tượng nhận damage), [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) (`WeaponSystem`)
