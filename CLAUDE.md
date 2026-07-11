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

Đây là scaffold khởi tạo — các file trong `scenes/`, `entities/`, `systems/` mới chỉ có class rỗng + TODO comment mô tả trách nhiệm. Thứ tự triển khai đề xuất (bám theo MVP trong GDD):

1. `BootScene` load asset tạm (placeholder sprite) → `GameScene` render player di chuyển bằng WASD
2. `PoolManager` + `SpawnSystem` spawn Slime cơ bản, va chạm gây damage
3. `WeaponSystem` với Sword (melee) auto-attack
4. `SoulSystem` rơi Soul, nhặt, tính EXP, level up trigger event
5. `UpgradeSystem` + `LevelUpScene` hiện 3 lựa chọn từ `upgrades.json`
6. Thêm 4 vũ khí còn lại + 4 loại quái còn lại
7. `FusionSystem` — chỉ làm sau khi core loop ổn định
8. Boss, meta progression (Coin, Unlock), âm thanh

Không làm bước sau khi bước trước chưa chạy ổn định — tránh code system phức tạp (fusion, boss AI) trên nền core loop chưa test kỹ.
