import Phaser from "phaser";
import { Player } from "@entities/Player";

/**
 * HUD hiển thị HP bar, thời gian sống, Kills — cố định trên màn hình (setScrollFactor(0)).
 */
export class HUD {
  private hpText: Phaser.GameObjects.Text;
  private timeText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private soulBarBg: Phaser.GameObjects.Rectangle;
  private soulBarFill: Phaser.GameObjects.Rectangle;
  private readonly soulBarWidth = 150;
  private readonly soulBarHeight = 10;
  private readonly soulBarX = 16;
  private readonly soulBarY = 40;

  constructor(private scene: Phaser.Scene, private player: Player) {
    this.hpText = scene.add.text(16, 16, "", { fontSize: "14px", color: "#ffffff" }).setScrollFactor(0);

    this.soulBarBg = scene.add.rectangle(
      this.soulBarX, this.soulBarY, this.soulBarWidth, this.soulBarHeight, 0x333333
    ).setOrigin(0, 0).setScrollFactor(0);
    this.soulBarFill = scene.add.rectangle(
      this.soulBarX, this.soulBarY, 0, this.soulBarHeight, 0x8be9fd
    ).setOrigin(0, 0).setScrollFactor(0);

    this.levelText = scene.add.text(this.soulBarX + this.soulBarWidth + 8, this.soulBarY - 3, "", {
      fontSize: "14px", color: "#ffffff"
    }).setScrollFactor(0);

    this.timeText = scene.add.text(16, 60, "", { fontSize: "14px", color: "#ffffff" }).setScrollFactor(0);
    // TODO: thêm HP bar dạng thanh (rectangle fill theo %), không chỉ text
    // TODO: hiện icon các vũ khí đang equip ở góc dưới
  }

  update(survivalTimeMs: number): void {
    this.hpText.setText(`HP: ${Math.max(0, Math.floor(this.player.stats.currentHp))}/${this.player.stats.maxHp}`);

    const { level, soulCount, soulToNextLevel } = this.player.getProgress();
    const soulPercent = Phaser.Math.Clamp(soulCount / soulToNextLevel, 0, 1);
    this.soulBarFill.width = this.soulBarWidth * soulPercent;
    this.levelText.setText(`Lv. ${level}`);

    const mm = Math.floor(survivalTimeMs / 60000);
    const ss = Math.floor((survivalTimeMs % 60000) / 1000);
    this.timeText.setText(`${mm}:${ss.toString().padStart(2, "0")}`);
  }
}
