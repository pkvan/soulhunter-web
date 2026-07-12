# UI

*HUD, overlay, và style dùng chung giữa các màn hình. Không phải gameplay logic — xem [GAMEPLAY.md](./GAMEPLAY.md) cho vòng lặp/kinh tế.*

## HUD trong ván

- Soul/Level: progress bar bình thường; đạt Max Level (30) → đổi thành nhãn "MAX LEVEL" cố định màu vàng, xem [GAMEPLAY.md](./GAMEPLAY.md).
- Boss HP bar: màu riêng theo `bosses.json.color`; banner "XUẤT HIỆN" scale-in + screen shake khi spawn, xem [BOSSES.md](./BOSSES.md).
- Soul Corruption: progress bar countdown phía trên đầu + glow tím quanh player (bám vị trí mỗi frame), xem [ENEMIES.md](./ENEMIES.md).
- Achievement: toast "Achievement Unlocked" ở `GameOverScene`, tiến độ hiện ở `MenuScene`, xem [META_PROGRESSION.md](./META_PROGRESSION.md).

## Card style dùng chung — `getCardStyle()` (`ui/LevelUpCard.ts`)

Nguồn DUY NHẤT xác định màu/style card, dùng ở cả `LevelUpScene` (chọn lúc level up) và `PauseScene` (loadout tray) — bắt buộc theo quy tắc "1 nguồn dùng chung" trong [CODING_RULES.md](../development/CODING_RULES.md):

| Loại | Màu viền |
|---|---|
| Fusion | Coral |
| Vũ khí mới (`isNew`, level === 1) | Xanh dương |
| Vũ khí nâng cấp (level > 1) | Xanh lá |
| Stat upgrade | Trung tính |

Tiêu chí `isNew` DUY NHẤT: `eq.level === 1` — dùng giống hệt ở cả 2 màn hình (từng bị lệch, xem bug fix trong [TASKS.md](../development/TASKS.md)).

## PauseScene

- Mọi nút Pause/Resume/Restart/Home vẽ icon bằng Graphics (không text button), tối thiểu 48px đường kính, có hover/press state.
- Loadout tray: gom nhóm theo `weaponId` + badge số lượng/level ở góc trên-phải, dùng `getCardStyle()` ở trên.
- Grid wrap nhiều cột, giới hạn chiều cao qua Geometry Mask + cuộn bằng wheel khi vượt quá.
- Home mở confirm dialog (icon check/x) — thoát giữa ván KHÔNG cộng Coin, chỉ `GameOverScene` khi ván kết thúc tự nhiên mới cộng.
- Restart giữ nguyên `characterId` + Daily Challenge đang chơi (`GameScene.getActiveChallengeId()`).

**Liên kết:** [CODING_RULES.md](../development/CODING_RULES.md), [GAMEPLAY.md](./GAMEPLAY.md), [BOSSES.md](./BOSSES.md), [ENEMIES.md](./ENEMIES.md), [META_PROGRESSION.md](./META_PROGRESSION.md)
