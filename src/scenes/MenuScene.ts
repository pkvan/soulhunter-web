import Phaser from "phaser";
import charactersData from "@data/characters.json";
import { CharacterDef, DailyRewardDef, WeaponDef } from "@types/index";
import {
  getTotalCoin,
  getSelectedCharacterId,
  getTotalKills,
  getNextAchievement,
  getDailyChallengeForToday,
  hasClaimedDailyChallengeToday,
  checkAndAdvanceLoginStreak,
  hasPendingLoginReward,
  getLoginStreakDay,
  getDailyRewardForDay,
  claimLoginReward
} from "@utils/SaveData";
import { Challenge7DaysManager } from "@systems/Challenge7DaysManager";

const characters = charactersData as CharacterDef[];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    this.add.text(16, 16, `Coin: ${getTotalCoin()}`, {
      fontSize: "18px",
      color: "#fbbf24",
      fontStyle: "bold"
    });

    this.add.text(480, 180, "SoulHunter", {
      fontSize: "32px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const selectedDef = characters.find((c) => c.id === getSelectedCharacterId()) ?? characters[0];
    this.add.text(480, 240, `Nhân vật: ${selectedDef.name}`, {
      fontSize: "18px",
      color: "#9ca3af"
    }).setOrigin(0.5);

    const unlockButton = this.add.text(480, 290, "[ Chọn nhân vật / Unlock ]", {
      fontSize: "16px",
      color: "#8be9fd"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    unlockButton.on("pointerdown", () => this.scene.start("UnlockScene"));

    const startButton = this.add.text(480, 360, "[ Chọn Map ]", {
      fontSize: "22px",
      color: "#4ade80",
      fontStyle: "bold"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startButton.on("pointerdown", () => {
      this.scene.start("MapSelectScene");
    });

    // Achievement (GDD mục 15): tiến độ giết quái tích lũy qua mọi ván, không phải trong 1 ván.
    const totalKills = getTotalKills();
    const nextAchievement = getNextAchievement(totalKills);
    const achievementLabel = nextAchievement
      ? `Achievement: ${totalKills}/${nextAchievement.killThreshold} quái — ${nextAchievement.name}`
      : `Achievement: đã hoàn thành tất cả (${totalKills} quái)`;
    this.add.text(480, 410, achievementLabel, {
      fontSize: "14px",
      color: "#9ca3af"
    }).setOrigin(0.5);

    // Daily Challenge (GDD mục 15): 1 modifier cố định theo ngày, chơi lại thoải mái nhưng chỉ nhận
    // thưởng Coin nhân hệ số 1 lần/ngày (xem GameScene.computeCoinEarned).
    const challenge = getDailyChallengeForToday();
    const claimedToday = hasClaimedDailyChallengeToday();
    this.add.text(480, 450, `Daily Challenge: ${challenge.name}`, {
      fontSize: "16px",
      color: "#facc15",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this.add.text(480, 472, challenge.description + (claimedToday ? " (đã nhận thưởng hôm nay)" : ""), {
      fontSize: "12px",
      color: "#9ca3af"
    }).setOrigin(0.5);

    const dailyChallengeButton = this.add.text(480, 500, "[ Chơi Daily Challenge ]", {
      fontSize: "16px",
      color: "#facc15"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    dailyChallengeButton.on("pointerdown", () => {
      this.scene.start("GameScene", { characterId: getSelectedCharacterId(), dailyChallengeId: challenge.id });
    });

    // Thử Thách 7 Ngày: mở ngày TUẦN TỰ theo tiến độ hoàn thành nhiệm vụ, khác cơ chế lịch thật của Daily Login Reward.
    const challengeDay = Challenge7DaysManager.getCurrentDay();
    const challengeStars = Challenge7DaysManager.getTotalStars();
    const challengeButton = this.add.text(480, 520, `[ Thử thách 7 ngày — Ngày ${challengeDay} · ${challengeStars}⭐ ]`, {
      fontSize: "14px",
      color: "#facc15"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    challengeButton.on("pointerdown", () => {
      this.scene.launch("Challenge7DaysScene");
    });

    // Đặt góc trên-phải (cùng hàng với Coin góc trái) thay vì xếp thêm vào cột giữa vốn đã gần chạm đáy canvas (540px).
    const collectionButton = this.add.text(944, 16, "[ Collection ]", {
      fontSize: "14px",
      color: "#c4b5fd"
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    collectionButton.on("pointerdown", () => {
      this.scene.launch("CollectionScene");
    });

    // Daily Login Reward (7 ngày): tính streak mới nếu đã sang ngày khác (không tự cộng thưởng), rồi hiện
    // popup "Nhận thưởng" nếu còn phần thưởng hôm nay chưa claim — xem SaveData.checkAndAdvanceLoginStreak().
    checkAndAdvanceLoginStreak();
    if (hasPendingLoginReward()) this.showLoginRewardModal();
  }

  private showLoginRewardModal(): void {
    const currentDay = getLoginStreakDay();
    const elements: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.75);
    const box = this.add.rectangle(480, 270, 660, 320, 0x1f2937, 0.98).setStrokeStyle(2, 0xfbbf24);
    const title = this.add.text(480, 130, "ĐIỂM DANH HÀNG NGÀY", {
      fontSize: "22px", color: "#fbbf24", fontStyle: "bold"
    }).setOrigin(0.5);
    elements.push(overlay, box, title);

    const boxSize = 68;
    const gap = 12;
    const totalW = 7 * boxSize + 6 * gap;
    const startX = 480 - totalW / 2 + boxSize / 2;
    const y = 230;

    for (let day = 1; day <= 7; day++) {
      const reward = getDailyRewardForDay(day);
      const x = startX + (day - 1) * (boxSize + gap);
      const isPast = day < currentDay;
      const isToday = day === currentDay;
      const isSpecial = day === 7;

      const bg = this.add.rectangle(x, y, boxSize, boxSize, isSpecial ? 0x4a1b0c : 0x111827, 1)
        .setStrokeStyle(isToday ? 3 : 1, isToday ? 0x4ade80 : (isSpecial ? 0xd85a30 : 0x374151));
      const dayLabel = this.add.text(x, y - 22, `Day ${day}`, { fontSize: "10px", color: "#9ca3af" }).setOrigin(0.5);
      const coinLabel = this.add.text(x, y, `${reward.coin}`, {
        fontSize: "13px", color: "#fbbf24", fontStyle: "bold"
      }).setOrigin(0.5);
      elements.push(bg, dayLabel, coinLabel);

      if (isPast) {
        elements.push(this.add.text(x, y + 21, "✓", { fontSize: "16px", color: "#4ade80", fontStyle: "bold" }).setOrigin(0.5));
      } else if (isSpecial) {
        // Ô Day 7 luôn có icon ★ riêng biệt để phân biệt (special unlock), dù đã qua hay chưa.
        elements.push(this.add.text(x, y + 21, "★", { fontSize: "16px", color: "#d85a30", fontStyle: "bold" }).setOrigin(0.5));
      }
    }

    const claimButton = this.add.text(480, 355, "[ Nhận thưởng ]", {
      fontSize: "18px", color: "#4ade80", fontStyle: "bold"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    elements.push(claimButton);

    claimButton.on("pointerdown", () => {
      const { reward, unlockedWeapon } = claimLoginReward();
      elements.forEach((el) => el.destroy());
      this.showLoginRewardResult(reward, unlockedWeapon);
    });
  }

  private showLoginRewardResult(reward: DailyRewardDef, unlockedWeapon: WeaponDef | null): void {
    const elements: Phaser.GameObjects.GameObject[] = [];
    const overlay = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.75);
    const box = this.add.rectangle(480, 270, 460, 220, 0x1f2937, 0.98).setStrokeStyle(2, 0x4ade80);
    elements.push(overlay, box);

    const lines = [`+${reward.coin} Coin`];
    if (reward.permanentUpgradeToken) lines.push("+1 Permanent Upgrade Token");
    if (unlockedWeapon) lines.push(`Mở khóa vũ khí đặc biệt: ${unlockedWeapon.name}!`);

    elements.push(this.add.text(480, 250, lines.join("\n"), {
      fontSize: "16px", color: "#ffffff", align: "center", lineSpacing: 8
    }).setOrigin(0.5));

    const closeButton = this.add.text(480, 335, "[ Đóng ]", { fontSize: "16px", color: "#8be9fd" })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    elements.push(closeButton);

    closeButton.on("pointerdown", () => {
      elements.forEach((el) => el.destroy());
      this.scene.restart(); // cập nhật lại Coin/Achievement hiển thị trên Menu sau khi nhận thưởng
    });
  }
}
