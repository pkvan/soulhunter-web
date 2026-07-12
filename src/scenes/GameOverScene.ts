import Phaser from "phaser";
import { RunResult, AchievementDef } from "@types/index";
import { addCoin, addTotalKills, checkAndClaimNewAchievements, getTotalCoin } from "@utils/SaveData";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  /** CHỈ xử lý thua trận (HP về 0) — thắng trận (hạ Final Boss) đi qua VictoryScene, xem GameScene.onVictoryCinematicComplete(). */
  create(data: RunResult): void {
    addCoin(data.coinEarned); // cộng dồn Coin ván này vào tổng đã lưu (localStorage)
    const totalKills = addTotalKills(data.kills); // cộng dồn vào tổng số quái đã giết MỌI ván, dùng cho Achievement
    const newAchievements = checkAndClaimNewAchievements(totalKills); // tự cộng thêm rewardCoin nếu vừa đạt mốc mới
    const totalCoin = getTotalCoin(); // đọc lại sau khi achievement (nếu có) đã cộng thêm Coin

    this.renderResults(data, totalCoin, newAchievements);
  }

  private renderResults(data: RunResult, totalCoin: number, newAchievements: AchievementDef[]): void {
    const mm = Math.floor(data.survivalTimeMs / 60000);
    const ss = Math.floor((data.survivalTimeMs % 60000) / 1000);

    this.add.text(480, 120, "GAME OVER", { fontSize: "36px", color: "#ef4444", fontStyle: "bold" }).setOrigin(0.5);

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

    let nextY = startY + rows.length * rowHeight + 16;
    this.add.text(480, nextY, `Tổng Coin: ${totalCoin}`, {
      fontSize: "20px",
      color: "#fbbf24",
      fontStyle: "bold"
    }).setOrigin(0.5);
    nextY += 34;

    for (const achievement of newAchievements) {
      this.add.text(480, nextY, `🏆 Achievement Unlocked: ${achievement.name} (+${achievement.rewardCoin} Coin)`, {
        fontSize: "15px",
        color: "#4ade80",
        fontStyle: "bold"
      }).setOrigin(0.5);
      nextY += 26;
    }

    this.add.text(480, nextY + 30, "[click để chơi lại]", {
      fontSize: "16px",
      color: "#9ca3af"
    }).setOrigin(0.5);

    this.input.once("pointerdown", () => {
      this.scene.start("MenuScene");
    });
  }
}
