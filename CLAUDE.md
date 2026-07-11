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
- [ ] **Bước tiếp theo (hậu-MVP, GDD mục 15)**: Achievement (giết 100/1000/10000 quái), Daily Challenge (vd Enemy HP x2 → Damage x2 → Coin x3)
- [ ] Weapon unlock riêng bằng Coin — hiện tại cả 5 vũ khí (Sword/Fireball/Ice Shard/Lightning/Boomerang) mở sẵn từ đầu theo phạm vi MVP, chưa gate qua Coin
- [ ] Âm thanh (SFX đánh/trúng đòn/level up + BGM), tilemap/background thật, asset pixel art thay placeholder màu hiện tại

Không làm bước sau khi bước trước chưa chạy ổn định — MVP + meta progression giai đoạn 1 (Coin/Unlock Character/Permanent Upgrade) đã ổn định, có thể tiếp tục Achievement/Daily Challenge hoặc Weapon unlock.
