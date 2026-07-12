# Gameplay

*Trải nghiệm TRONG 1 VÁN: thể loại, vòng lặp, điều khiển, kinh tế, kết quả. Vũ khí/upgrade/fusion xem [WEAPONS.md](./WEAPONS.md)/[UPGRADE.md](./UPGRADE.md)/[FUSION.md](./FUSION.md); quái/boss xem [ENEMIES.md](./ENEMIES.md)/[BOSSES.md](./BOSSES.md); tiến trình xuyên-ván xem [META_PROGRESSION.md](./META_PROGRESSION.md); map xem [MAP.md](./MAP.md); HUD xem [UI.md](./UI.md).*

## Thể loại & cốt truyện

Roguelite, Survival, Auto Attack, Top-down 2D. Một ván 10–15 phút. Thế giới bị xâm chiếm bởi linh hồn bóng tối, người chơi là thợ săn linh hồn, giết quái rơi Soul để mạnh lên — càng sống lâu quái càng mạnh.

## Vòng lặp gameplay

```
Spawn → Giết quái → Nhặt Soul → Level Up → Chọn 1/3 nâng cấp
→ Quái mạnh hơn → Boss → Chết/Thắng → Nhận Coin → Unlock → Chơi lại
```

Độ khó ramp phi tuyến theo thời gian sống: chậm 5 phút đầu, nhanh dần về cuối (mốc/hệ số trong `GAMEPLAY` của `GameConfig.ts`, không hardcode rải rác).

## Điều khiển

- WASD: di chuyển (chuẩn hóa vận tốc chéo, camera lerp theo player mượt)
- Chuột: dự phòng kỹ năng chủ động (chưa dùng)
- Không có nút bắn — vũ khí tự động tấn công, xem [WEAPONS.md](./WEAPONS.md)

## Kinh tế trong game

- **Soul**: tiền trong trận, nhặt từ quái chết để lên cấp (`SoulSystem`). Magnet Orb hút toàn bộ Soul đang active — xem [META_PROGRESSION.md](./META_PROGRESSION.md).
- **Coin**: tiền sau trận, dùng cho meta progression — xem [META_PROGRESSION.md](./META_PROGRESSION.md).
- **Max Level**: giới hạn cấp 30 — đạt mốc, Soul dư quy đổi 1:1 thành Coin bonus cuối ván, HUD đổi thanh Soul thành nhãn "MAX LEVEL" cố định màu vàng.

## Combat feedback

Player nhận damage: flash đỏ nhanh (~100ms) + screen shake theo mức damage — bỏ qua damage nhỏ lẻ (<2% Max HP, vd DOT tick), shake mạnh hơn với đòn nặng (>15% Max HP).

## Kết quả sau trận

```
Survival: 08:25
Kills: 634
Coin: 230
Highest Combo: 48
```

Thắng (hạ boss cuối) hiện thêm banner "CHIẾN THẮNG!" trước bảng kết quả — xem cutscene Final Boss trong [BOSSES.md](./BOSSES.md).

**Liên kết:** [WEAPONS.md](./WEAPONS.md), [UPGRADE.md](./UPGRADE.md), [FUSION.md](./FUSION.md), [ENEMIES.md](./ENEMIES.md), [BOSSES.md](./BOSSES.md), [MAP.md](./MAP.md), [META_PROGRESSION.md](./META_PROGRESSION.md), [UI.md](./UI.md), [TASKS.md](../development/TASKS.md)
