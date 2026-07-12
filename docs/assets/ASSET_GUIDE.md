# Asset Guide

*Định hướng đồ họa/hiệu ứng/âm thanh và trạng thái asset thật hiện có — không phải logic gameplay dùng chúng.*

## Đồ họa & hiệu ứng

- Định hướng: Pixel Art 32x32, có thể dùng asset miễn phí giai đoạn đầu.
- **Trạng thái hiện tại**: toàn bộ nhân vật/quái/boss/vũ khí đang dùng placeholder màu sắc (tint/Graphics vẽ tay), CHƯA có art thật.
- Hiệu ứng cần có: Damage Number, Critical, Explosion, Flash, Screen Shake, Particle — đã có ở mức placeholder (Graphics/tween tay) cho combat feedback và cutscene Final Boss, xem [GAMEPLAY.md](../gameplay/GAMEPLAY.md), [BOSSES.md](../gameplay/BOSSES.md).

## Âm thanh

- Định hướng: SFX cho Attack, Explosion, Boss, Level Up, Game Over; có BGM nền.
- **Trạng thái hiện tại — TẠM DỪNG**: đã có 3 file BGM trong `public/assets/audio/` (`bgm_menu.mp3`, `bgm_gameplay.ogg`, `bgm_boss.mp3`) nhưng **chưa có `SoundManager` hay bất kỳ code load/phát nào** — game hiện tại hoàn toàn im lặng. Việc còn lại xem [ROADMAP.md](../development/ROADMAP.md).

## Cấu trúc thư mục asset

```
public/assets/
├── sprites/    # (trống — chưa có art thật)
├── audio/      # 3 file BGM, chưa được load
└── tilemaps/   # (trống — chưa có tilemap thật)
```

**Liên kết:** [ROADMAP.md](../development/ROADMAP.md), [GAMEPLAY.md](../gameplay/GAMEPLAY.md), [BOSSES.md](../gameplay/BOSSES.md)
