# Boss

*Hệ thống Boss data-driven: skill dùng chung, Loot Chest cho boss thường, cutscene Final Boss. Quái thường xem [ENEMIES.md](./ENEMIES.md). Số liệu thật: `src/data/bosses.json`, `bossSkills.json`, `bossLootWheel.json`.*

## Boss data-driven

3 boss hiện có (mỗi map 1 boss cuối riêng, đều `isFinalBoss: true` trong data), mỗi boss chỉ khai báo `skillIds` tham chiếu tới `bossSkills.json` (không hardcode số liệu riêng trong `Boss.ts`):

| Boss | Map | Skill |
|---|---|---|
| Giant Skeleton | Forest (+ mọi map placeholder Map 3-10, xem `maps.json`) | Dash, Summon, Ground Slam |
| Grave Keeper | Graveyard | Charge, Summon, Ground Slam |
| Orc Warlord | Chưa gán map nào (data sẵn, chưa wire) | Charge, Roar, Ground Slam |

Boss xuất hiện ở phút thứ 5 (cấu hình qua `GAMEPLAY.BOSS_SPAWN_AT_MS`). Mỗi boss có banner "XUẤT HIỆN" (scale-in + screen shake) và HP bar màu riêng trên HUD theo `bosses.json.color`. Ván chỉ kết thúc khi hạ được boss cuối cùng.

Skill nào hết cooldown trước trong `skillIds` được ưu tiên dùng trước (tránh spam dồn dập). Cơ chế `Boss.update()`/`BossSystem` xem [ARCHITECTURE.md](../architecture/ARCHITECTURE.md).

## Boss Intro Cinematic

Boss không spawn thẳng vào gameplay — khi tới mốc xuất hiện, GameScene giao toàn bộ cho `systems/BossIntroController.ts` (chạy trong `scenes/BossIntroScene.ts`, scene launch song song) để tạo cảm giác "một sự kiện lớn" trước khi trận đánh thật sự bắt đầu. Toàn bộ logic cinematic tách hẳn khỏi `Boss`/`GameScene` — 2 nơi đó không biết gì về cinematic, chỉ gọi `play()` rồi nhận lại `onComplete()`.

**Trình tự:**

1. **Pause hẳn gameplay** — GameScene tự `scene.pause()` (KHÔNG dùng `time.timeScale` vì hầu hết cooldown trong codebase, kể cả Boss skill, so sánh theo raw `time` — hạ `timeScale` không đủ để dừng hẳn). Player/Enemy/Projectile/EXP/Spawn/Timer đứng yên tuyệt đối; Boss AI tự "đứng yên" theo vì `BossSystem.update()` chỉ được gọi từ `GameScene.update()`, không cần thêm cờ riêng trên `Boss`.
2. **Shake + flash tối** ngay lúc bắt đầu (`BOSS_INTRO_SHAKE_MS`/`BOSS_INTRO_FLASH_MS`).
3. **Camera pan + zoom thủ công tới Boss** trong `BOSS_INTRO_CAMERA_PAN_MS` (mặc định 3000ms — tên Boss chỉ bung ra SAU khi camera dừng hẳn, nên đây cũng là mốc "~3s" tên Boss xuất hiện). Tự tween `scrollX/scrollY/zoom` bằng `camera.centerOn()` mỗi tick, **KHÔNG dùng `camera.pan()/zoomTo()` built-in** — 2 hàm đó phụ thuộc update loop của scene sở hữu camera (GameScene), không đảm bảo chạy khi scene đó đang pause. `BossIntroScene` không bị pause nên mọi tween/timer trong `BossIntroController` chạy bình thường suốt cinematic.
4. **Radial Vignette bằng Camera Post FX built-in** — `camera.postFX.addVignette(0.5, 0.5, radius, strength)` (API có sẵn từ Phaser 3.60+, chạy GPU/WebGL, không thêm dependency). Trả về `Phaser.FX.Vignette`, một object thường có property `strength` (number) — tween trực tiếp được y hệt mọi object khác, không cần vòng lặp update thủ công để giả tween. Kết hợp cùng 1 overlay màu dungeon (`0x0d0614`, xanh tím tối, thay đen thuần) phủ tông màu đều khắp màn hình — Vignette FX lo phần tối viền mượt, overlay lo tông màu.
5. **Hạt bụi/tro bay** chậm từ dưới lên, alpha thấp, fade rồi respawn liên tục suốt cinematic, dừng hẳn ngay khi bắt đầu quay lại gameplay.
6. **Tên Boss** (font fantasy, pop-in scale) + **đoạn giới thiệu ngắn kiểu typewriter** đọc từ `bosses.json.introText` (fallback "A powerful enemy blocks your path..." nếu thiếu) — có cursor nhấp nháy, **skip được bằng click hoặc phím bất kỳ** (đang gõ → hiện hết chữ ngay; đang hold → bỏ qua nốt, kết thúc luôn).
7. **Nhịp đập "thình...thình..." trong lúc hold** (sau khi gõ xong chữ): 2 nhịp nhanh cách nhau 150ms rồi nghỉ 700ms, lặp lại tới khi hết hold — mỗi nhịp overlay + Vignette FX đậm lên nhẹ (`+=` tương đối, yoyo nhanh) kèm camera rung cực nhẹ (2-3px, ~80ms, tái dùng hàm shake ở bước 2).
8. **Boss idle animation** trong suốt lúc hiện tên/typewriter: bob nhẹ lên-xuống, scale pulse, glow màu boss + 1 lớp glow phụ đỏ tối (`0x3a0000`) pulse chậm hơn phía sau ("khí xấu" toả ra).
9. **Camera quay lại Player + resume** — overlay/Vignette FX/text fade ra (`BOSS_INTRO_RETURN_MS`, mặc định 900ms), camera pan/zoom thủ công quay về đúng vị trí+zoom lúc bắt đầu, gọi `camera.postFX.remove(vignetteFX)` dọn sạch (không để FX dính lại ảnh hưởng gameplay bình thường sau cinematic), rồi `scene.resume()` — Boss AI bắt đầu hoạt động ngay từ đây. HUD hiện HP bar + banner "XUẤT HIỆN" ở bước này (event `BOSS_SPAWNED` emit SAU cinematic, không phải lúc Boss vừa spawn).

### Timing cố định 6.5 giây cho MỌI Boss

Tổng thời lượng CINEMATIC THẬT luôn cố định `GAMEPLAY.BOSS_INTRO_TOTAL_MS` (mặc định 6500ms) bất kể `introText` dài ngắn khác nhau — tránh Boss có câu thoại dài làm cinematic lê thê, hoặc câu ngắn làm intro hụt hẫng. Công thức nằm trọn trong `BossIntroController.computeTypewriterTiming()`, không hardcode rải rác:

```
textBudgetMs = BOSS_INTRO_TOTAL_MS - BOSS_INTRO_CAMERA_PAN_MS - BOSS_INTRO_RETURN_MS   // mặc định 6500-3000-900 = 2600ms
msPerChar    = clamp(textBudgetMs * BOSS_INTRO_TYPEWRITER_BUDGET_RATIO / introText.length, MIN_MS_PER_CHAR, MAX_MS_PER_CHAR)
holdMs       = textBudgetMs - (msPerChar * introText.length)
```

70% ngân sách còn lại dành cho gõ chữ (kẹp 15-35ms/ký tự — đủ chậm để đọc kịp, đủ nhanh để không lê thê), phần dư dùng làm hold time sau khi gõ xong. Vì `holdMs` luôn bù đúng phần còn thiếu, tổng typewriter+hold khớp đúng ngân sách bất kể `introText` ngắn (vd Grave Keeper, 34 ký tự) hay dài hơn — đã verify qua Browser: `giant_skeleton`/`grave_keeper` đều đo được ~6500-6580ms thật dù độ dài `introText` khác nhau.

### Cấu hình data-driven

Mỗi Boss khai báo riêng trong `bosses.json` (không hardcode trong `BossIntroController`):

| Field | Ý nghĩa | Fallback nếu thiếu |
|---|---|---|
| `introText` | Câu thoại ngắn hiện kiểu typewriter | `"A powerful enemy blocks your path..."` |
| `introCameraZoom` | Mức zoom camera lúc focus vào Boss | `GAMEPLAY.BOSS_INTRO_DEFAULT_ZOOM` (1.15) |

Hằng số dùng chung cho mọi Boss (thời gian shake/flash/pan/return, bán kính+cường độ Vignette FX, tốc độ gõ chữ, tổng thời lượng...) nằm ở `GameConfig.ts` `GAMEPLAY.BOSS_INTRO_*` — thêm Boss mới chỉ cần khai báo `introText`/`introCameraZoom` trong data, không cần sửa code.

CHƯA có âm thanh (gõ chữ, nhạc nền lúc cinematic) — dự án chưa có SoundManager/SFX, xem [ROADMAP.md](../development/ROADMAP.md).

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

**Liên kết:** [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) (gotcha `timeScale`/EventBus), [ENEMIES.md](./ENEMIES.md), [META_PROGRESSION.md](./META_PROGRESSION.md), [GAMEPLAY.md](./GAMEPLAY.md), `systems/BossIntroController.ts` + `scenes/BossIntroScene.ts` (Boss Intro Cinematic — xem mục ở trên)
