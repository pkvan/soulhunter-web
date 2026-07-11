import Phaser from "phaser";
import charactersData from "@data/characters.json";
import { CharacterDef } from "@types/index";
import {
  getTotalCoin,
  getSelectedCharacterId,
  getTotalKills,
  getNextAchievement,
  getDailyChallengeForToday,
  hasClaimedDailyChallengeToday
} from "@utils/SaveData";

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

    const startButton = this.add.text(480, 360, "[ Click để bắt đầu ]", {
      fontSize: "22px",
      color: "#4ade80",
      fontStyle: "bold"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startButton.on("pointerdown", () => {
      this.scene.start("GameScene", { characterId: getSelectedCharacterId() });
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
  }
}
