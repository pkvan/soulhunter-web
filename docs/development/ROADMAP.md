# Roadmap — Việc chưa làm

*Việc còn thiếu/dự kiến mở rộng, chưa triển khai — để AI biết đâu là việc CÓ THỂ làm tiếp mà không giẫm lên quyết định đã chốt. Việc đã xong xem [TASKS.md](./TASKS.md).*

## Weapon unlock cho 5 vũ khí khởi điểm

Hiện tại cả 5 vũ khí gốc (Sword/Fireball/Ice Shard/Lightning/Boomerang) mở sẵn từ đầu theo phạm vi MVP, chưa gate qua Coin — khác với 2 vũ khí đặc biệt trong `weapons.json` (đã unlock được qua Daily Login Day 7 / Boss Loot Wheel, xem [META_PROGRESSION.md](../gameplay/META_PROGRESSION.md)). Đây là quyết định hoãn có chủ đích (chỉ tập trung Character + Permanent Upgrade trước), không phải thiếu sót.

## Âm thanh — tạm dừng

Đã có 3 file BGM trong `public/assets/audio/`, chưa có `SoundManager` hay code load/phát nào. Việc còn lại:
- Dựng `SoundManager` (load qua `BootScene.preload()`, phát/dừng theo scene)
- Thêm SFX: đánh, trúng đòn, level up, boss
- Xem [ASSET_GUIDE.md](../assets/ASSET_GUIDE.md) để biết trạng thái asset hiện có

## Art thật

Toàn bộ đang dùng placeholder màu sắc (tint/Graphics). Cần thay bằng pixel art 32x32 (tilemap/background thật) — xem định hướng trong [ASSET_GUIDE.md](../assets/ASSET_GUIDE.md).

## Số liệu cần chỉnh trước release

- Mốc Achievement hiện để 10/50/100 quái (dễ test) — số liệu thật dự kiến 100/1000/10000, xem [META_PROGRESSION.md](../gameplay/META_PROGRESSION.md#achievement).

## Mở rộng đã ghi nhận trong thiết kế gốc (chưa lên lịch)

- Thêm Character: Knight, Mage, Archer, Assassin (khởi điểm mới có 1 nhân vật) — xem [META_PROGRESSION.md](../gameplay/META_PROGRESSION.md#character).
- Trọng số spawn quái đổi theo thời gian sống (đầu game nhiều quái yếu, cuối game nhiều quái mạnh) — hiện `SpawnSystem.pickEnemyDef()` chọn ngẫu nhiên đều.

**Liên kết:** [TASKS.md](./TASKS.md), [CLAUDE.md](../../CLAUDE.md)
