import Phaser from "phaser";

/**
 * Icon placeholder hình tròn tô theo màu data (tintColor Enemy / color Boss) — cùng tinh thần "chưa có
 * asset thật, dùng Graphics tô màu theo data" với ui/WeaponIcon.ts, nhưng cố tình dùng HÌNH TRÒN thay vì
 * vuông bo góc để phân biệt trực quan Monster/Boss với Weapon trong CollectionScene.
 */
export function renderEntityIcon(scene: Phaser.Scene, x: number, y: number, colorHex: string | undefined, size: number): Phaser.GameObjects.GameObject {
  const color = colorHex !== undefined ? Number(colorHex) : 0x9ca3af;
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillCircle(x, y, size / 2);
  g.lineStyle(2, 0xffffff, 0.4);
  g.strokeCircle(x, y, size / 2);
  return g;
}
