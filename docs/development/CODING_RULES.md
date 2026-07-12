# Coding Rules

*Quy tắc BẮT BUỘC khi viết/sửa code — vi phạm là nguyên nhân phổ biến nhất gây lag hoặc bug khó tìm trong dự án. Cấu trúc thư mục xem [ARCHITECTURE.md](../architecture/ARCHITECTURE.md).*

- **Không hardcode số liệu game** (damage, HP, cooldown...) trong class — luôn đọc từ file JSON trong `src/data/`. Muốn balance lại chỉ sửa JSON, không sửa code.
- **Object pooling bắt buộc** cho Enemy/Projectile/Pickup — dùng `PoolManager`, không `new Enemy()` hay `scene.add.sprite()` trực tiếp trong vòng lặp spawn. Đây là điểm dễ gây lag nhất nếu bỏ qua (game có thể có 200+ enemy, 100+ projectile cùng lúc).
- **Systems tách khỏi Scenes**: logic nghiệp vụ (tính damage, check fusion, spawn logic) đặt trong `src/systems/`, không viết thẳng trong `GameScene.ts`. Scene chỉ gọi system và xử lý vòng đời Phaser.
- **EventBus** (`src/utils/EventBus.ts`) dùng để giao tiếp giữa Scene và UI overlay — tránh coupling trực tiếp giữa các scene. Vòng đời độc lập với Scene, xem gotcha trong [ARCHITECTURE.md](../architecture/ARCHITECTURE.md).
- **1 nguồn xác định logic/style dùng chung ở nhiều nơi**: nếu 2 màn hình cùng cần phân loại/style 1 loại dữ liệu, viết 1 hàm export dùng chung thay vì hardcode logic riêng ở từng nơi — tránh lệch trạng thái khi 1 bên quên cập nhật. Ví dụ áp dụng: [UI.md](../gameplay/UI.md) (`getCardStyle()`).
- **Không để lại debug feature trong build**: phím tắt/flag debug dùng để test nhanh lúc phát triển phải được xoá hẳn sau khi dùng xong, không chỉ comment out — từng gây bug nghiêm trọng (xem [TASKS.md](./TASKS.md)).
- Đặt tên file/class theo PascalCase, biến/hàm camelCase, hằng số UPPER_SNAKE_CASE.
- Mỗi entity/system nên có 1 file test tương ứng nếu thêm logic phức tạp (chưa setup test runner — dùng `vitest` nếu cần, hỏi trước khi thêm dependency mới).

**Liên kết:** [ARCHITECTURE.md](../architecture/ARCHITECTURE.md), [TASKS.md](./TASKS.md), [UI.md](../gameplay/UI.md)
