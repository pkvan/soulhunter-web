import Phaser from "phaser";
import { RunResult } from "@types/index";
import { addCoin } from "@utils/SaveData";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data: RunResult): void {
    const mm = Math.floor(data.survivalTimeMs / 60000);
    const ss = Math.floor((data.survivalTimeMs % 60000) / 1000);
    const totalCoin = addCoin(data.coinEarned); // cộng dồn Coin ván này vào tổng đã lưu (localStorage)

    const title = data.victory ? "BẠN ĐÃ THẮNG!" : "GAME OVER";
    const titleColor = data.victory ? "#4ade80" : "#ef4444";

    this.add.text(480, 120, title, { fontSize: "36px", color: titleColor, fontStyle: "bold" }).setOrigin(0.5);

    const rows: [string, string][] = [
      ["Survival", `${mm}:${ss.toString().padStart(2, "0")}`],
      ["Kills", `${data.kills}`],
      ["Highest Combo", `x${data.highestCombo}`],
      ["Coin kiếm được", `+${data.coinEarned}`]
    ];

    const startY = 200;
    const rowHeight = 34;
    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];
      const y = startY + i * rowHeight;
      this.add.text(400, y, label, { fontSize: "18px", color: "#9ca3af" }).setOrigin(1, 0.5);
      this.add.text(420, y, value, { fontSize: "18px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0, 0.5);
    }

    this.add.text(480, startY + rows.length * rowHeight + 16, `Tổng Coin: ${totalCoin}`, {
      fontSize: "20px",
      color: "#fbbf24",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.add.text(480, startY + rows.length * rowHeight + 60, "[click để chơi lại]", {
      fontSize: "16px",
      color: "#9ca3af"
    }).setOrigin(0.5);

    this.input.once("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}
