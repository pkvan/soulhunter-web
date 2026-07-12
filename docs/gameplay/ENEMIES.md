# Enemy

*Quái thường + Elite Enemy/Dark Soul. Boss xem [BOSSES.md](./BOSSES.md). Số liệu thật: `src/data/enemies.json`, `elite.json`, `soulCorruption.json`.*

## 5 loại quái

| Quái | Đặc điểm |
|---|---|
| Slime | Máu ít |
| Skeleton | Bình thường |
| Ghost | Đi xuyên vật cản (`flag: "phasing"`), né 40% đòn melee |
| Orc | Máu nhiều |
| Bat | Bay nhanh, di chuyển zigzag |

Mỗi loại phân biệt bằng màu (tint) riêng qua `tintColor` trong `enemies.json`. Ghost là loại quái duy nhất xuyên qua Wall — xem [MAP.md](./MAP.md).

## Elite Enemy & Dark Soul (Soul Corruption)

Mở rộng biến số cho quái thường: khi spawn, có % (tăng theo độ khó — `difficultyMultiplier`) để 1 quái trở thành **Elite** — HP x3, scale 1.3, glow cam theo sau mỗi frame.

- Elite chết có % rơi **Dark Soul** thay Soul thường (to hơn, màu tím, pulse), luôn thưởng thêm Coin bonus cuối ván.
- Nhặt Dark Soul kích hoạt buff tạm thời cho player: `damageMultiplier` +50% trong 10 giây, đồng thời `SpawnSystem` tăng tốc độ spawn quái trong cùng khoảng thời gian (`activateCorruption()`). Hiển thị qua progress bar countdown phía trên đầu + glow tím quanh player (bám vị trí player mỗi frame) trong `HUD.ts`.
- Buff không cộng chồng nếu nhặt thêm Dark Soul khi đang active — chỉ gia hạn thời gian.

**Liên kết:** [BOSSES.md](./BOSSES.md), [WEAPONS.md](./WEAPONS.md), [MAP.md](./MAP.md), [UI.md](./UI.md)
