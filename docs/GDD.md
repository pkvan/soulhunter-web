# SoulHunter — Game Design Document

## 1. Tổng quan

- Thể loại: Roguelite, Survival, Auto Attack, Top-down 2D
- Thời lượng 1 ván: 10–15 phút
- Cốt truyện: thế giới bị xâm chiếm bởi linh hồn bóng tối, người chơi là thợ săn linh hồn, giết quái rơi Soul, thu thập để mạnh lên, càng sống lâu quái càng mạnh.

## 2. Gameplay loop

```
Spawn → Giết quái → Nhặt Soul → Level Up → Chọn 1/3 nâng cấp
→ Quái mạnh hơn → Boss → Chết → Nhận Coin → Unlock → Chơi lại
```

## 3. Điều khiển

- WASD: di chuyển
- Chuột: dự phòng cho kỹ năng chủ động (chưa dùng ở MVP)
- Không có nút bắn — vũ khí tự động tấn công

## 4. Vũ khí (5 loại khởi điểm)

| Vũ khí | Cơ chế |
|---|---|
| Sword | Đánh cận chiến — damage thấp nhất trong 5 vũ khí, đổi lại là vũ khí "tank": trang bị Sword cộng thẳng +30 Max HP (mất bonus nếu Sword bị fusion "nuốt" mất) |
| Fireball | Bay thẳng, nổ khi trúng — kèm đốt DOT baseline (xem mục 19) |
| Ice Shard | Xuyên nhiều quái — kèm làm chậm baseline (xem mục 19) |
| Lightning | Đánh mục tiêu ngẫu nhiên |
| Boomerang | Bay ra xa rồi quay lại player — tầm bay xa nhất trong nhóm projectile |

## 5. Upgrade (20 loại)

Damage +15%, Attack Speed +20%, Move Speed +10%, Critical Chance, Critical Damage, Projectile +1, Fireball Size, Sword Range, Freeze Chance, Burn, Poison, Life Steal, Max HP, Shield, Magnet, và tối thiểu 5 loại bổ sung tùy balance (ví dụ: HP Regen, Pickup Radius, Cooldown Reduction, Dodge Chance, Armor).

## 6. Fusion Upgrade — cơ chế đặc trưng

Thay vì chỉ nâng cấp từng vũ khí riêng lẻ, khi một vũ khí đạt **max level** và người chơi đang sở hữu vũ khí/status tương ứng, màn hình level-up sẽ ưu tiên hiện thêm 1 lựa chọn fusion (luôn chiếm 1 trong 3 slot khi điều kiện khớp).

**Quy tắc**:
- Fusion thay thế 2 thành phần gốc bằng 1 vũ khí mới trong cùng slot (giải phóng chỗ trống).
- Vũ khí đã fusion thì không fusion tiếp (không có tier 2 ở MVP).
- Nếu nhiều công thức khớp cùng lúc, chọn ngẫu nhiên 1 công thức để hiện.

**15 công thức khởi điểm**:

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

## 7. Quái (5 loại)

| Quái | Đặc điểm |
|---|---|
| Slime | Máu ít |
| Skeleton | Bình thường |
| Ghost | Đi xuyên vật cản |
| Orc | Máu nhiều |
| Bat | Bay nhanh |

## 8. Boss

Xuất hiện ở phút thứ 5. Ví dụ: Giant Skeleton.
Kỹ năng: Dash, Summon, Ground Slam. Không cần quá phức tạp ở MVP.

## 9. Map

Chỉ 1 map: Forest, dạng vô tận (procedural/tile lặp lại), không cần nhiều màn.

**Wall (chướng ngại vật)**: rải rác vài cụm quanh khu vực player xuất phát, đủ thưa để không cản trở gameplay chính. Player và mọi loại Enemy đều va chạm (chặn đường đi), TRỪ Ghost — đúng theo đặc điểm "đi xuyên vật cản" ở mục 7.

## 10. Đồ họa và hiệu ứng

- Pixel Art 32x32, có thể dùng asset miễn phí giai đoạn đầu.
- Hiệu ứng cần có: Damage Number, Critical, Explosion, Flash, Screen Shake, Particle.

## 11. Kinh tế trong game

- **Soul**: tiền trong trận, dùng để lên cấp.
- **Coin**: tiền sau trận, dùng cho meta progression.

## 12. Kết quả sau trận (ví dụ hiển thị)

```
Survival: 08:25
Kills: 634
Coin: 230
Highest Combo: 48
```

## 13. Meta progression

Coin dùng để: Unlock Character, Unlock Weapon, Permanent Upgrade (ví dụ +2% Damage, +5 HP, +1% Critical).

## 14. Character

Khởi điểm 1 nhân vật. Dự kiến mở rộng: Knight, Mage, Archer, Assassin.

## 15. Achievement và Daily Challenge

- Achievement: giết 100 / 1000 / 10000 quái.
- Daily Challenge ví dụ: Enemy HP x2 → Damage x2 → Coin x3.

## 16. Âm thanh

SFX: Attack, Explosion, Boss, Level Up, Game Over. Có BGM nền.

## 17. MVP (phạm vi build đầu tiên)

```
1 Character, 1 Map, 5 Enemy, 5 Weapon, 20 Upgrade, 1 Boss, 10 phút gameplay
```

Fusion nên thêm sau khi core loop (spawn → giết → nhặt Soul → level up → upgrade → boss → chết → coin) đã chạy ổn định, không làm song song từ đầu.

## 18. Pickup ngẫu nhiên

Vật phẩm ngẫu nhiên rơi trên map trong lúc chơi (khác Soul — Soul rơi từ quái chết đều đặn, Pickup là phần thưởng ngẫu nhiên độc lập), tạo thêm biến số/khoảnh khắc bất ngờ giữa trận.

- **Tần suất**: roll xuất hiện khoảng mỗi 15-20 giây, spawn ở vị trí gần player nhưng không đè lên player (trong tầm nhìn, không như Enemy spawn ngoài camera).
- **Thời gian tồn tại**: tối đa ~10 giây trên map nếu không nhặt, tự biến mất (fade out).

| Loại | Hiệu ứng |
|---|---|
| Heal Potion | Hồi ngay một phần trăm Max HP (không vượt quá Max HP) |
| Magnet Orb | Hút toàn bộ Soul đang có trên map (kể cả ngoài tầm nhìn) bay hội tụ về player — Soul đuổi theo vị trí player realtime (không phải điểm cố định lúc nhặt), tốc độ tăng dần mô phỏng lực hút, tất cả bắt đầu bay cùng lúc nên tự nhiên hội tụ từ nhiều hướng |

## 19. Cơ chế baseline vũ khí (khác 20 Upgrade ở mục 5)

Một số vũ khí có sẵn hiệu ứng đặc trưng ngay từ đầu (không cần chọn upgrade để mở khóa) — khác với 20 upgrade ở mục 5 vốn là lựa chọn ngẫu nhiên khi level up. Các cơ chế baseline này áp dụng cho MỌI lượt trúng đòn của đúng vũ khí đó, và một vài upgrade cũ được đổi ý nghĩa để tránh trùng lặp với baseline mới:

- **Ice Shard — Slow baseline**: mỗi lần trúng quái, tự làm chậm 30% moveSpeed trong ~2 giây rồi tự phục hồi, không cần upgrade. Upgrade **Freeze Chance** (mục 5) vẫn giữ nguyên vai trò riêng biệt: % đóng băng HẲN (moveSpeed = 0) trong thời gian ngắn, đè lên hiệu ứng slow baseline khi roll trúng — khác hẳn slow baseline vốn chỉ giảm 30%.
- **Fireball — Burn DOT baseline**: mỗi lần trúng quái, gây thêm damage theo thời gian bằng ~20% damage gốc mỗi giây trong 3 giây. Upgrade **Burn** (mục 5) không còn tạo hiệu ứng cháy riêng — đổi thành cộng dồn thêm % damage/giây vào DOT baseline của Fireball, stack được mỗi lần chọn lại.
- **Shrapnel (upgrade mới, mục 5)**: chỉ áp dụng cho Fireball/Ice Shard — mỗi lần trúng quái, tự bắn thêm N tia phụ (damage giảm 50% so với đòn gốc) dàn đều quanh 1 hướng ngẫu nhiên, trúng quái khác. Stackable: mỗi lần chọn lại tăng thêm 1 tia phụ (2 → 3 → 4...). Tia phụ khi trúng KHÔNG tự bắn thêm tia phụ (chặn đệ quy vô hạn).
- **Sword — vũ khí tank**: baseDamage thấp nhất trong 5 vũ khí khởi điểm, đổi lại khi Sword còn trong loadout (`equippedWeapons`) player được cộng thẳng +30 Max HP. Mất bonus ngay khi Sword bị fusion "nuốt" làm nguyên liệu (xem mục 6) hoặc không còn trang bị.
- **Boomerang — tầm bay xa hơn**: khoảng cách bay ra tối đa trước khi quay lại player tăng so với baseline gốc (giờ đọc từ số liệu riêng theo vũ khí thay vì hằng số dùng chung cho mọi vũ khí projectile_return).
