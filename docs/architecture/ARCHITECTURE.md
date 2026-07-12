# Architecture

*Cấu trúc thư mục, trách nhiệm từng phần, gotcha kỹ thuật. Stack công nghệ: xem [CLAUDE.md](../../CLAUDE.md). Quy tắc viết code: xem [CODING_RULES.md](../development/CODING_RULES.md).*

## Lệnh thường dùng

```bash
npm install       # cài dependency
npm run dev       # chạy dev server (localhost:5173)
npm run build     # build production
npm run typecheck # kiểm tra type, chạy trước khi commit
npm run lint      # eslint
```

## Cấu trúc thư mục

```
src/
├── main.ts               # entry point, khởi tạo Phaser.Game
├── config/GameConfig.ts  # cấu hình Phaser + hằng số gameplay dùng chung (GAMEPLAY)
├── scenes/                # mỗi file 1 Phaser.Scene
│   ├── BootScene.ts        # load asset placeholder → MenuScene
│   ├── MenuScene.ts        # màn chọn nhân vật / start / Daily Challenge / Daily Login
│   ├── UnlockScene.ts      # tab Nhân vật + Permanent Upgrade (mua bằng Coin)
│   ├── GameScene.ts        # scene chính, chứa gameplay loop
│   ├── LevelUpScene.ts     # overlay chọn 1/3 upgrade khi lên cấp (song song GameScene, pause physics)
│   ├── PauseScene.ts       # overlay Pause — chi tiết UI xem docs/gameplay/UI.md
│   ├── BossLootScene.ts    # overlay vòng xoay chiến lợi phẩm sau khi nhặt Loot Chest
│   └── GameOverScene.ts    # màn kết quả (Survival time, Kills, Coin, banner chiến thắng nếu victory)
├── entities/               # class GameObject: Player, Enemy, Boss, Projectile, Pickup, LootChest
├── systems/                # logic thuần, KHÔNG kế thừa Phaser.GameObject — xem CODING_RULES.md
│   ├── SpawnSystem.ts        # spawn quái theo thời gian sống, độ khó tăng dần
│   ├── WeaponSystem.ts       # auto-attack: tìm target, bắn theo cooldown, on-hit effect
│   ├── CombatSystem.ts       # va chạm Enemy ↔ Player
│   ├── UpgradeSystem.ts      # áp dụng stat upgrade, random 3 lựa chọn khi level up
│   ├── FusionSystem.ts       # kiểm tra điều kiện fusion, thực hiện hợp nhất
│   ├── BossSystem.ts         # vòng đời Boss, va chạm Boss ↔ Player, đọc cờ pending* của skill
│   ├── PickupSystem.ts       # roll/spawn/nhặt Heal Potion, Magnet Orb
│   ├── SoulSystem.ts         # rơi Soul, nhặt Soul (magnet), tính EXP
│   └── PoolManager.ts        # object pool cho Enemy/Projectile/Pickup — BẮT BUỘC dùng, xem CODING_RULES.md
├── data/                   # dữ liệu game dạng JSON, KHÔNG hardcode trong code — xem CODING_RULES.md
│                             (weapons/upgrades/fusions/enemies/bosses/characters/achievements/... — xem trực tiếp thư mục)
├── ui/                     # HUD, DamageNumber, LevelUpCard — chi tiết xem docs/gameplay/UI.md
├── utils/                  # EventBus, SaveData (localStorage), CoinFormula
└── types/                  # TypeScript interface/type dùng chung
```

## Gotcha kỹ thuật đã gặp

- **Clock tuyệt đối vs delta có chặn trần**: `scene.time.now` có thể nhảy vọt hàng chục giây trong 1 frame nếu tab bị trình duyệt tạm ẩn/throttle. Mọi mốc thời gian trong ván (spawn boss, ramp độ khó...) phải dùng thời gian cộng dồn từ delta đã chặn trần mỗi frame (xem `GameScene.elapsedPlayMs`, `MAX_FRAME_DELTA_MS`), không dùng clock tuyệt đối.
- **`time.timeScale` không ảnh hưởng `this.tweens`/Camera FX**: `scene.time.timeScale` và `physics.world.timeScale` là 2 timeScale độc lập, chỉ ảnh hưởng Scene Clock (`scene.time.delayedCall`) và Arcade Physics. `TweenManager` (`this.tweens`) và Camera FX (`pan`, `zoomTo`, `fadeOut`) chạy theo delta thô, KHÔNG bị ảnh hưởng. Hệ quả: nếu đã hạ `time.timeScale` để làm slow-motion, mọi `scene.time.delayedCall()` lên lịch sau đó sẽ bị kéo dài sai theo timeScale — dùng `setTimeout()` thuần JavaScript cho các mốc chờ cần đúng thời gian thật bất kể timeScale (xem cutscene Final Boss trong [BOSSES.md](../gameplay/BOSSES.md)).
- **EventBus sống độc lập với vòng đời Scene**: listener đăng ký qua `EventBus.on()` trong `create()` của 1 Scene vẫn còn active sau khi `scene.stop()` — guard bằng `this.scene.isActive()` trước khi xử lý event, hoặc `EventBus.off()` trước khi `on()` lại để tránh đăng ký trùng.
- **Object pooling dùng "sprite dùng chung nhiều loại"**: 1 sprite Enemy trong pool được tái sử dụng cho nhiều loại quái khác nhau qua các lần spawn — khi cần lọc theo đặc điểm riêng (vd Ghost xuyên tường), phải đọc `sprite.getData("enemyInstance")` trong `processCallback` của collider thay vì so sánh theo group cố định.

**Liên kết:** [CODING_RULES.md](../development/CODING_RULES.md), [TASKS.md](../development/TASKS.md), [CLAUDE.md](../../CLAUDE.md)
