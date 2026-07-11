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
| Sword | Đánh cận chiến |
| Fireball | Bay thẳng |
| Ice Shard | Xuyên nhiều quái |
| Lightning | Đánh mục tiêu ngẫu nhiên |
| Boomerang | Bay ra rồi quay về |

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
