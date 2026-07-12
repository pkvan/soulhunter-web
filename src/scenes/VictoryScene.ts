import Phaser from "phaser";
import { AchievementDef } from "@types/index";
import { addCoin, addTotalKills, checkAndClaimNewAchievements, getTotalCoin } from "@utils/SaveData";

interface VictorySceneData {
  characterId: string;
  mapId: string;
  nextMapId?: string; // undefined = đây là map cuối cùng, ẩn nút "Map tiếp theo"
  survivalTimeMs: number;
  kills: number;
  coinEarned: number;
  highestCombo: number;
}

/**
 * Màn hình sau khi hạ Final Boss — thay thế hẳn nhánh "victory" cũ trong GameOverScene (đã xoá). Vào scene
 * này SAU KHI VictoryController đã chạy xong Boss Death Cinematic (GameScene.onVictoryCinematicComplete()).
 * Cộng Coin/Achievement giống hệt logic GameOverScene đang dùng cho thua trận (tái sử dụng SaveData, không
 * viết công thức mới). Chỉ hiện nút hành động SAU KHI animation "VICTORY" chạy xong.
 */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super("VictoryScene");
  }

  create(data: VictorySceneData): void {
    this.add.rectangle(480, 270, 960, 540, 0x0a1a0f);

    addCoin(data.coinEarned);
    const totalKills = addTotalKills(data.kills);
    const newAchievements = checkAndClaimNewAchievements(totalKills);
    const totalCoin = getTotalCoin();

    this.showVictoryTitle(() => this.renderResultsAndActions(data, totalCoin, newAchievements));
  }

  /** "VICTORY" scale-in + glow nhẹ, giữ 1 lúc rồi mờ dần thành tiêu đề cố định phía trên — animation viết mới, không dùng lại banner cũ. */
  private showVictoryTitle(onDone: () => void): void {
    const title = this.add.text(480, 270, "VICTORY", {
      fontSize: "56px",
      color: "#fbbf24",
      fontStyle: "bold"
    }).setOrigin(0.5).setScale(0.2).setAlpha(0);

    const glow = this.add.text(480, 270, "VICTORY", {
      fontSize: "56px",
      color: "#fef3c7",
      fontStyle: "bold"
    }).setOrigin(0.5).setScale(0.2).setAlpha(0);

    this.tweens.add({
      targets: [title, glow],
      scale: 1,
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: "Back.easeOut"
    });
    this.tweens.add({
      targets: glow,
      alpha: 0,
      scale: 1.3,
      duration: 700,
      delay: 500,
      ease: "Sine.easeOut"
    });

    this.tweens.add({
      targets: title,
      y: 110,
      scale: 0.6,
      duration: 400,
      delay: 900,
      ease: "Sine.easeInOut",
      onComplete: onDone
    });
  }

  private renderResultsAndActions(data: VictorySceneData, totalCoin: number, newAchievements: AchievementDef[]): void {
    const mm = Math.floor(data.survivalTimeMs / 60000);
    const ss = Math.floor((data.survivalTimeMs % 60000) / 1000);

    const rows: [string, string][] = [
      ["Survival", `${mm}:${ss.toString().padStart(2, "0")}`],
      ["Kills", `${data.kills}`],
      ["Highest Combo", `x${data.highestCombo}`],
      ["Coin kiếm được", `+${data.coinEarned}`]
    ];

    const startY = 190;
    const rowHeight = 32;
    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];
      const y = startY + i * rowHeight;
      this.add.text(400, y, label, { fontSize: "17px", color: "#9ca3af" }).setOrigin(1, 0.5);
      this.add.text(420, y, value, { fontSize: "17px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0, 0.5);
    }

    let nextY = startY + rows.length * rowHeight + 14;
    this.add.text(480, nextY, `Tổng Coin: ${totalCoin}`, {
      fontSize: "18px", color: "#fbbf24", fontStyle: "bold"
    }).setOrigin(0.5);
    nextY += 30;

    for (const achievement of newAchievements) {
      this.add.text(480, nextY, `🏆 Achievement Unlocked: ${achievement.name} (+${achievement.rewardCoin} Coin)`, {
        fontSize: "14px", color: "#4ade80", fontStyle: "bold"
      }).setOrigin(0.5);
      nextY += 24;
    }

    this.renderActionButtons(data, nextY + 30);
  }

  private renderActionButtons(data: VictorySceneData, y: number): void {
    const buttons: { label: string; color: string; onClick: () => void }[] = [
      {
        label: "[ Chơi lại ]",
        color: "#60a5fa",
        onClick: () => this.scene.start("GameScene", { characterId: data.characterId, mapId: data.mapId })
      },
      {
        // Không vào thẳng GameScene — luôn qua MapSelectScene để người chơi chủ động bấm "Bắt đầu".
        // MapSelectScene tự chọn sẵn map vừa mở khóa (preselectMapId); nếu đây là map cuối cùng
        // (data.nextMapId undefined), MapSelectScene tự fallback getLatestUnlockedMap().
        label: "[ Map tiếp theo ]",
        color: "#4ade80",
        onClick: () => this.scene.start("MapSelectScene", { preselectMapId: data.nextMapId })
      }
    ];

    buttons.push({
      label: "[ Về Menu ]",
      color: "#9ca3af",
      onClick: () => this.scene.start("MenuScene")
    });

    const spacing = 40;
    const startY = y;
    buttons.forEach((btn, i) => {
      const text = this.add.text(480, startY + i * spacing, btn.label, {
        fontSize: "20px",
        color: btn.color,
        fontStyle: "bold"
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0);

      text.on("pointerdown", btn.onClick);
      this.tweens.add({ targets: text, alpha: 1, duration: 250, delay: i * 80 });
    });
  }
}
