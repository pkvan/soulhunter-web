# Tasks — Đã hoàn thành

*Checklist trạng thái, KHÔNG lặp chi tiết kỹ thuật (nằm ở file MODULE_READ tương ứng). Việc chưa làm xem [ROADMAP.md](./ROADMAP.md).*

Phạm vi MVP ban đầu (đã đạt đủ): 1 Character, 1 Map, 5 Enemy, 5 Weapon, 20 Upgrade, 1 Boss, 10 phút gameplay — Fusion thêm sau khi core loop ổn định, không làm song song từ đầu.

## Core loop

- [x] Di chuyển WASD, camera lerp, `PoolManager` + `SpawnSystem`, va chạm Enemy/Player → Game Over — xem [ARCHITECTURE.md](../architecture/ARCHITECTURE.md), [GAMEPLAY.md](../gameplay/GAMEPLAY.md)
- [x] Fix bug boss/timer nhảy cóc do dùng clock tuyệt đối của Phaser — xem gotcha "Clock tuyệt đối" trong [ARCHITECTURE.md](../architecture/ARCHITECTURE.md)

## Combat & nội dung

- [x] 5 vũ khí khởi điểm + baseline slow/burn + Sword tank + Boomerang tầm xa — xem [WEAPONS.md](../gameplay/WEAPONS.md)
- [x] 20+ Upgrade (kể cả Shrapnel) + `UpgradeSystem` — xem [UPGRADE.md](../gameplay/UPGRADE.md)
- [x] 15 công thức Fusion — xem [FUSION.md](../gameplay/FUSION.md)
- [x] 5 loại quái + Elite Enemy/Dark Soul (Soul Corruption) — xem [ENEMIES.md](../gameplay/ENEMIES.md)
- [x] 2 Boss data-driven, Boss Loot Chest (vòng xoay may mắn), Final Boss death sequence — xem [BOSSES.md](../gameplay/BOSSES.md)
- [x] Wall obstacles (Ghost xuyên tường) — xem [MAP.md](../gameplay/MAP.md)
- [x] Player damage feedback (flash/shake), Max Level cap — xem [GAMEPLAY.md](../gameplay/GAMEPLAY.md)

## Meta progression

- [x] Coin, Unlock Character, Permanent Upgrade, Achievement, Daily Challenge, Daily Login Reward 7 ngày, Pickup ngẫu nhiên — xem [META_PROGRESSION.md](../gameplay/META_PROGRESSION.md)

## UI

- [x] Pause Menu icon-based, card style dùng chung `getCardStyle()` — xem [UI.md](../gameplay/UI.md)

## Bug fix đáng chú ý

- [x] Fusion làm mất vũ khí không liên quan — nguyên nhân: debug feature phím F còn sót trong build, reset nhầm `equippedWeapons`. Đã xoá hẳn debug feature; quy tắc phòng tránh xem [CODING_RULES.md](./CODING_RULES.md).
- [x] Màu card lệch giữa `LevelUpScene` và `PauseScene` — nguyên nhân: `PauseScene` hardcode `isNew: false`. Sửa dùng chung `getCardStyle()`, tiêu chí xem [UI.md](../gameplay/UI.md).

## Map Selection & Victory Flow (chưa có module doc riêng — xem [SESSION_SUMMARY.md](./SESSION_SUMMARY.md) mục "Nợ tài liệu")

- [x] Map Selection System (Phase 1): data-driven 10 map, `MapSelectScene` + `MapRenderer` (world-map dạng đảo liên kết), `MapData.ts` — GameScene/SpawnSystem/BossSystem nhận map qua `mapId`, không hardcode
- [x] Victory Flow & Boss Death Cinematic rework: `VictoryController` (Zoom → Slow Motion 25% → Boss tan biến → Restore TimeScale) + `VictoryScene` mới, "Map tiếp theo" đi qua `MapSelectScene` thay vì vào thẳng GameScene
- [x] UX & Gameplay Improvements (Phase 1): Pause hiện tên map, Boss HP dạng `current/max` realtime, Card Selection redesign (Icon/Level/Description đọc từ data), Weapon HUD tray tự render từ `player.equippedWeapons` (`WeaponIcon.ts` dùng chung Card+HUD)

## Đang dở / tạm dừng

- [ ] Weapon unlock bằng Coin cho 5 vũ khí khởi điểm — xem [ROADMAP.md](./ROADMAP.md)
- [ ] Âm thanh (SoundManager + SFX) — xem [ROADMAP.md](./ROADMAP.md)

**Liên kết:** [ROADMAP.md](./ROADMAP.md)
