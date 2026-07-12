import Phaser from "phaser";
import charactersData from "@data/characters.json";
import permanentUpgradesData from "@data/permanentUpgrades.json";
import weaponsData from "@data/weapons.json";
import { CharacterDef, PermanentUpgradeDef, WeaponDef } from "@types/index";
import {
  getTotalCoin,
  spendCoin,
  isCharacterUnlocked,
  unlockCharacter,
  getSelectedCharacterId,
  setSelectedCharacterId,
  getPermanentUpgradeCount,
  incrementPermanentUpgrade,
  getPermanentUpgradeTokens,
  usePermanentUpgradeToken
} from "@utils/SaveData";

const characters = charactersData as CharacterDef[];
const permanentUpgrades = permanentUpgradesData as PermanentUpgradeDef[];
const weapons = weaponsData as WeaponDef[];

type Tab = "character" | "upgrade";

/** Màn Unlock: chọn/mở khóa nhân vật + mua Permanent Upgrade bằng Coin (GDD mục 13-14). */
export class UnlockScene extends Phaser.Scene {
  private activeTab: Tab = "character";
  private contentContainer!: Phaser.GameObjects.Container;
  private coinText!: Phaser.GameObjects.Text;
  private tokenText!: Phaser.GameObjects.Text;
  private charTabButton!: Phaser.GameObjects.Text;
  private upgradeTabButton!: Phaser.GameObjects.Text;

  constructor() {
    super("UnlockScene");
  }

  create(): void {
    this.add.text(480, 26, "UNLOCK", { fontSize: "26px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);

    this.coinText = this.add.text(944, 16, "", { fontSize: "16px", color: "#fbbf24", fontStyle: "bold" }).setOrigin(1, 0);
    // Permanent Upgrade Token (từ Daily Login Day4) — trừ token thay vì Coin khi mua ở tab "Nâng cấp vĩnh viễn".
    this.tokenText = this.add.text(944, 38, "", { fontSize: "13px", color: "#8be9fd" }).setOrigin(1, 0);

    const backButton = this.add.text(16, 16, "< Quay lại", { fontSize: "16px", color: "#9ca3af" })
      .setInteractive({ useHandCursor: true });
    backButton.on("pointerdown", () => this.scene.start("MenuScene"));

    this.charTabButton = this.add.text(320, 66, "Nhân vật", { fontSize: "18px", color: "#ffffff" })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.upgradeTabButton = this.add.text(640, 66, "Nâng cấp vĩnh viễn", { fontSize: "18px", color: "#ffffff" })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.charTabButton.on("pointerdown", () => this.switchTab("character"));
    this.upgradeTabButton.on("pointerdown", () => this.switchTab("upgrade"));

    this.contentContainer = this.add.container(0, 0);

    this.switchTab(this.activeTab);
  }

  private switchTab(tab: Tab): void {
    this.activeTab = tab;
    this.charTabButton.setColor(tab === "character" ? "#8be9fd" : "#ffffff");
    this.upgradeTabButton.setColor(tab === "upgrade" ? "#8be9fd" : "#ffffff");
    this.renderContent();
  }

  private updateCoinText(): void {
    this.coinText.setText(`Coin: ${getTotalCoin()}`);
    this.tokenText.setText(`Token: ${getPermanentUpgradeTokens()}`);
  }

  private renderContent(): void {
    this.contentContainer.removeAll(true);
    this.updateCoinText();

    if (this.activeTab === "character") {
      this.renderCharacterGrid();
    } else {
      this.renderUpgradeList();
    }
  }

  private renderCharacterGrid(): void {
    const cardWidth = 168;
    const cardHeight = 260;
    const gap = 18;
    const columns = 5;
    const totalWidth = columns * cardWidth + (columns - 1) * gap;
    const startX = (960 - totalWidth) / 2 + cardWidth / 2;
    const y = 320;
    const selectedId = getSelectedCharacterId();

    characters.forEach((def, index) => {
      const x = startX + index * (cardWidth + gap);
      const unlocked = isCharacterUnlocked(def);
      const isSelected = unlocked && def.id === selectedId;
      const weaponName = weapons.find((w) => w.id === def.startingWeapon)?.name ?? def.startingWeapon;

      const bg = this.add.rectangle(x, y, cardWidth, cardHeight, 0x1f2937, unlocked ? 1 : 0.5)
        .setStrokeStyle(2, isSelected ? 0x4ade80 : 0x374151);

      const nameText = this.add.text(x, y - 105, def.name, {
        fontSize: "16px", color: unlocked ? "#ffffff" : "#9ca3af", fontStyle: "bold", align: "center"
      }).setOrigin(0.5).setAlpha(unlocked ? 1 : 0.6);

      const statsText = this.add.text(x, y - 55,
        `HP: ${def.baseHp}\nTốc độ: ${def.baseMoveSpeed}\nVũ khí: ${weaponName}`,
        { fontSize: "12px", color: "#9ca3af", align: "center" }
      ).setOrigin(0.5).setAlpha(unlocked ? 1 : 0.6);

      this.contentContainer.add([bg, nameText, statsText]);

      if (unlocked) {
        const selectButton = this.add.text(x, y + 40, isSelected ? "ĐANG DÙNG" : "[ Chọn ]", {
          fontSize: "14px",
          color: isSelected ? "#4ade80" : "#8be9fd",
          fontStyle: "bold"
        }).setOrigin(0.5);

        if (!isSelected) {
          selectButton.setInteractive({ useHandCursor: true });
          selectButton.on("pointerdown", () => {
            setSelectedCharacterId(def.id);
            this.renderContent();
          });
        }

        this.contentContainer.add(selectButton);
      } else {
        const coin = getTotalCoin();
        const affordable = coin >= def.unlockCostCoin;

        const costText = this.add.text(x, y + 10, `Giá: ${def.unlockCostCoin} Coin`, {
          fontSize: "13px", color: "#fbbf24"
        }).setOrigin(0.5);

        const unlockButton = this.add.text(x, y + 40, "[ Mở khóa ]", {
          fontSize: "14px",
          color: affordable ? "#4ade80" : "#6b7280",
          fontStyle: "bold"
        }).setOrigin(0.5);

        if (affordable) {
          unlockButton.setInteractive({ useHandCursor: true });
          unlockButton.on("pointerdown", () => {
            if (!spendCoin(def.unlockCostCoin)) return; // an toàn nếu Coin đổi giữa lúc render và click
            unlockCharacter(def.id);
            setSelectedCharacterId(def.id);
            this.renderContent();
          });
        }

        this.contentContainer.add([costText, unlockButton]);
      }
    });
  }

  private renderUpgradeList(): void {
    const startY = 150;
    const rowHeight = 90;
    const coin = getTotalCoin();

    permanentUpgrades.forEach((def, index) => {
      const y = startY + index * rowHeight;
      const count = getPermanentUpgradeCount(def.id);
      const isMaxed = count >= def.maxPurchases;
      const cost = this.calculateUpgradeCost(def, count);
      const affordable = !isMaxed && coin >= cost;

      const bg = this.add.rectangle(480, y, 700, rowHeight - 16, 0x1f2937).setStrokeStyle(1, 0x374151);

      const nameText = this.add.text(200, y, def.name, {
        fontSize: "18px", color: "#ffffff", fontStyle: "bold"
      }).setOrigin(0, 0.5);

      const countText = this.add.text(200, y + 22, `Đã mua: ${count}/${def.maxPurchases} lần`, {
        fontSize: "13px", color: "#9ca3af"
      }).setOrigin(0, 0.5);

      this.contentContainer.add([bg, nameText, countText]);

      const tokens = getPermanentUpgradeTokens();
      if (!isMaxed && tokens > 0) {
        // Permanent Upgrade Token (Daily Login Day4/Boss Loot): mua MIỄN PHÍ 1 lần bằng cách trừ token thay vì Coin.
        const tokenButton = this.add.text(420, y + 22, `[ Dùng Token (${tokens}) ]`, {
          fontSize: "12px", color: "#8be9fd", fontStyle: "bold"
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        tokenButton.on("pointerdown", () => {
          if (!usePermanentUpgradeToken()) return; // an toàn nếu token đổi giữa lúc render và click
          incrementPermanentUpgrade(def.id);
          this.renderContent();
        });
        this.contentContainer.add(tokenButton);
      }

      if (isMaxed) {
        // Đạt giới hạn mua — hiện icon check thay vì giá tiền, không cho bấm nữa.
        const checkIcon = this.add.text(730, y, "✓", {
          fontSize: "22px", color: "#4ade80", fontStyle: "bold"
        }).setOrigin(0.5);
        const maxText = this.add.text(780, y, "MAX", {
          fontSize: "13px", color: "#4ade80", fontStyle: "bold"
        }).setOrigin(0.5);
        this.contentContainer.add([checkIcon, maxText]);
        return;
      }

      const costText = this.add.text(680, y, `${cost} Coin`, {
        fontSize: "16px", color: "#fbbf24"
      }).setOrigin(0.5);

      const buyButton = this.add.text(780, y, "[ Mua ]", {
        fontSize: "16px",
        color: affordable ? "#4ade80" : "#6b7280",
        fontStyle: "bold"
      }).setOrigin(0.5);

      if (affordable) {
        buyButton.setInteractive({ useHandCursor: true });
        buyButton.on("pointerdown", () => {
          if (!spendCoin(cost)) return;
          incrementPermanentUpgrade(def.id);
          this.renderContent();
        });
      }

      this.contentContainer.add([costText, buyButton]);
    });
  }

  /** Giá tăng dần theo số lần đã mua: baseCostCoin * costMultiplier^count, làm tròn. */
  private calculateUpgradeCost(def: PermanentUpgradeDef, count: number): number {
    return Math.round(def.baseCostCoin * Math.pow(def.costMultiplier, count));
  }
}
