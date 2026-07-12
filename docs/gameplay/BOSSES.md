# Boss

*Hệ thống Boss data-driven: skill dùng chung, Loot Chest cho boss thường, cutscene Final Boss. Quái thường xem [ENEMIES.md](./ENEMIES.md). Số liệu thật: `src/data/bosses.json`, `bossSkills.json`, `bossLootWheel.json`.*

## Boss data-driven

2 boss hiện có, mỗi boss chỉ khai báo `skillIds` tham chiếu tới `bossSkills.json` (không hardcode số liệu riêng trong `Boss.ts`):

| Boss | Skill |
|---|---|
| Giant Skeleton | Dash, Summon, Ground Slam |
| Orc Warlord (Final Boss) | Charge, Roar, Ground Slam |

Boss xuất hiện ở phút thứ 5 (cấu hình qua `GAMEPLAY.BOSS_SPAWN_AT_MS`). Mỗi boss có banner "XUẤT HIỆN" (scale-in + screen shake) và HP bar màu riêng trên HUD theo `bosses.json.color`. Ván chỉ kết thúc khi hạ được boss cuối cùng.

Skill nào hết cooldown trước trong `skillIds` được ưu tiên dùng trước (tránh spam dồn dập). Cơ chế `Boss.update()`/`BossSystem` xem [ARCHITECTURE.md](../architecture/ARCHITECTURE.md).

## Boss Loot Chest (boss KHÔNG phải Final Boss)

Mọi boss có `isFinalBoss !== true` (vd Giant Skeleton) chết đều rơi rương 100% tại đúng vị trí vừa chết (`entities/LootChest.ts`, glow vàng gold pulse liên tục). Rương **không** tự hút theo Magnet như Soul — player phải chủ động đi tới va chạm mới trigger vòng xoay may mắn (`scenes/BossLootScene.ts`, đọc trọng số từ `data/bossLootWheel.json`).

Vòng xoay có kim chỉ (needle) cố định ở đỉnh, chỉ vòng quay xoay quanh tâm bên dưới kim. Cách roll: **kết quả theo trọng số được xác định TRƯỚC**, sau đó mới tính góc dừng khớp đúng ô đã roll (không phải random góc dừng rồi suy ngược kết quả) — danh sách ô của vòng quay được tính đúng 1 lần khi mở overlay, không đổi giữa chừng animation.

Nhặt xong chỉ nhận thưởng rồi chơi tiếp, KHÔNG kết thúc ván.

## Final Boss death sequence

Boss có `isFinalBoss: true` (hiện tại: Orc Warlord) khi chết KHÔNG rơi Loot Chest — chạy thẳng cutscene chiến thắng, tuần tự 3 bước, bước sau chỉ bắt đầu khi bước trước hoàn tất hẳn (không chạy song song). Mọi mốc chờ giữa các bước dùng **`setTimeout()` thuần JavaScript**, không dùng `scene.time.delayedCall()` — lý do kỹ thuật xem gotcha `time.timeScale` trong [ARCHITECTURE.md](../architecture/ARCHITECTURE.md).

- **Bước 0** (`Boss.stopForDeathCutscene()`, chạy ngay khi `currentHp <= 0`): dừng tuyệt đối — `setVelocity(0,0)`, tắt hẳn physics body, huỷ mọi tween cũ, cờ `isDying` chặn `update()` return ngay từ đầu.
- **Bước 1**: camera `pan()` 0.5s tới đúng vị trí boss (đã đứng yên từ bước 0), không đổi zoom, giữ nguyên mức zoom xuyên suốt.
- **Bước 2**: `time.timeScale`/`physics.world.timeScale` hạ xuống 0.06 (gần đứng hình) trong đúng 3 giây thật — boss tan biến alpha 1→0 tuyến tính (`this.tweens`, không phụ thuộc `time.timeScale`) kèm hiệu ứng bọt khí (Graphics tròn, spawn liên tục quanh boss, giống linh hồn thoát ra).
- **Bước 3**: trả `timeScale` về 1, `camera.fadeOut`, rồi chuyển `GameOverScene` với `victory: true` — hiện banner "CHIẾN THẮNG!" trước bảng kết quả (xem [GAMEPLAY.md](./GAMEPLAY.md)).

Có `console.log` kèm `Date.now()` ở mỗi bước để xác nhận đúng timing thật khi cần debug lại.

**Liên kết:** [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) (gotcha `timeScale`/EventBus), [ENEMIES.md](./ENEMIES.md), [META_PROGRESSION.md](./META_PROGRESSION.md), [GAMEPLAY.md](./GAMEPLAY.md)
