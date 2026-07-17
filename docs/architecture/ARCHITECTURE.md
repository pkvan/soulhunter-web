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
│   ├── BootScene.ts        # load sprite nhân vật đang chọn (CharacterSpriteLoader) + texture placeholder chung → MenuScene
│   ├── MenuScene.ts        # màn chọn nhân vật / start / Daily Challenge / Daily Login
│   ├── UnlockScene.ts      # tab Nhân vật + Permanent Upgrade (mua bằng Coin)
│   ├── GameScene.ts        # scene chính, chứa gameplay loop — `init()`/`preload()` tự load lại sprite nếu đổi nhân vật giữa phiên (xem mục "Sprite nhân vật động")
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
├── utils/                  # EventBus, SaveData (localStorage), CoinFormula, CharacterSpriteLoader (load sprite Run/Attack/projectile theo characterId)
└── types/                  # TypeScript interface/type dùng chung
```

## Sprite nhân vật động theo characterId

`utils/CharacterSpriteLoader.ts` — hàm `loadCharacterSprites(scene, characterId)` load đúng bộ sprite Run/Attack + texture projectile riêng (nếu vũ khí khởi điểm nhân vật đó cần) cho 1 `characterId`, gọi từ cả `BootScene.preload()` (nhân vật đang chọn lúc khởi động app, đọc qua `getSelectedCharacterId()`) VÀ `GameScene.preload()` (đọc qua `init(data)` vì Phaser KHÔNG truyền `data` vào `preload()` trực tiếp — phải lưu tạm ở field instance) — đảm bảo đổi nhân vật giữa phiên (không reload trang) vẫn load đúng, tự bỏ qua nếu texture đã có sẵn trong cache.

- **Texture key namespace theo characterId**: `run_<characterId>_<dir>` / `attack_<characterId>_<dir>` (KHÔNG dùng key chung `run_<dir>`) — nhiều nhân vật cùng tồn tại trong `TextureManager` song song mà không đè lên nhau. `Player.ts` tự build key động qua `this.characterId`, không hardcode tên nhân vật nào trong code.
- **Bảng map characterId → thư mục asset KHÔNG suy diễn bằng string template** — tên thư mục thật KHÔNG khớp `characterId` trong nhiều trường hợp đã xác nhận: `hunter` (Soul Hunter, vũ khí Bow) dùng art nằm trong thư mục `archer/` (khác nhân vật roster riêng `archer`, id khác, vũ khí Ice Shard, chưa có asset); `assassin` (2 chữ "s") có thư mục đặt tên thiếu 1 chữ "s" thành `assasin`; `archer` dùng prefix file `attack1_<dir>.png` còn các nhân vật khác dùng `attack_<dir>.png` (không có "1"); `mage` chưa có subfolder `run/`/`attack/` riêng, file nằm thẳng trong `player/mage/`. Khai báo tường minh từng nhân vật trong `CHARACTER_SPRITES`, không dùng công thức chung.
- **Trạng thái asset từng nhân vật** (đúng thời điểm viết doc này — xem [ASSET_GUIDE.md](../assets/ASSET_GUIDE.md) để cập nhật khi có thêm asset mới):

  | characterId | Run | Attack | Ghi chú |
  |---|---|---|---|
  | `hunter` (thư mục `archer/`) | ✅ | ✅ | Đủ, vũ khí Bow đồng bộ frame nhả dây — xem [WEAPONS.md](../gameplay/WEAPONS.md) |
  | `knight` | ✅ | ✅ | Đủ, chưa tích hợp vũ khí riêng ngoài Sword mặc định |
  | `assassin` (thư mục `assasin/`) | ❌ (thư mục rỗng) | ✅ | Đã có Triple Throw — xem [WEAPONS.md](../gameplay/WEAPONS.md) |
  | `mage` | ❌ | ✅ | Vũ khí vẫn Fireball mặc định |
  | `archer` (roster riêng, khác `hunter`) | ❌ | ❌ | Chưa có asset nào, fallback placeholder toàn bộ |

- **Fallback khi thiếu asset — không crash, không im lặng mất tác dụng vũ khí**:
  - Thiếu Run: đứng yên/di chuyển ưu tiên đứng yên ở **frame đầu Attack** (hình nhân vật thật, nếu có) thay vì rơi về `player_placeholder` (ô vuông màu, chỉ dùng khi KHÔNG có cả Run lẫn Attack) — xem gotcha "Chớp nháy animation" bên dưới, đây chính là nguyên nhân bug đã fix.
  - Thiếu Attack: `Player.playAttackAnimation()` không có animation để chạy nhưng vẫn phải gọi `onRelease()` NGAY (nếu WeaponSystem truyền vào, vd Bow) — vũ khí không được vì thiếu sprite mà mất tác dụng.
  - `console.warn` rõ ràng nhân vật nào thiếu Run/Attack, `console.log` path cuối cùng trước mỗi lần `load()` — xem trực tiếp Console khi nghi ngờ asset không load đúng.

## Gotcha kỹ thuật đã gặp

- **Clock tuyệt đối vs delta có chặn trần**: `scene.time.now` có thể nhảy vọt hàng chục giây trong 1 frame nếu tab bị trình duyệt tạm ẩn/throttle. Mọi mốc thời gian trong ván (spawn boss, ramp độ khó...) phải dùng thời gian cộng dồn từ delta đã chặn trần mỗi frame (xem `GameScene.elapsedPlayMs`, `MAX_FRAME_DELTA_MS`), không dùng clock tuyệt đối.
- **`time.timeScale` không ảnh hưởng `this.tweens`/Camera FX**: `scene.time.timeScale` và `physics.world.timeScale` là 2 timeScale độc lập, chỉ ảnh hưởng Scene Clock (`scene.time.delayedCall`) và Arcade Physics. `TweenManager` (`this.tweens`) và Camera FX (`pan`, `zoomTo`, `fadeOut`) chạy theo delta thô, KHÔNG bị ảnh hưởng. Hệ quả: nếu đã hạ `time.timeScale` để làm slow-motion, mọi `scene.time.delayedCall()` lên lịch sau đó sẽ bị kéo dài sai theo timeScale — dùng `setTimeout()` thuần JavaScript cho các mốc chờ cần đúng thời gian thật bất kể timeScale (xem cutscene Final Boss trong [BOSSES.md](../gameplay/BOSSES.md)).
- **EventBus sống độc lập với vòng đời Scene**: listener đăng ký qua `EventBus.on()` trong `create()` của 1 Scene vẫn còn active sau khi `scene.stop()` — guard bằng `this.scene.isActive()` trước khi xử lý event, hoặc `EventBus.off()` trước khi `on()` lại để tránh đăng ký trùng.
- **Object pooling dùng "sprite dùng chung nhiều loại"**: 1 sprite Enemy trong pool được tái sử dụng cho nhiều loại quái khác nhau qua các lần spawn — khi cần lọc theo đặc điểm riêng (vd Ghost xuyên tường), phải đọc `sprite.getData("enemyInstance")` trong `processCallback` của collider thay vì so sánh theo group cố định.
- **Phaser `animationupdate` KHÔNG có biến thể theo key** (khác `animationcomplete`): `AnimationState.emitEvents()` chỉ emit thêm event có key riêng (`animationcomplete-<key>`) khi được gọi VỚI tham số `keyEvent` — chỉ `ANIMATION_COMPLETE` truyền tham số này, `ANIMATION_UPDATE` thì KHÔNG (đã verify trực tiếp trong source `AnimationState.js`). Muốn biết chính xác frame nào đang active của 1 animation cụ thể (vd đồng bộ frame nhả dây cung của Bow — xem [WEAPONS.md](../gameplay/WEAPONS.md)), phải lắng nghe event `animationupdate` DÙNG CHUNG rồi tự lọc `anim.key === key`, không được viết `sprite.on('animationupdate-' + key, ...)` (không bao giờ fire).
- **Chớp nháy animation khi gọi lại `setTexture()`/`anims.play()` mỗi frame dù state không đổi**: `Player.updateMovementAnimation()` trước đây (fallback khi nhân vật chưa có sprite Run) luôn set về `player_placeholder` mỗi khi đứng yên, kể cả khi đã ở trạng thái đó — với nhân vật vừa có Attack tự bắn theo cooldown (vd Assassin/Triple Throw) tạo hiện tượng chớp qua lại giữa hình Attack thật và ô vuông placeholder mỗi chu kỳ cooldown. Fix bằng state tracking tường minh `lastDirection`/`lastMovementState` (`null` = "vừa hết Attack1, ép áp lại animation 1 lần" — set ở `animationcomplete` callback) — chỉ gọi `setTexture()`/`anims.play()` khi hướng HOẶC trạng thái di chuyển thực sự đổi so với lần trước.

**Liên kết:** [CODING_RULES.md](../development/CODING_RULES.md), [TASKS.md](../development/TASKS.md), [CLAUDE.md](../../CLAUDE.md)
