# CLAUDE.md — Entry Point

SoulHunter: roguelite survival top-down 2D kiểu Vampire Survivors, điểm khác biệt là cơ chế **Fusion Upgrade**. 1 ván 10–15 phút. Stack: Phaser 3 + TypeScript + Vite, không React/Vue (UI dựng bằng Phaser GameObjects/Graphics). Cấu trúc thư mục + lệnh dev: [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md).

## Quy tắc bắt buộc

Đầy đủ + lý do: [CODING_RULES.md](docs/development/CODING_RULES.md). Tóm tắt: data-driven (JSON trong `src/data/`, không hardcode) • pooling bắt buộc (`PoolManager`) cho Enemy/Projectile/Pickup • Systems tách khỏi Scenes • `EventBus` cho Scene↔UI • 1 nguồn dùng chung cho logic/style lặp lại • không để sót debug feature trong build.

## Danh sách tài liệu

| File | Loại | Nội dung |
|---|---|---|
| [CODING_RULES.md](docs/development/CODING_RULES.md) | ALWAYS_READ | Quy tắc code đầy đủ |
| [TASKS.md](docs/development/TASKS.md) | ALWAYS_READ | Đã hoàn thành — đọc trước khi làm việc mới |
| [SESSION_SUMMARY.md](docs/development/SESSION_SUMMARY.md) | ALWAYS_READ | Nhật ký ngắn phiên gần nhất — đọc ngay sau CLAUDE.md mỗi phiên/mỗi lần `/compact` |
| [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) | MODULE_READ | Stack, thư mục, gotcha — chỉ cần khi thêm/sửa Scene/System |
| [WEAPONS.md](docs/gameplay/WEAPONS.md) | MODULE_READ | 5 vũ khí + baseline mechanics |
| [UPGRADE.md](docs/gameplay/UPGRADE.md) | MODULE_READ | Hệ thống upgrade, Shrapnel |
| [FUSION.md](docs/gameplay/FUSION.md) | MODULE_READ | Cơ chế Fusion, 15 công thức |
| [ENEMIES.md](docs/gameplay/ENEMIES.md) | MODULE_READ | Quái thường, Elite/Dark Soul |
| [BOSSES.md](docs/gameplay/BOSSES.md) | MODULE_READ | Boss, Loot Chest, Final Boss cutscene |
| [MAP.md](docs/gameplay/MAP.md) | MODULE_READ | Map, Wall obstacle |
| [META_PROGRESSION.md](docs/gameplay/META_PROGRESSION.md) | MODULE_READ | Coin/Unlock/Achievement — Save System |
| [UI.md](docs/gameplay/UI.md) | MODULE_READ | HUD, PauseScene, card style dùng chung |
| [GAMEPLAY.md](docs/gameplay/GAMEPLAY.md) | MODULE_READ | Vòng lặp, điều khiển, kinh tế trong trận |
| [ROADMAP.md](docs/development/ROADMAP.md) | REFERENCE | Việc chưa làm |
| [ASSET_GUIDE.md](docs/assets/ASSET_GUIDE.md) | REFERENCE | Đồ họa, âm thanh |

## Workflow dành cho AI

**AI Startup Workflow** — bắt buộc theo đúng thứ tự này khi bắt đầu phiên mới hoặc ngay sau `/compact`:

1. Đọc `CLAUDE.md` (file này).
2. Đọc [SESSION_SUMMARY.md](docs/development/SESSION_SUMMARY.md).
3. Chỉ đọc thêm đúng file MODULE_READ liên quan tới task hiện tại — không đọc toàn bộ `docs/` nếu không cần.
4. Không refactor ngoài phạm vi yêu cầu.
5. Thiếu thông tin → yêu cầu người dùng chỉ đúng tài liệu cần đọc, không tự suy diễn.

**Trong lúc làm việc:**

1. Sửa module nào → mở đúng file MODULE_READ đó (thêm `ARCHITECTURE.md` nếu đụng wiring Scene/System).
2. REFERENCE (`ROADMAP.md`, `ASSET_GUIDE.md`) chỉ mở khi thật sự cần.
3. Đổi thiết kế → cập nhật file MODULE_READ đó, không chép nội dung vào CLAUDE.md.
4. Xong việc đáng chú ý → thêm 1 dòng link vào `TASKS.md` (không chép chi tiết) VÀ cập nhật `SESSION_SUMMARY.md` (trạng thái mới nhất, việc còn treo/chờ user test).
5. `npm run typecheck` trước khi coi là xong.

## Không được làm

Hardcode số liệu, bypass `PoolManager`, viết logic nghiệp vụ trong `scenes/`, thêm dependency mới không hỏi, để sót debug code, sửa thiết kế mà không đối chiếu file MODULE_READ, tạo file `.md` mới ngoài cấu trúc `docs/` hiện có không hỏi trước, hoặc chép nội dung từ file khác vào đây thay vì liên kết.
