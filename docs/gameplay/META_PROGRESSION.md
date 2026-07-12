# Meta Progression / Save System

*Tiến trình XUYÊN-VÁN (persistent qua `localStorage`): Coin, Unlock Character, Permanent Upgrade, Achievement, Daily Challenge, Daily Login Reward, Pickup ngẫu nhiên. `utils/SaveData.ts` là nguồn sự thật cho các key lưu trữ — không liệt kê lại từng key ở đây. Kinh tế Soul trong-trận xem [GAMEPLAY.md](./GAMEPLAY.md).*

## Coin — dùng để

Unlock Character, Unlock Weapon (đặc biệt), Permanent Upgrade. Coin kiếm được cuối ván tính qua `utils/CoinFormula.ts` (dựa trên Kills, Survival Time, Victory, Highest Combo), cộng dồn vào `localStorage` qua `SaveData.ts`.

## Character

Khởi điểm 1 nhân vật, mở khóa thêm bằng Coin qua `UnlockScene` (đọc `characters.json`). Nhân vật đã chọn được `MenuScene` đọc và cộng vào stat gốc của Player mỗi ván lúc khởi tạo. *(Dự kiến mở rộng — xem [ROADMAP.md](../development/ROADMAP.md).)*

## Permanent Upgrade

Mua nhiều lần bằng Coin ở `UnlockScene`, giá tăng dần: +2→4%/lần Damage, +5 HP/lần, +1% Critical/lần — đều có `maxPurchases` (Damage 20 / HP 15 / Critical 10 lần, tối đa +80% Damage vĩnh viễn) để tránh vỡ balance khi Coin tích lũy nhiều. `UnlockScene` disable nút mua + hiện icon "MAX" khi đạt giới hạn. Số lần đã mua đọc/ghi `permanentUpgrades.json` qua `SaveData.ts`.

## Achievement

Mốc giết quái tích lũy qua MỌI ván (khác `kills` trong 1 ván riêng lẻ), mỗi mốc thưởng Coin 1 lần. Định nghĩa trong `data/achievements.json`. **Lưu ý**: đang để mốc 10/50/100 quái để dễ test, KHÔNG PHẢI số liệu release thật (dự kiến 100/1000/10000) — cần chỉnh trước khi release, xem [ROADMAP.md](../development/ROADMAP.md). Tự kiểm tra + hiện toast "Achievement Unlocked" ở `GameOverScene`, tiến độ hiện ở `MenuScene`.

## Daily Challenge

Chọn 1 challenge cố định theo ngày thực tế (hash `toDateString()` — mọi người cùng ngày thấy cùng challenge, định nghĩa trong `data/dailyChallenges.json`). Modifier: Enemy HP / Player Damage / Coin reward, áp dụng vào `SpawnSystem`/`Player`/`GameScene.computeCoinEarned`. Chơi lại thoải mái trong ngày nhưng chỉ nhận thưởng Coin nhân hệ số **1 lần/ngày**.

## Daily Login Reward (7 ngày)

Streak tính lúc `MenuScene.create()` (`SaveData.checkAndAdvanceLoginStreak()`): liên tục +1 ngày, quay về 1 sau ngày 7; bỏ lỡ >1 ngày thì reset về 1. Popup hiện 7 ô (đã qua = dấu check, hôm nay = highlight, ngày 7 = icon ★ riêng) kèm nút "Nhận thưởng". Định nghĩa phần thưởng trong `data/dailyRewards.json`:

- **Day 4**: tặng 1 Permanent Upgrade Token (mua Permanent Upgrade miễn phí, trừ token thay Coin).
- **Day 7**: mở khóa NGAY 1 vũ khí đặc biệt (`weapons.json` field `locked: true`, ưu tiên rẻ nhất trong danh sách chưa mở) — CHỈ áp dụng **1 lần duy nhất** trong toàn bộ lịch sử chơi (`soulhunter_day7_bonus_claimed`). Các lần quay lại Day 7 sau đó vẫn nhận Coin bình thường nhưng không unlock thêm vũ khí.

## Pickup ngẫu nhiên

Vật phẩm ngẫu nhiên rơi trên map trong lúc chơi (khác Soul — Soul rơi từ quái chết đều đặn, Pickup là phần thưởng độc lập, tạo thêm biến số bất ngờ giữa trận). Roll xuất hiện ~15-20 giây/lần, spawn gần player nhưng không đè lên player (trong tầm nhìn, khác Enemy spawn ngoài camera). Tồn tại tối đa ~10 giây nếu không nhặt, tự fade-out. Quản lý qua pool riêng (`PickupSystem` + `PoolManager`).

| Loại | Hiệu ứng |
|---|---|
| Heal Potion | Hồi ngay % Max HP (không vượt quá Max HP), kèm flash xanh lá quanh player |
| Magnet Orb | Hút TOÀN BỘ Soul đang active trên map (kể cả ngoài camera) — mỗi Soul đuổi theo vị trí player realtime với tốc độ tăng dần (gia tốc, không phải tween cố định) nên tự hội tụ từ nhiều hướng, kèm hiệu ứng ping tại vị trí player lúc kích hoạt (`SoulSystem.collectAllWithMagnet`) |

**Liên kết:** [GAMEPLAY.md](./GAMEPLAY.md), [ENEMIES.md](./ENEMIES.md) (Dark Soul), [UI.md](./UI.md) (toast/popup), [ROADMAP.md](../development/ROADMAP.md)
