import Phaser from "phaser";

/**
 * Icon vector dùng chung cho popup Thử Thách 7 Ngày — vẽ bằng Graphics/Star thay vì ký tự Unicode
 * (🔒 ✓ ⭐ 🎁) để tránh bị crop do metrics font khác nhau giữa trình duyệt/hệ điều hành, đồng thời giữ
 * phong cách vector sắc nét nhất quán. Mọi hàm nhận (x,y) là TÂM icon, trả về GameObject đã đặt đúng vị trí.
 */

export function drawLockIcon(scene: Phaser.Scene, x: number, y: number, size: number, color = 0x9ca3af): Phaser.GameObjects.Container {
  const bodyW = size * 0.72;
  const bodyH = size * 0.5;
  const shackleRadius = size * 0.26;
  const g = scene.add.graphics();
  g.lineStyle(Math.max(2, size * 0.12), color, 1);
  g.beginPath();
  g.arc(0, -bodyH * 0.1, shackleRadius, Math.PI, 0, false);
  g.strokePath();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-bodyW / 2, -bodyH * 0.1, bodyW, bodyH, size * 0.08);
  return scene.add.container(x, y, [g]);
}

export function drawCheckIcon(scene: Phaser.Scene, x: number, y: number, size: number, color = 0x4ade80): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  g.lineStyle(Math.max(2, size * 0.16), color, 1);
  g.beginPath();
  g.moveTo(-size * 0.3, 0);
  g.lineTo(-size * 0.06, size * 0.26);
  g.lineTo(size * 0.32, -size * 0.28);
  g.strokePath();
  return scene.add.container(x, y, [g]);
}

export function drawStarIcon(scene: Phaser.Scene, x: number, y: number, size: number, color = 0xfacc15, alpha = 1): Phaser.GameObjects.GameObject {
  return scene.add.star(x, y, 5, size * 0.4, size * 0.55, color, alpha);
}

export function drawGiftIcon(scene: Phaser.Scene, x: number, y: number, size: number, color = 0xd85a30): Phaser.GameObjects.Container {
  const boxW = size * 0.8;
  const boxH = size * 0.58;
  const boxTop = -boxH * 0.4;
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-boxW / 2, boxTop, boxW, boxH, 3);
  g.fillStyle(0xfacc15, 1);
  g.fillRect(-boxW / 2, boxTop, boxW, boxH * 0.22); // ribbon ngang
  g.fillRect(-size * 0.06, boxTop, size * 0.12, boxH); // ribbon dọc
  g.fillStyle(color, 1);
  g.fillEllipse(-size * 0.16, boxTop, size * 0.22, size * 0.16);
  g.fillEllipse(size * 0.16, boxTop, size * 0.22, size * 0.16);
  return scene.add.container(x, y, [g]);
}
