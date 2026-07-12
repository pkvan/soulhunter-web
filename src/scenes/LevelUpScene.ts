import Phaser from "phaser";
import { GameScene } from "@scenes/GameScene";
import { UpgradeSystem } from "@systems/UpgradeSystem";
import { LevelUpCard } from "@ui/LevelUpCard";
import { EventBus, GameEvents } from "@utils/EventBus";
import fusionsData from "@data/fusions.json";
import { FusionDef, UpgradeDef, UpgradeChoice, WeaponChoice } from "@types/index";

const fusions = fusionsData as FusionDef[];

type CardData = UpgradeChoice | { fusion: true; fusionId: string; def: FusionDef };

/**
 * Chạy song song GameScene (this.scene.launch, không stop GameScene)
 * Pause physics của GameScene khi hiện, resume khi chọn xong.
 * Logic chọn 3 upgrade (bao gồm ưu tiên fusion nếu điều kiện khớp) nằm ở UpgradeSystem/FusionSystem —
 * scene này chỉ chịu trách nhiệm hiển thị và nhận input người chơi.
 */
export class LevelUpScene extends Phaser.Scene {
  private cards: LevelUpCard[] = [];
  private overlay?: Phaser.GameObjects.Rectangle;
  private isShowingChoices = false;

  constructor() {
    super("LevelUpScene");
  }

  create(): void {
    this.isShowingChoices = false;
    EventBus.off(GameEvents.LEVEL_UP, this.showChoices, this); // tránh đăng ký trùng khi GameScene chơi lại (launch lại LevelUpScene)
    EventBus.on(GameEvents.LEVEL_UP, this.showChoices, this);
  }

  private showChoices(): void {
    // Bảo vệ chống LEVEL_UP bắn dồn dập (vd nhặt 2 Soul cùng frame trước khi pause() kịp có hiệu lực)
    // gây chồng 2 bộ card lên nhau khiến người chơi click nhiều lần vẫn không chọn được đúng thẻ.
    if (this.isShowingChoices) return;

    // Listener EventBus.on(LEVEL_UP) vẫn còn sống dù scene đã stop() (EventBus không thuộc vòng đời Scene) —
    // nếu GameScene vừa stop("LevelUpScene") giữa chừng (vd đang chạy cutscene chiến thắng Final Boss ở
    // GameScene.onFinalBossDefeated) mà đúng lúc đó 1 LEVEL_UP khác bắn ra, showChoices() KHÔNG được phép
    // chạy tiếp trên 1 scene đã ngừng hoạt động — sẽ pause() GameScene giữa cutscene, làm đứng hình tween.
    if (!this.scene.isActive()) return;

    this.isShowingChoices = true;

    this.scene.bringToTop(); // đảm bảo overlay luôn render/nhận input trên GameScene đã pause

    const gameScene = this.scene.get("GameScene") as GameScene;
    gameScene.scene.pause();

    const upgradeSystem = gameScene.getUpgradeSystem();
    const choices = upgradeSystem.rollChoices();

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const spacing = 200;
    const startX = centerX - ((choices.length - 1) * spacing) / 2;

    this.overlay = this.add
      .rectangle(centerX, centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.6)
      .setDepth(0);

    choices.forEach((choice, index) => {
      const cardData: CardData = "fusion" in choice
        ? { ...choice, def: fusions.find((f) => f.id === choice.fusionId)! }
        : choice;

      const card = new LevelUpCard(this, startX + index * spacing, centerY, cardData, () => {
        this.selectChoice(choice, gameScene, upgradeSystem);
      });
      card.container.setDepth(1);
      this.cards.push(card);
    });
  }

  private selectChoice(choice: UpgradeChoice, gameScene: GameScene, upgradeSystem: UpgradeSystem): void {
    if ("fusion" in choice && choice.fusion) {
      const fusionDef = fusions.find((f) => f.id === choice.fusionId);
      if (fusionDef) {
        gameScene.getFusionSystem().applyFusion(gameScene.getPlayer(), fusionDef);
      }
    } else if ("weapon" in choice && choice.weapon) {
      upgradeSystem.applyWeaponChoice(choice as WeaponChoice);
    } else {
      upgradeSystem.applyUpgrade(choice as UpgradeDef);
    }

    this.cards.forEach((card) => card.destroy());
    this.cards = [];
    this.overlay?.destroy();
    this.overlay = undefined;
    this.isShowingChoices = false;

    gameScene.scene.resume();
  }
}
