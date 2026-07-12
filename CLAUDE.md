# CLAUDE.md — context cho AI Agent

File này giúp AI Agent (Claude Code hoặc agent khác) hiểu nhanh dự án khi bắt đầu phiên làm việc mới. Đọc file này trước, sau đó đọc `docs/GDD.md` nếu cần chi tiết thiết kế game.

## Tổng quan dự án

SoulHunter — game roguelite survival top-down 2D, thể loại kiểu Vampire Survivors nhưng có cơ chế **Fusion Upgrade** làm điểm khác biệt (xem `docs/GDD.md` mục 6). Một ván kéo dài 10–15 phút.

**Stack**: Phaser 3 + TypeScript + Vite. Không dùng framework UI ngoài (React/Vue) — UI trong game (HUD, level-up card) dựng bằng Phaser GameObjects hoặc DOM overlay tối giản, xem `src/ui/`.

## Lệnh thường dùng

```bash
npm install       # cài dependency
npm run dev       # chạy dev server (localhost:5173)
npm run build     # build production
npm run typecheck # kiểm tra type, chạy trước khi commit
npm run lint      # eslint
```

## Cấu trúc thư mục và trách nhiệm

```
src/
├── main.ts              # entry point, khởi tạo Phaser.Game
├── config/
│   └── GameConfig.ts     # cấu hình Phaser (resolution, physics, scene list)
├── scenes/                # mỗi file 1 Phaser.Scene
│   ├── BootScene.ts       # load asset, sau đó chuyển MenuScene
│   ├── MenuScene.ts       # màn chọn nhân vật / start
│   ├── GameScene.ts       # scene chính, chứa gameplay loop
│   ├── LevelUpScene.ts    # overlay chọn 1/3 upgrade khi lên cấp (chạy song song GameScene, pause physics)
│   └── GameOverScene.ts   # màn kết quả (Survival time, Kills, Coin...)
├── entities/               # class GameObject: Player, Enemy, Boss, Projectile
├── systems/                 # logic thuần, KHÔNG kế thừa Phaser.GameObject
│   ├── SpawnSystem.ts      # spawn quái theo thời gian sống, độ khó tăng dần
│   ├── WeaponSystem.ts     # auto-attack: tìm target, bắn theo cooldown từng vũ khí
│   ├── UpgradeSystem.ts    # áp dụng stat upgrade, random 3 lựa chọn khi level up
│   ├── FusionSystem.ts     # kiểm tra điều kiện fusion, thực hiện hợp nhất (xem GDD mục 6)
│   ├── PoolManager.ts      # object pool cho projectile/enemy — BẮT BUỘC dùng, không Instantiate trực tiếp
│   └── SoulSystem.ts       # rơi Soul, nhặt Soul (magnet), tính EXP
├── data/                    # dữ liệu game dạng JSON, KHÔNG hardcode trong code
│   ├── weapons.json
│   ├── upgrades.json
│   ├── fusions.json
│   ├── enemies.json
│   └── characters.json
├── ui/                      # HUD, DamageNumber, LevelUpCard (component hiển thị)
├── utils/                   # hàm tiện ích thuần (MathUtils, EventBus)
└── types/                   # TypeScript interface/type dùng chung
```

## Quy ước code

- **Không hardcode số liệu game** (damage, HP, cooldown...) trong class — luôn đọc từ file JSON trong `src/data/`. Muốn balance lại chỉ sửa JSON, không sửa code.
- **Object pooling bắt buộc** cho Enemy và Projectile — dùng `PoolManager`, không `new Enemy()` hay `scene.add.sprite()` trực tiếp trong vòng lặp spawn. Đây là điểm dễ gây lag nhất nếu bỏ qua.
- **Systems tách khỏi Scenes**: logic nghiệp vụ (tính damage, check fusion, spawn logic) đặt trong `src/systems/`, không viết thẳng trong `GameScene.ts`. Scene chỉ gọi system và xử lý vòng đời Phaser.
- **EventBus** (`src/utils/EventBus.ts`) dùng để giao tiếp giữa Scene và UI overlay (ví dụ: GameScene bắn event `LEVEL_UP` → LevelUpScene lắng nghe và hiện 3 lựa chọn) — tránh coupling trực tiếp giữa các scene.
- Đặt tên file/class theo PascalCase, biến/hàm camelCase, hằng số UPPER_SNAKE_CASE.
- Mỗi entity/system nên có 1 file test tương ứng nếu thêm logic phức tạp (chưa setup test runner — dùng `vitest` nếu cần, hỏi trước khi thêm dependency mới).

## Nguồn dữ liệu thiết kế

Toàn bộ nội dung game (danh sách vũ khí, 20 upgrade, 15 công thức fusion, 5 loại quái, boss, tiến trình meta) nằm trong `docs/GDD.md`. Khi cần thêm nội dung mới (vũ khí, upgrade...), luôn đối chiếu với GDD trước, và cập nhật GDD nếu quyết định thay đổi thiết kế.

## Trạng thái hiện tại / việc cần làm

**MVP core loop đã hoàn thành.** Thứ tự triển khai (bám theo MVP trong GDD):

- [x] `BootScene` load asset tạm (placeholder sprite) → `GameScene` render player di chuyển bằng WASD (mượt, có chuẩn hóa vận tốc chéo + camera lerp)
- [x] `PoolManager` + `SpawnSystem` spawn quái, Enemy va chạm Player gây damage → Game Over khi HP về 0
- [x] `WeaponSystem` với Sword (melee) auto-attack, vòng đánh bám theo player mỗi frame (không lệch khi di chuyển)
- [x] Đủ 5 vũ khí (Sword/Fireball/Ice Shard/Lightning/Boomerang), mỗi loại có visual placeholder phân biệt màu/hình riêng
- [x] 5 loại quái phân biệt màu (tint) + hành vi riêng (Ghost né 40% đòn melee, Bat bay zigzag) — riêng phần "phasing xuyên vật cản" theo `flag` còn TODO nhưng chưa cần thiết vì game chưa có obstacle/terrain
- [x] `SoulSystem` rơi Soul, nhặt, tính EXP, level up trigger event + hiển thị progress bar (Soul/Level) trên HUD
- [x] `UpgradeSystem` gắn vào `LevelUpScene`: hiện 3 lựa chọn (vũ khí mới / nâng cấp level vũ khí / stat upgrade)
- [x] `FusionSystem` — đủ 15 công thức, mỗi fusion có bảng hành vi riêng (chain lightning, slow/stun, DOT, lifesteal, AoE) trong `fusionWeapons.json`
- [x] 2 Boss data-driven (`bosses.json` + `bossSkills.json`): Giant Skeleton (Dash/Summon/Ground Slam) và Orc Warlord (Charge/Roar/Ground Slam) — mỗi boss có skill riêng, banner "XUẤT HIỆN" (scale-in + screen shake), HP bar màu riêng trên HUD, chỉ kết thúc ván khi hạ boss cuối cùng
- [x] Balance đầu game: giảm HP quái/boss để giết nhanh đầu game, spawn rate tăng dần theo `difficultyMultiplier`, độ khó ramp phi tuyến (chậm 5 phút đầu, nhanh dần về cuối)
- [x] Fix bug boss xuất hiện ngay đầu game: nguyên nhân là timer spawn dùng clock tuyệt đối của Phaser (`scene.time.now`) — clock này có thể nhảy vọt hàng chục giây trong 1 frame nếu tab bị trình duyệt tạm ẩn/throttle, khiến điều kiện thời gian bị thỏa mãn tức thì. Đã đổi sang cộng dồn delta có chặn trần mỗi frame (`elapsedPlayMs`) để đo đúng thời gian chơi thực tế.
- [x] **Meta progression giai đoạn 1 (GDD mục 13)**: hệ thống Coin hoàn chỉnh — track Highest Combo trong ván (`GameScene`), công thức tính Coin cuối ván tách riêng (`utils/CoinFormula.ts`), `GameOverScene` hiển thị đầy đủ Survival/Kills/Highest Combo/Coin theo format GDD mục 12, cộng dồn Coin vào `localStorage` (`utils/SaveData.ts`)
- [x] `UnlockScene` mới: tab Nhân vật (đọc `characters.json`, mở khóa bằng Coin, chọn nhân vật dùng cho ván tiếp theo) + tab Permanent Upgrade (+2% Damage / +5 HP / +1% Critical, mua nhiều lần giá tăng dần, đọc/ghi `permanentUpgrades.json`) — `MenuScene` đọc nhân vật đã chọn và Permanent Upgrade đã mua được cộng vào stat gốc của Player mỗi ván lúc khởi tạo
- [x] Persistent qua `localStorage` cho Coin tích lũy, nhân vật đã unlock, nhân vật đang chọn, số lần mua từng Permanent Upgrade (xem `utils/SaveData.ts`)
- [x] **Achievement (GDD mục 15)**: 3 mốc giết quái tích lũy qua mọi ván (`data/achievements.json`) — hiện tại đang để 10/50/100 quái để dễ test (không phải 100/1000/10000 như dự tính ban đầu trong GDD, cần chỉnh lại số liệu thật trước khi release), mỗi mốc thưởng Coin 1 lần, track tổng kills qua `soulhunter_total_kills`, tự kiểm tra + hiện toast "Achievement Unlocked" ở `GameOverScene`, tiến độ hiện ở `MenuScene`
- [x] **Daily Challenge (GDD mục 15)**: `data/dailyChallenges.json` — chọn 1 challenge cố định theo ngày thực tế (hash `toDateString()`, mọi người cùng ngày thấy cùng challenge), modifier Enemy HP / Player Damage / Coin reward áp dụng vào `SpawnSystem`/`Player`/`GameScene.computeCoinEarned`, mô tả + nút chơi riêng ở `MenuScene`, chơi lại thoải mái trong ngày nhưng chỉ nhận thưởng Coin nhân hệ số 1 lần/ngày (`soulhunter_daily_challenge_claim`)
- [x] **PickupSystem (GDD mục 18)**: `data/pickups.json` + `entities/Pickup.ts` (pool riêng qua `PoolManager`, roll spawn ~15-20s gần player trong tầm nhìn, tự fade-out sau ~10s nếu không nhặt) — Heal Potion hồi % Max HP kèm flash xanh lá quanh player; Magnet Orb hút TOÀN BỘ Soul đang active trên map (kể cả ngoài camera), mỗi Soul đuổi theo vị trí player realtime với tốc độ tăng dần (acceleration, không phải velocity/tween cố định) nên tự hội tụ từ nhiều hướng, kèm hiệu ứng ping tại vị trí player lúc kích hoạt (`SoulSystem.collectAllWithMagnet`)
- [x] **Elite Enemy + Dark Soul / Soul Corruption (mở rộng GDD mục 18)**: `data/elite.json` + `data/soulCorruption.json` — % Elite khi spawn (tăng theo `difficultyMultiplier`), HP x3 + scale 1.3 + glow cam theo sau mỗi frame (`Enemy.ts`); Elite chết có % rơi Dark Soul (to hơn, màu tím, pulse) thay Soul thường, luôn thưởng thêm Coin (`bonusCoinFromElites`); nhặt Dark Soul kích hoạt buff `damageMultiplier` +50%/10s + spawn quái dồn dập hơn (`SpawnSystem.activateCorruption`), hiển thị qua progress bar countdown phía trên đầu + glow tím quanh player (bám vị trí player mỗi frame, không cố định) trong `HUD.ts`
- [x] **Player damage feedback**: `Player.takeDamage()` — flash đỏ nhanh (setTint/clearTint ~100ms), screen shake theo mức damage (bỏ qua damage nhỏ lẻ <2% Max HP tránh rung liên tục do DOT, shake mạnh hơn nếu đòn >15% Max HP)
- [x] **Max Level cap**: `GAMEPLAY.MAX_LEVEL = 30` — `Player.gainSoul()` chặn lên cấp thêm khi đạt mốc, soul dư quy đổi 1:1 vào `bonusCoinFromOverflowSoul` (cộng vào Coin cuối ván qua `GameScene.computeCoinEarned`, không lãng phí tiến trình sau khi max), HUD đổi soul bar thành "MAX LEVEL" cố định màu vàng thay vì hiện %
- [x] **Balance Permanent Upgrade**: Damage +2%→+4%/lần, thêm giới hạn `maxPurchases` (Damage 20 / HP 15 / Critical 10 lần, tối đa +80% Damage vĩnh viễn) — `UnlockScene` disable nút mua + hiện icon check "MAX" khi đạt giới hạn, tránh vỡ balance khi Coin tích lũy nhiều về sau
- [x] **Pause Menu icon-based**: `scenes/PauseScene.ts` — toàn bộ nút Pause/Resume/Restart/Home vẽ icon bằng Graphics (không dùng text button), tối thiểu 48px đường kính kèm hover/press state; tray loadout dùng lại `getCardStyle()` export từ `LevelUpCard.ts` để LUÔN đồng bộ màu (fusion viền coral, vũ khí nâng cấp viền xanh lá, stat upgrade trung tính) thay vì bảng màu riêng, gom nhóm theo id + badge số lượng/level góc trên-phải, grid wrap nhiều cột + giới hạn chiều cao qua Geometry Mask + cuộn bằng wheel khi vượt quá; Home mở confirm dialog (icon check/x) — xác nhận thoát giữa ván KHÔNG cộng Coin, chỉ `GameOverScene` khi ván kết thúc tự nhiên mới cộng; Restart giữ nguyên `characterId` + Daily Challenge đang chơi
- [x] **Wall obstacles (GDD mục 9)**: rải ~14 cụm static physics body quanh khu vực player xuất phát (`GameScene.spawnWalls()`), đủ thưa để không cản trở gameplay chính — Player và mọi Enemy va chạm (chặn đường đi) qua Arcade `collider`, TRỪ Ghost (`def.flag === "phasing"`, lọc qua `processCallback` đọc `sprite.getData("enemyInstance")` vì cùng 1 pool sprite được tái sử dụng cho nhiều loại quái)
- [x] **Shrapnel upgrade (mở rộng GDD mục 5/19)**: upgrade mới trong `upgrades.json`, `appliesTo: ["fireball","ice_shard"]` (đổi `appliesTo` từ string đơn sang hỗ trợ mảng trong `types/index.ts`) — khi trúng quái, tự bắn thêm `shrapnelCount + 1` tia phụ dàn đều quanh 1 hướng ngẫu nhiên, damage giảm 50%, stackable (2→3→4...); chặn đệ quy bằng cờ `Projectile.isShrapnel` (tia phụ trúng không tự bắn thêm tia phụ) — xem `WeaponSystem.spawnShrapnel()`
- [x] **Ice Shard baseline slow + Fireball baseline burn (GDD mục 19)**: Ice Shard làm chậm 30%/2s mọi lần trúng đòn (data-driven `slowFactor`/`slowDurationMs` trong `weapons.json`, tái dùng logic slow sẵn có của fusion weapon); Fireball gây DOT ~20% damage gốc/giây trong 3s (field mới `dotDamageRatio` — tỉ lệ theo damage thực tế thay vì số flat như `dotDamage` cũ, xem `WeaponSystem.applyOnHitEffects`); `freeze_chance` upgrade giữ vai trò riêng biệt — % đóng băng HẲN (factor 1) đè lên slow baseline; `burn` upgrade đổi ý nghĩa thành cộng dồn thêm % damage/giây vào DOT baseline của Fireball thay vì tạo hiệu ứng riêng
- [x] **Sword đổi thành vũ khí tank + Boomerang tăng tầm (GDD mục 4/19)**: Sword giảm baseDamage 10→6 (-40%), đổi lại +30 Max HP khi còn trong `equippedWeapons` (`Player.syncSwordHpBonus()`, gọi lại khi thêm vũ khí mới hoặc khi Sword bị fusion "nuốt" mất để cộng/trừ đúng lúc); Boomerang `maxDistance` chuyển từ hằng số dùng chung trong `Projectile.ts` sang field data-driven riêng theo vũ khí, tăng 300→480px
- [x] **Boss Loot Chest cho boss thường (mở rộng GDD mục 8)**: mọi boss KHÔNG phải Final Boss (`isFinalBoss !== true` trong `bosses.json`, vd Giant Skeleton) chết đều rơi rương 100% tại đúng vị trí vừa chết (`entities/LootChest.ts`, glow vàng gold pulse liên tục để dễ nhận biết) — KHÔNG tự hút theo Magnet như Soul, player phải chủ động đi tới va chạm mới trigger vòng xoay may mắn (`scenes/BossLootScene.ts`, đọc trọng số từ `data/bossLootWheel.json`); vòng xoay có kim chỉ (needle) cố định ở đỉnh vòng tròn, chỉ vòng quay xoay quanh tâm bên dưới kim — roll kết quả theo trọng số TRƯỚC, rồi mới tính góc dừng khớp đúng ô đã roll (không phải random góc dừng rồi suy ngược kết quả); mỗi boss thường nhặt xong chỉ nhận thưởng rồi chơi tiếp, không kết thúc ván
- [x] **Final Boss death sequence (mở rộng GDD mục 8)**: field `isFinalBoss: true` trong `bosses.json` (hiện tại là Orc Warlord) — chết đi thẳng cutscene chiến thắng thay vì rơi Loot Chest, chạy TUẦN TỰ 3 bước bằng `setTimeout()` thuần JavaScript (không dùng `scene.time.delayedCall`, tránh bị chính `timeScale` đã hạ xuống làm sai lệch thời gian chờ): (1) `Boss.stopForDeathCutscene()` dừng tuyệt đối ngay khi chết — velocity 0, tắt hẳn physics body, huỷ mọi tween cũ, cờ `isDying` chặn `update()` — rồi camera `pan()` 0.5s tới đúng vị trí boss, không đổi zoom; (2) `time.timeScale`/`physics.world.timeScale` hạ xuống 0.06 (gần đứng hình) trong đúng 3 giây thật, boss tan biến alpha 1→0 tuyến tính (`this.tweens` không phụ thuộc `time.timeScale`) kèm hiệu ứng bọt khí (Graphics tròn, spawn liên tục quanh boss); (3) trả `timeScale` về 1, `camera.fadeOut` rồi chuyển `GameOverScene` với `victory: true` — có `console.log` timestamp `Date.now()` ở mỗi bước để xác nhận đúng timing thật khi cần debug lại
- [x] **Daily Login Reward 7 ngày (mở rộng GDD mục 13)**: `data/dailyRewards.json` — streak tính bằng `SaveData.checkAndAdvanceLoginStreak()` lúc `MenuScene.create()` (so `lastLoginDate` với hôm nay: liên tục +1 ngày, quay về 1 sau ngày 7; bỏ lỡ >1 ngày thì reset về 1), popup hiện 7 ô (ô đã qua có dấu check, ô hôm nay highlight, ô 7 có icon ★ riêng biệt) kèm nút "Nhận thưởng"; Day 4 tặng 1 Permanent Upgrade Token (mua Permanent Upgrade miễn phí ở `UnlockScene`, trừ token thay Coin), Day 7 mở khóa NGAY 1 vũ khí đặc biệt (`weapons.json` field `locked: true`, ưu tiên rẻ nhất trong danh sách chưa mở) — CHỈ áp dụng 1 LẦN DUY NHẤT trong toàn bộ lịch sử chơi (`soulhunter_day7_bonus_claimed`), các lần quay lại Day 7 sau đó vẫn nhận Coin bình thường nhưng không unlock thêm vũ khí nào nữa
- [x] Fix bug: chọn fusion làm mất luôn cả vũ khí KHÔNG liên quan trong công thức — nguyên nhân là debug feature `debugTriggerNextFusion()` (phím F, dùng để test nhanh 15 công thức fusion lúc còn dựng tính năng) vẫn còn active trong build, mỗi lần nhấn F sẽ reset `player.equippedWeapons` về mảng mới chỉ chứa đúng 2 vũ khí của công thức đang test — đã xoá hẳn toàn bộ debug feature này (`FusionSystem.applyFusion()` tự nó luôn đúng, chỉ filter đúng 2 vũ khí trong `fusion.requires`, đã verify qua test trực tiếp)
- [x] Fix bug: màu card (xanh dương "vũ khí mới" / xanh lá "nâng cấp") không đồng bộ giữa `LevelUpScene` lúc chọn và tray loadout trong `PauseScene` — cả 2 nơi đã cùng gọi `getCardStyle()` export từ `LevelUpCard.ts` từ trước, nhưng `PauseScene` hardcode `isNew: false` cho MỌI vũ khí đang equip khiến vũ khí vừa chọn "mới" (level 1) lập tức đổi màu ngay khi mở Pause; sửa thành `isNew: eq.level === 1` để cùng 1 tiêu chí "còn mới" xuyên suốt 2 màn hình
- [ ] Weapon unlock riêng bằng Coin cho 5 vũ khí khởi điểm — hiện tại cả 5 vũ khí gốc (Sword/Fireball/Ice Shard/Lightning/Boomerang) mở sẵn từ đầu theo phạm vi MVP, chưa gate qua Coin (khác với 2 vũ khí đặc biệt trong `weapons.json` chỉ mở qua Daily Login Day7/Boss Loot Wheel — 2 cơ chế đó đã xong)
- [ ] Âm thanh — TẠM DỪNG: đã thêm 3 file BGM vào `public/assets/audio/` (bgm_menu.mp3, bgm_gameplay.ogg, bgm_boss.mp3) nhưng CHƯA có `SoundManager` hay bất kỳ code nào load/phát các file này — game hiện tại vẫn hoàn toàn im lặng. Việc còn lại: dựng `SoundManager` (load qua `BootScene.preload()`, phát/dừng theo scene), thêm SFX đánh/trúng đòn/level up/boss, và asset pixel art thay placeholder màu hiện tại (tilemap/background thật)

Toàn bộ nội dung GDD + các tính năng bổ sung đã implement xong (core loop, 5 vũ khí, 15 fusion, 2 boss + Final Boss death sequence, meta progression Coin/Unlock/Permanent Upgrade, Achievement, Daily Challenge, Daily Login Reward, Pickup ngẫu nhiên, Elite Enemy/Dark Soul, Max Level, Pause Menu, player damage feedback, Wall obstacles, Shrapnel, baseline slow/burn, Sword tank, Boomerang tầm xa hơn, Boss Loot Chest + vòng xoay may mắn), trừ Weapon unlock riêng, Âm thanh (mới có 3 file BGM, chưa có SoundManager/SFX) và Art thật (đang dùng placeholder màu sắc) — Weapon unlock vẫn đang bị hoãn theo quyết định trước đó (chỉ tập trung Character + Permanent Upgrade), Âm thanh đang tạm dừng, các việc còn lại không phụ thuộc nhau.
