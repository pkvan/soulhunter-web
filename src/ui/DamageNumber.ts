import Phaser from "phaser";

/**
 * Damage Number bay lên và biến mất — gọi mỗi khi enemy nhận damage (xem GDD mục 10, hiệu ứng).
 */
export function showDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  isCritical = false
): void {
  const text = scene.add.text(x, y, Math.round(amount).toString(), {
    fontSize: isCritical ? "20px" : "14px",
    color: isCritical ? "#ffb84d" : "#ffffff",
    fontStyle: isCritical ? "bold" : "normal"
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: text,
    y: y - 30,
    alpha: 0,
    duration: 600,
    ease: "Cubic.easeOut",
    onComplete: () => text.destroy()
  });

  // TODO: thêm Screen Shake nhẹ khi isCritical (scene.cameras.main.shake(80, 0.003))
}
