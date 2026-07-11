import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    // TODO: hiện tên game, nút Start, chọn Character (đọc characters.json, chỉ hiện unlocked)
    // TODO: hiện Coin hiện có, nút vào màn Unlock/Upgrade (không bắt buộc ở MVP)

    const startText = this.add.text(480, 270, "SoulHunter\n[click để bắt đầu]", {
      fontSize: "24px",
      color: "#ffffff",
      align: "center"
    }).setOrigin(0.5);

    this.input.once("pointerdown", () => {
      startText.destroy();
      this.scene.start("GameScene", { characterId: "hunter" });
    });
  }
}
