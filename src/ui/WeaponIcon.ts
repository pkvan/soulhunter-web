import Phaser from "phaser";
import { WeaponDef } from "@types/index";

/**
 * Vẽ icon vũ khí — dùng chung giữa LevelUpCard (màn chọn card) và HUD (tray vũ khí đang trang bị) để không
 * viết trùng logic "ưu tiên texture thật, fallback placeholder" ở 2 nơi.
 *
 * Kiến trúc sẵn sàng thay icon thật: nếu sau này có asset, chỉ cần load texture đúng key `weapon_icon_<id>`
 * (vd trong BootScene.preload()) — hàm này tự động dùng texture đó, KHÔNG cần sửa gì ở đây hay bất kỳ nơi
 * gọi nào. Hiện tại chưa có asset nào nên luôn rơi vào nhánh fallback: hình vuông bo góc màu theo
 * `weaponDef.color` (data-driven, xem weapons.json/fusionWeapons.json).
 */
export function renderWeaponIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  def: WeaponDef,
  size: number
): Phaser.GameObjects.GameObject {
  const iconKey = `weapon_icon_${def.id}`;
  if (scene.textures.exists(iconKey)) {
    return scene.add.image(x, y, iconKey).setDisplaySize(size, size);
  }

  const color = def.color !== undefined ? Number(def.color) : 0x9ca3af;
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(x - size / 2, y - size / 2, size, size, size * 0.2);
  g.lineStyle(1, 0xffffff, 0.5);
  g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, size * 0.2);
  return g;
}
