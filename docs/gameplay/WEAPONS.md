# Weapon

*Vũ khí khởi điểm và hiệu ứng baseline riêng của từng vũ khí. Hệ thống upgrade khi level up xem [UPGRADE.md](./UPGRADE.md); cơ chế Fusion xem [FUSION.md](./FUSION.md). Số liệu thật: `src/data/weapons.json`. Sprite nhân vật riêng theo từng character xem [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) mục "Sprite nhân vật động theo characterId".*

## Vũ khí khởi điểm theo nhân vật

`characters.json.startingWeapon` — mỗi nhân vật 1 vũ khí khởi điểm riêng, KHÔNG dùng chung 1 bộ mặc định:

| Nhân vật (`characterId`) | Vũ khí khởi điểm | Ghi chú |
|---|---|---|
| Soul Hunter (`hunter`) | **Bow** | Đổi từ Sword sang Bow — đồng bộ đúng sprite cung tên (thư mục asset `archer/`, xem ARCHITECTURE.md) |
| Knight (`knight`) | Sword | Giữ nguyên |
| Mage (`mage`) | Fireball | Giữ nguyên |
| Archer (`archer`) | Ice Shard | Giữ nguyên — LƯU Ý: đây là 1 slot roster riêng biệt trong `characters.json`, KHÁC với `hunter` dù cùng tên gọi thông thường "archer" |
| Assassin (`assassin`) | **Triple Throw** | Đổi từ Boomerang sang Triple Throw |

`sword`/`fireball`/`boomerang` vẫn còn nguyên trong `weapons.json` (Knight/Mage dùng Sword/Fireball; Boomerang vẫn roll được qua Level Up card cho mọi nhân vật, chỉ không còn là vũ khí khởi điểm mặc định của ai).

## Toàn bộ vũ khí (roll được qua Level Up card, không phân biệt nhân vật)

| Vũ khí | Cơ chế |
|---|---|
| Sword | Đánh cận chiến, vòng đánh bám player mỗi frame — damage thấp nhất nhóm nhưng là vũ khí "tank": trang bị cộng thẳng +30 Max HP (`Player.syncSwordHpBonus()`), mất bonus ngay khi bị Fusion "nuốt" |
| **Bow** | Bắn thẳng theo góc atan2 tới quái gần nhất (KHÔNG bị bó theo animation nhân vật — xem mục "Đồng bộ frame nhả dây" bên dưới), tốc độ bắn nhanh nhất nhóm projectile (`baseCooldownMs: 700`) |
| Fireball | Bay thẳng, nổ khi trúng — kèm đốt DOT baseline |
| Ice Shard | Xuyên nhiều quái — kèm làm chậm baseline |
| Lightning | Đánh mục tiêu ngẫu nhiên |
| Boomerang | Bay ra xa rồi quay lại player — tầm bay xa nhất nhóm projectile (data-driven riêng theo vũ khí, không dùng hằng số chung `Projectile.ts`) |
| **Triple Throw** | 3 dao bắn CÙNG LÚC, tỏa hình quạt quanh hướng quái gần nhất — xem mục riêng bên dưới |
| Holy Javelin | Đặc biệt, khóa — xem [SESSION_SUMMARY.md](../development/SESSION_SUMMARY.md) |
| Storm Hammer | Đặc biệt, khóa — xem [SESSION_SUMMARY.md](../development/SESSION_SUMMARY.md) |

## Bow — đồng bộ frame nhả dây với projectile thật

Mũi tên thật (gây damage) KHÔNG bắn ngay lúc bắt đầu animation Attack1 (lúc vung tay/kéo dây) mà đợi đúng tới frame nhả dây thật sự:

- `Player.playAttackAnimation(onRelease?, aimAngleRad?)` — tham số `onRelease` là callback do `WeaponSystem` truyền vào, chỉ được gọi khi animation Attack1 chạy tới đúng frame index đã xác định bằng cách xem trực tiếp từng frame `attack1_<hướng>.png` (frame 2 dây còn kéo căng, frame 3 dây đã bung/mũi tên tách khỏi cung — cả 4 hướng đều trùng tại **frame 3**, xem `Player.attackReleaseFrame`).
- Lắng nghe qua sự kiện `animationupdate` DÙNG CHUNG của Phaser (không phải `animationupdate-<key>` — Phaser CHỈ emit bản có key riêng cho `animationcomplete`, KHÔNG có cho `animationupdate`, đã verify trực tiếp trong source `AnimationState.js`), tự lọc `anim.key === key` + so khớp `frame.frame.name` (0-based, khớp đúng số frame thật của file PNG).
- `aimAngleRad`: góc bắn thật (atan2 tới quái gần nhất) tại thời điểm BẮT ĐẦU đòn đánh, quy đổi sang 1 trong 4 hướng animation gần nhất (`Player.angleToDirection()` — chia 360° thành 4 phần tư 90°) để CHỌN ĐÚNG animation Attack1 hiển thị. Mũi tên thật KHÔNG bị bó theo hướng quy đổi này — `WeaponSystem` tính lại góc bắn THẬT (atan2 chính xác, không làm tròn) NGAY LÚC bắn (không dùng lại giá trị lúc bắt đầu animation, vì quái có thể đã di chuyển trong ~200ms animation đang chạy) — animation nhân vật chỉ là xấp xỉ trực quan gần nhất trong 4 hướng có sẵn, hoàn toàn tách biệt khỏi quỹ đạo projectile thật.

## Triple Throw (Assassin) — 3 dao tỏa hình quạt, KHÔNG quay về

- Kích hoạt: bắn CÙNG LÚC 3 `Projectile` (lấy từ `PoolManager.getProjectile()` 3 lần liên tiếp) — tia trung tâm nhắm ĐÚNG góc atan2 tới quái gần nhất (`findNearestTarget()`, giống Bow — KHÔNG dùng `player.currentDirection`), 2 tia còn lại lệch **±27°** quanh tia trung tâm.
- `type: "projectile_straight"` — mỗi dao bay thẳng theo góc riêng của nó, trúng quái ĐẦU TIÊN chạm phải là despawn ngay (không pierce), hoặc bay hết `maxDistance` (480, riêng cho `triple_throw` — không dùng chung `maxTravelDistance` mặc định 500 của Fireball/Ice Shard/Holy Javelin, xem `Projectile.ts` `CUSTOM_MAX_DISTANCE_WEAPON_IDS`).
- **KHÔNG có cơ chế quay về player** — bản đầu tiên dùng `type: "triple_spread_return"` riêng (bay xa rồi tự quay lại, tái dùng cơ chế Boomerang) nhưng đã BỎ theo yêu cầu thiết kế lại, đổi thẳng về `projectile_straight` chuẩn.
- Mỗi dao `setAngle()` riêng theo đúng góc bay của chính nó (không dùng chung 1 rotation, khác Boomerang tự xoay tròn liên tục) — origin sprite neo giữa (0.5, 0.5).
- Animation Attack1 hiển thị đồng bộ theo `aimAngleRad` (giống Bow, qua `angleToDirection()`) — KHÔNG đợi frame release (bắn cả 3 dao ngay lúc bắt đầu animation, không cần đồng bộ như Bow).

## Cơ chế baseline (khác Upgrade — áp dụng mọi lượt trúng đòn, không cần chọn)

- **Ice Shard — Slow baseline**: mỗi lần trúng quái, làm chậm 30% moveSpeed trong ~2 giây rồi tự phục hồi (data-driven `slowFactor`/`slowDurationMs` trong `weapons.json`, tái dùng logic slow của fusion weapon). Upgrade **Freeze Chance** ([UPGRADE.md](./UPGRADE.md)) là vai trò riêng: % đóng băng HẲN (factor 1), đè lên slow baseline khi roll trúng.
- **Fireball — Burn DOT baseline**: mỗi lần trúng quái, gây thêm ~20% damage gốc/giây trong 3 giây (field `dotDamageRatio` — tỉ lệ theo damage thực tế, khác `dotDamage` flat cũ). Upgrade **Burn** không tạo hiệu ứng riêng — cộng dồn thêm % damage/giây vào DOT baseline này, stack mỗi lần chọn lại.

**Liên kết:** [UPGRADE.md](./UPGRADE.md), [FUSION.md](./FUSION.md), [ENEMIES.md](./ENEMIES.md) (đối tượng nhận damage), [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) (`WeaponSystem`, sprite nhân vật động)
