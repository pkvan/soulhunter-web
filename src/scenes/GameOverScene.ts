import Phaser from "phaser";
import { RunResult, AchievementDef } from "@types/index";
import { addCoin, addTotalKills, checkAndClaimNewAchievements, getTotalCoin } from "@utils/SaveData";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data: RunResult): void {
    addCoin(data.coinEarned); // cộng dồn Coin ván này vào tổng đã lưu (localStorage)
    const totalKills = addTotalKills(data.kills); // cộng dồn vào tổng số quái đã giết MỌI ván, dùng cho Achievement
    const newAchievements = checkAndClaimNewAchievements(totalKills); // tự cộng thêm rewardCoin nếu vừa đạt mốc mới
    const totalCoin = getTotalCoin(); // đọc lại sau khi achievement (nếu có) đã cộng thêm Coin

    if (data.victory) {
      // Chiến thắng (hạ Final Boss): hiện banner "CHIẾN THẮNG!" nổi bật (vàng gold, scale-in) TRƯỚC,
      // chỉ hiện bảng kết quả Survival/Kills/Coin/Combo sau khi banner đã tự ẩn đi.
      this.showVictoryBanner(() => this.renderResults(data, totalCoin, newAchievements));
    } else {
      this.renderResults(data, totalCoin, newAchievements);
    }
  }

  /** Banner vàng gold to giữa màn hình, scale-in kiểu "Back.easeOut" rồi tự fade sau ~900ms — gọi onDone khi biến mất hẳn. */
  private showVictoryBanner(onDone: () => void): void {
    const overlay = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.92).setDepth(10);
    const bannerBg = this.add.rectangle(480, 270, 700, 150, 0x3a2a06, 1)
      .setStrokeStyle(4, 0xfbbf24).setDepth(11).setScale(0.3).setAlpha(0);
    const bannerText = this.add.text(480, 270, "CHIẾN THẮNG!", {
      fontSize: "48px", color: "#fbbf24", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(12).setScale(0.3).setAlpha(0);

    this.tweens.add({
      targets: [bannerBg, bannerText],
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(900, () => {
          this.tweens.add({
            targets: [overlay, bannerBg, bannerText],
            alpha: 0,
            duration: 400,
            onComplete: () => {
              overlay.destroy();
              bannerBg.destroy();
              bannerText.destroy();
              onDone();
            }
          });
        });
      }
    });
  }

  private renderResults(data: RunResult, totalCoin: number, newAchievements: AchievementDef[]): void {
    const mm = Math.floor(data.survivalTimeMs / 60000);
    const ss = Math.floor((data.survivalTimeMs % 60000) / 1000);

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
