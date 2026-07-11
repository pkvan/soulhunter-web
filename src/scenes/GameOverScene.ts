import Phaser from "phaser";
import { RunResult } from "@types/index";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data: RunResult): void {
    // TODO: hiện Survival time (mm:ss), Kills, Coin, Highest Combo — format giống GDD mục 12
    // TODO: cộng Coin vào lưu trữ persistent (localStorage hoặc backend sau này)
    // TODO: nút "Chơi lại" -> this.scene.start("MenuScene")

    const mm = Math.floor(data.survivalTimeMs / 60000);
    const ss = Math.floor((data.survivalTimeMs % 60000) / 1000);

    this.add.text(480, 200,
      `Survival: ${mm}:${ss.toString().padStart(2, "0")}\nKills: ${data.kills}\nCoin: ${data.coinEarned}\nHighest Combo: ${data.highestCombo}\n\n[click để chơi lại]`,
      { fontSize: "20px", color: "#ffffff", align: "center" }
    ).setOrigin(0.5);

    this.input.once("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}
