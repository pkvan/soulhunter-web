import Phaser from "phaser";
import { Boss } from "@entities/Boss";
import { GameScene } from "@scenes/GameScene";
import { BossDef } from "@types/index";
import { BossIntroController } from "@systems/BossIntroController";

interface BossIntroSceneData {
  boss: Boss;
  bossDef: BossDef;
  gameScene: GameScene;
  onIntroComplete: () => void; // GameScene tự emit BOSS_SPAWNED/bật lại nút Pause — xem GameScene.onBossIntroComplete()
}

/**
 * Scene song song CHỈ để chạy Boss Intro Cinematic trong khi GameScene bị pause hẳn (xem
 * systems/BossIntroController.ts — toàn bộ logic thật nằm ở đó, scene này chỉ launch + dọn dẹp).
 * Cùng pattern với LevelUpScene/PauseScene: launch từ GameScene, bringToTop, tự stop() khi xong.
 */
export class BossIntroScene extends Phaser.Scene {
  constructor() {
    super("BossIntroScene");
  }

  create(data: BossIntroSceneData): void {
    this.scene.bringToTop();

    const controller = new BossIntroController(this, data.gameScene);
    controller.play(data.boss, data.bossDef, {
      onComplete: () => {
        data.onIntroComplete();
        this.scene.stop();
      }
    });
  }
}
