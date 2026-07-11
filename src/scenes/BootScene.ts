import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    // TODO: khi có asset thật, load sprite sheet / atlas ở đây thay cho texture generate trong create()
    // TODO: load JSON data (weapons, upgrades, fusions, enemies, characters) qua this.load.json nếu cần Phaser cache,
    // hiện tại các file trong src/data/ được import thẳng qua TypeScript nên chưa cần bước này.
  }

  create(): void {
    this.generatePlaceholderTextures();
    this.scene.start("MenuScene");
  }

  private generatePlaceholderTextures(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);

    graphics.fillStyle(0x4ade80, 1); // player: xanh lá
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture("player_placeholder", 32, 32);
    graphics.clear();

    graphics.fillStyle(0xffffff, 1); // enemy: trắng thuần — để Enemy.spawn() setTint() theo def.tintColor ra đúng màu (tint nhân màu với texture)
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture("enemy_placeholder", 32, 32);
    graphics.clear();

    graphics.fillStyle(0xfbbf24, 1); // projectile: vàng (dùng chung/fallback)
    graphics.fillRect(0, 0, 12, 12);
    graphics.generateTexture("projectile_placeholder", 12, 12);
    graphics.clear();

    graphics.fillStyle(0xff6a1f, 1); // fireball: cam/đỏ, hình tròn to
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture("projectile_fireball", 16, 16);
    graphics.clear();

    graphics.fillStyle(0x8be9fd, 1); // ice shard: xanh cyan nhạt, hình thoi mảnh
    graphics.beginPath();
    graphics.moveTo(5, 0);
    graphics.lineTo(10, 7);
    graphics.lineTo(5, 14);
    graphics.lineTo(0, 7);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture("projectile_ice_shard", 10, 14);
    graphics.clear();

    graphics.fillStyle(0xc98a3b, 1); // boomerang: vàng/nâu gỗ, hình chữ nhật (tự xoay khi bay)
    graphics.fillRect(0, 0, 16, 6);
    graphics.generateTexture("projectile_boomerang", 16, 6);
    graphics.clear();

    graphics.fillStyle(0xffffff, 1); // boss: trắng thuần, to hơn hẳn enemy thường — Boss.ts setTint() theo bosses.json ra đúng màu riêng từng loại
    graphics.fillRect(0, 0, 64, 64);
    graphics.generateTexture("boss_placeholder", 64, 64);

    graphics.destroy();
  }
}
