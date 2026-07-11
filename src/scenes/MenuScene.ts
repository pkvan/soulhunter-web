import Phaser from "phaser";
import charactersData from "@data/characters.json";
import { CharacterDef } from "@types/index";
import { getTotalCoin, getSelectedCharacterId } from "@utils/SaveData";

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
  }
}
