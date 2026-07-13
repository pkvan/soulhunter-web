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

## Thử Thách 7 Ngày (chưa có module doc riêng — xem [SESSION_SUMMARY.md](./SESSION_SUMMARY.md))

- [x] `Challenge7DaysManager` (state trong `localStorage`, mở ngày TUẦN TỰ theo tiến độ hoàn thành nhiệm vụ — khác cơ chế lịch thật của Daily Login Reward), `Challenge7DaysScene` popup 3 cột (danh sách ngày / 3 mission/ngày dạng card / tổng sao + milestone), hook tiến độ qua `GameScene.registerKill()`, nút truy cập ở `MenuScene`
- [x] Redesign UI: 3-4 mission/ngày với badge "+N⭐", icon vector (`ui/ChallengeIcons.ts`) thay emoji để hết clip, cột tổng sao thiết kế lại (gift icon đỉnh thanh, milestone canh lề không đè số)
- [x] Fix UX: hit area chọn ngày lớn hơn + chọn lúc pointerup (dễ bấm, có hiệu ứng nhấn), thanh sao fill đúng chiều dưới→trên bất kể renderer, milestone vũ khí chỉ "sở hữu" sau khi claim thật (`unlockWeapon`) thay vì cho chọn khi chưa có, reward hiện rõ tên/số lượng thay vì chỉ icon
- [x] Fix layout text reward tràn khung (word-wrap đúng bề rộng thật + clamp 2 dòng), tách render 3 layer để đổi ngày không làm thanh Tổng sao animate lại

## Collection (chưa có module doc riêng — xem [SESSION_SUMMARY.md](./SESSION_SUMMARY.md))

- [x] Màn Collection mới: `CollectionScene` popup 2 khu vực (4 tab dọc `CollectionTab` Monsters/Weapons/Bosses/Cards + grid `CollectionCard` scroll được), `CollectionManager` tổng hợp dữ liệu THẬT từ enemies.json/enemies_graveyard.json/weapons.json/fusionWeapons.json/bosses.json/upgrades.json (không tạo data trùng), trạng thái khám phá lưu qua `utils/CollectionSaveData.ts`. Nút mở ở góc trên-phải MenuScene.
- [x] Unlock hook data-driven: Monster (WeaponSystem lúc kill), Weapon (UpgradeSystem/FusionSystem lúc trang bị/fusion), Boss (BossSystem lúc spawn), Card/Upgrade (UpgradeSystem lúc chọn) — không cần Scene nào tự tính.
- [x] Refactor toàn bộ hệ thống Card về 1 component duy nhất `ui/CollectionCard.ts` (rarity border Common/Rare/Epic/Legendary, silhouette "?????"/"Chưa khám phá." khi khoá) — `LevelUpScene` (màn chọn Upgrade lúc nhặt Soul) dùng chung component này thay vì `LevelUpCard.ts` cũ (đã xoá). `PauseScene` giữ nguyên hành vi, chỉ đổi import sang `ui/CardStyle.ts` (tách phần style trạng thái "mới/nâng cấp/fusion" ra khỏi component vẽ).
- [x] Fix tab Boss/Cards không phản hồi: nguyên nhân `CollectionTab` bị destroy+recreate mỗi lần đổi tab (kể cả tab đang được click, ngay giữa lúc xử lý sự kiện của chính nó) — sửa thành tạo tab 1 lần duy nhất trong `create()`, đổi tab chỉ gọi `setSelected()` cập nhật màu/viền tại chỗ, không đụng grid bên phải ngoài việc render lại đúng tab đang chọn. Đồng thời đưa toàn bộ unlock (`unlockMonster/unlockWeapon/unlockBoss/unlockCard`) về `CollectionManager` làm điểm ghi DUY NHẤT (tự kiểm tra trùng + bắn `GameEvents.COLLECTION_UNLOCKED`), các hệ thống gameplay không còn gọi thẳng `utils/CollectionSaveData.ts`. `CollectionScene` lắng nghe event này để tự refresh đúng tab đang mở nếu có unlock mới, không cần đóng/mở lại popup.
- [x] Fix vùng click Tab chỉ ăn 1 phần nhỏ + card grid bung to đè lên tab lúc hover: nguyên nhân `CollectionTab`/`CollectionCard` gắn interactive vào `Container` kèm `Geom.Rectangle` tính tay — trên giấy đúng nhưng thực tế chỉ nhận click ở khoảng nửa trái, đã xác nhận qua test Browser (click cạnh phải mọi tab không phản hồi). Sửa bằng cách gắn interactive trực tiếp vào 1 `Rectangle` con phủ đúng kích thước (dùng `setInteractive()` không tham số để Phaser tự tính hit area, không tính tay) — `CollectionTab` dùng luôn `bg` có sẵn, `CollectionCard` thêm `hitZone` alpha≈0 riêng. Đồng thời thêm `CollectionCard.setBaseScale()` để hover/click animate quanh đúng tỉ lệ "nghỉ" của card (vd `GRID_SCALE` trong grid) thay vì ghi đè scale tuyệt đối — trước đó hover trong grid làm card bung về full size (CARD_W x CARD_H) đè lên cột tab bên trái.
- [x] Fill đầy đủ data thật (đã đúng từ trước, không phải tạo mới): Monsters 10 (enemies.json+enemies_graveyard.json), Weapons 22 (weapons.json+fusionWeapons.json), Bosses 3 (bosses.json), Cards 21 (upgrades.json). Thêm `DEV_UNLOCK_ALL = true` (hằng số, comment rõ TẠM THỜI) trong `CollectionManager.ts` — ép mọi entry hiện `unlocked: true` để dễ kiểm tra UI, KHÔNG tắt việc ghi nhận unlock thật bên dưới (`discoverX()`/`unlockX()` vẫn chạy bình thường) nên chỉ cần đổi hằng số về `false` là quay lại đúng cơ chế unlock theo gameplay.
- [x] Typography: bỏ font mặc định Phaser (Courier, monospace) — thêm `TITLE_FONT` (Georgia serif, dùng cho Title/Header) + `BODY_FONT` (Trebuchet MS/Segoe UI sans-serif, dùng cho Description/stat), đều là font hệ thống có sẵn (không thêm dependency/tải mạng). Áp dụng cho `CollectionCard`/`CollectionScene`/`CollectionTab`: phân cấp rõ Title(16px, stroke+shadow)/Badge(11px)/Stat(12px)/Description(12px), tăng `lineSpacing` (3→6), tăng contrast màu chữ mô tả.

## Boss Intro Cinematic (module doc đầy đủ — xem [BOSSES.md](../gameplay/BOSSES.md) mục "Boss Intro Cinematic")

- [x] `BossIntroController` (systems/) + `BossIntroScene` (scene song song, launch từ GameScene) — Boss không spawn thẳng, GameScene pause hẳn (`scene.pause()`, không dùng timeScale vì mọi cooldown trong codebase so theo raw time) rồi giao cinematic: shake+flash → camera pan/zoom thủ công 3s tới Boss (tự tween scrollX/scrollY/zoom bằng `camera.centerOn()`, KHÔNG dùng `camera.pan()/zoomTo()` built-in vì phụ thuộc update loop của scene đang pause) → Camera Post FX Vignette (`camera.postFX.addVignette()`, GPU) + overlay màu dungeon (`0x0d0614`) + hạt bụi/tro bay → Boss idle animation (bob/scale pulse/glow đôi) → tên Boss + đoạn giới thiệu kiểu typewriter (skip được bằng click/phím bất kỳ) → nhịp đập "thình...thình..." lúc hold (overlay+vignette đậm lên + camera rung nhẹ) → camera quay lại Player → resume gameplay + emit `BOSS_SPAWNED` (HUD hiện HP bar sau khi cinematic xong, không phải lúc vừa spawn).
- [x] Timing CỐ ĐỊNH `GAMEPLAY.BOSS_INTRO_TOTAL_MS` (6500ms) cho MỌI boss bất kể `introText` dài ngắn — công thức `computeTypewriterTiming()` (70% ngân sách còn lại cho gõ chữ, kẹp 15-35ms/ký tự, phần dư thành hold). Cấu hình per-Boss qua data (`bosses.json`: `introText`, `introCameraZoom`), hằng số dùng chung ở `GameConfig.ts` `GAMEPLAY.BOSS_INTRO_*`.
- [x] Đã test qua Browser nhiều lần xuyên suốt các vòng chỉnh: console log đo được 6533-6582ms (khớp mục tiêu, chênh giữa 2 boss text dài ngắn khác nhau chỉ ~2ms), bắt được hình ảnh cinematic giữa chừng, gameplay resume chính xác sau đó, không lỗi console.

## Đang dở / tạm dừng

- [ ] Weapon unlock bằng Coin cho 5 vũ khí khởi điểm — xem [ROADMAP.md](./ROADMAP.md)
- [ ] Âm thanh (SoundManager + SFX) — xem [ROADMAP.md](./ROADMAP.md)
- [ ] Boss Intro Cinematic dùng `camera.postFX.addVignette()` — API này CHỈ chạy trên WebGL renderer (Canvas fallback không hiện vignette, Phaser không throw lỗi nên dễ bị bỏ sót). Chưa test trên nhiều trình duyệt/thiết bị khác nhau (đặc biệt mobile/trình duyệt cũ có thể fallback Canvas) — cần kiểm tra tương thích trước khi coi là ổn định trên diện rộng.
- [ ] HUD banner "XUẤT HIỆN" (`HUD.onBossSpawned()`) có nên đồng bộ về mốc ~3s (lúc camera tới Boss, giống title cinematic) hay giữ nguyên hiện sau khi cinematic kết thúc hẳn — user từng nhắc tới nhưng CHƯA xác nhận rõ ý định, xem SESSION_SUMMARY.md.
- [ ] `BOSSES.md` mục "Final Boss death sequence" đang mô tả implementation CŨ (cutscene 3 bước, bubble effect) — đã bị thay bằng `VictoryController.ts` (Zoom → Slow Motion 25% → Boss tan biến + soul particles) từ sprint "Victory Flow rework" nhưng chưa cập nhật lại doc, ngoài phạm vi các yêu cầu gần đây.
- [ ] `CollectionManager.DEV_UNLOCK_ALL = true` đang BẬT (tạm thời theo yêu cầu user để dễ test UI Collection) — cần đổi lại `false` trước khi release để quay về đúng cơ chế unlock theo gameplay.
- [ ] Boss Intro Cinematic chưa có âm thanh gõ chữ/nhạc nền (spec yêu cầu) — dự án CHƯA có SoundManager/SFX (xem mục Âm thanh phía trên). Bổ sung khi SoundManager có thật.
- [ ] Cần user xác nhận: text `"Giant Skeleton Xuất Hiện"` user nhắc tới là HUD banner có sẵn (`HUD.onBossSpawned`, khác title cinematic "— GIANT SKELETON —"), chỉ hiện SAU KHI cinematic kết thúc hoàn toàn — chưa rõ user muốn đồng bộ banner này về mốc ~3s (lúc camera tới boss) hay chỉ cần title cinematic đúng mốc đó (đã làm). Xem SESSION_SUMMARY.md mục 12.
- [ ] Xoá `console.time`/`console.timeEnd` debug trong `BossIntroController.play()` sau khi user xác nhận hài lòng với toàn bộ cinematic (không còn cần đo timing nữa).

**Liên kết:** [ROADMAP.md](./ROADMAP.md)
