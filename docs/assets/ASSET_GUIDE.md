# Asset Guide

*Định hướng đồ họa/hiệu ứng/âm thanh và trạng thái asset thật hiện có — không phải logic gameplay dùng chúng.*

## Đồ họa & hiệu ứng

- Định hướng: Pixel Art, có thể dùng asset miễn phí giai đoạn đầu.
- **Trạng thái hiện tại — sprite nhân vật đã bắt đầu dùng art thật** (load động theo `characterId`, xem [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) mục "Sprite nhân vật động theo characterId" cho cơ chế load/fallback, [WEAPONS.md](../gameplay/WEAPONS.md) cho Bow/Triple Throw):
  - **Hunter** (thư mục `player/archer/`) — Run + Attack1 đủ 4 hướng, 8 frame/hướng, 96x110px/frame.
  - **Knight** (thư mục `player/knight/`) — Run + Attack đủ 4 hướng, cùng format 96x110px.
  - **Assassin** (thư mục `player/assasin/` — LƯU Ý thiếu 1 chữ "s" so với `characterId`) — có Attack đủ 4 hướng, **thư mục `run/` tồn tại nhưng RỖNG** (chưa có Run).
  - **Mage** (`player/mage/`, file nằm thẳng không có subfolder) — chỉ có Attack 4 hướng, **chưa có Run**.
  - **Archer** (nhân vật roster riêng, `characterId: "archer"`, khác Hunter dù cùng tên gọi) — **chưa có asset nào**.
  - Weapon projectile thật: `weapons/arrow_projectile.png` (Bow, Hunter), `weapons/assasin_projectile.png` (Triple Throw, Assassin).
  - Quái/boss/vũ khí còn lại (Sword/Fireball/Ice Shard/Lightning/Boomerang, toàn bộ Enemy/Boss) VẪN dùng placeholder màu sắc (tint/Graphics vẽ tay), CHƯA có art thật.
- Hiệu ứng cần có: Damage Number, Critical, Explosion, Flash, Screen Shake, Particle — đã có ở mức placeholder (Graphics/tween tay) cho combat feedback và cutscene Final Boss, xem [GAMEPLAY.md](../gameplay/GAMEPLAY.md), [BOSSES.md](../gameplay/BOSSES.md).

## Âm thanh

- Định hướng: SFX cho Attack, Explosion, Boss, Level Up, Game Over; có BGM nền.
- **Trạng thái hiện tại — TẠM DỪNG**: đã có 3 file BGM trong `public/assets/audio/` (`bgm_menu.mp3`, `bgm_gameplay.ogg`, `bgm_boss.mp3`) nhưng **chưa có `SoundManager` hay bất kỳ code load/phát nào** — game hiện tại hoàn toàn im lặng. Việc còn lại xem [ROADMAP.md](../development/ROADMAP.md).

## Cấu trúc thư mục asset

```
public/assets/
├── sprites/
│   ├── player/
│   │   ├── archer/       # Hunter — run/, attack/ (attack1_<dir>.png) đủ 4 hướng
│   │   ├── knight/        # run/, attack/ (attack_<dir>.png) đủ 4 hướng
│   │   ├── assasin/       # attack/ đủ 4 hướng, run/ RỖNG (chưa có file)
│   │   └── mage/          # attack_<dir>.png thẳng trong thư mục, chưa có run/
│   └── weapons/
│       ├── arrow_projectile.png     # Bow (Hunter)
│       └── assasin_projectile.png   # Triple Throw (Assassin)
├── audio/      # 3 file BGM, chưa được load
└── tilemaps/   # (trống — chưa có tilemap thật)
```

**Liên kết:** [ROADMAP.md](../development/ROADMAP.md), [ARCHITECTURE.md](../architecture/ARCHITECTURE.md), [WEAPONS.md](../gameplay/WEAPONS.md), [GAMEPLAY.md](../gameplay/GAMEPLAY.md), [BOSSES.md](../gameplay/BOSSES.md)
