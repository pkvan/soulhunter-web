import Phaser from "phaser";
import { Boss } from "@entities/Boss";
import { GAMEPLAY } from "@config/GameConfig";

/**
 * Điều phối TOÀN BỘ trình tự cinematic khi Final Boss chết — Zoom Camera → Slow Motion + Boss tan biến →
 * Restore TimeScale → gọi onComplete(). Tách hẳn khỏi GameScene để logic không rải rác qua nhiều private
 * method + setTimeout lồng nhau. Không biết gì về map/scene-transition/UI Victory — GameScene tự quyết định
 * làm gì sau khi cinematic xong (markMapCleared, chuyển VictoryScene).
 *
 * setTimeout() THUẦN JAVASCRIPT (không scene.time.delayedCall) cho mốc chờ SAU KHI đã hạ timeScale — vì
 * scene.time.delayedCall bị chính timeScale đó làm sai lệch thời gian thật (Clock nhân delta với timeScale
 * trước khi cộng dồn elapsed của TimerEvent). this.tweens và Camera FX (pan/zoomTo) không bị ảnh hưởng bởi
 * time.timeScale nên duration truyền cho chúng luôn là thời gian thật — xem ARCHITECTURE.md.
 */
export class VictoryController {
  constructor(private scene: Phaser.Scene) {}

  /**
   * boss đã đứng yên tuyệt đối trước khi hàm này được gọi (Boss.stopForDeathCutscene() chạy ở
   * BossSystem.killBoss() TRƯỚC KHI emit FINAL_BOSS_DEFEATED) — velocity 0, physics tắt, tween cũ huỷ,
   * isDying=true chặn update(), nên boss.sprite.x/y chắc chắn không đổi nữa trong suốt cinematic.
   */
  playBossDeathCinematic(boss: Boss, onComplete: () => void): void {
    this.zoomCamera(boss);

    setTimeout(() => {
      this.startSlowMotionAndDissolve(boss, onComplete);
    }, GAMEPLAY.VICTORY_ZOOM_MS);
  }

  private zoomCamera(boss: Boss): void {
    const camera = this.scene.cameras.main;
    camera.stopFollow();
    camera.pan(boss.sprite.x, boss.sprite.y, GAMEPLAY.VICTORY_ZOOM_MS, "Sine.easeInOut");
    camera.zoomTo(GAMEPLAY.VICTORY_ZOOM_LEVEL, GAMEPLAY.VICTORY_ZOOM_MS, "Sine.easeInOut");
  }

  private startSlowMotionAndDissolve(boss: Boss, onComplete: () => void): void {
    this.scene.time.timeScale = GAMEPLAY.VICTORY_SLOWMO_TIMESCALE;
    this.scene.physics.world.timeScale = GAMEPLAY.VICTORY_SLOWMO_TIMESCALE;

    const dissolveMs = GAMEPLAY.VICTORY_CINEMATIC_TOTAL_MS - GAMEPLAY.VICTORY_ZOOM_MS;
    this.playDissolveEffect(boss, dissolveMs);
    this.spawnSoulParticles(boss.sprite.x, boss.sprite.y, dissolveMs);

    setTimeout(() => {
      this.finish(boss, onComplete);
    }, dissolveMs);
  }

  /** Boss fade dần + thu nhỏ, kèm 1 vòng glow nhẹ giãn ra rồi tan — tất cả bằng this.tweens (thời gian thật, không phụ thuộc timeScale). */
  private playDissolveEffect(boss: Boss, durationMs: number): void {
    const glow = this.scene.add.circle(boss.sprite.x, boss.sprite.y, 40, boss.color, 0.35).setDepth((boss.sprite.depth ?? 0) - 1);
    this.scene.tweens.add({
      targets: glow,
      scale: 2,
      alpha: 0,
      duration: durationMs,
      ease: "Sine.easeOut",
      onComplete: () => glow.destroy()
    });

    this.scene.tweens.add({
      targets: boss.sprite,
      alpha: 0,
      scale: 0.3,
      duration: durationMs,
      ease: "Sine.easeIn"
    });
  }

  /** Vài đốm sáng nhỏ bay thẳng lên rồi tan dần — hiệu ứng "linh hồn thoát ra", đơn giản, không setInterval. */
  private spawnSoulParticles(x: number, y: number, windowMs: number): void {
    for (let i = 0; i < GAMEPLAY.VICTORY_PARTICLE_COUNT; i++) {
      const delay = Phaser.Math.Between(0, windowMs * 0.6);
      const offsetX = Phaser.Math.Between(-20, 20);
      const particle = this.scene.add.circle(x + offsetX, y, Phaser.Math.Between(2, 4), 0xe0f2fe, 0.9).setDepth(50);
      this.scene.tweens.add({
        targets: particle,
        y: y - Phaser.Math.Between(60, 110),
        alpha: 0,
        duration: windowMs * 0.7,
        delay,
        ease: "Sine.easeOut",
        onComplete: () => particle.destroy()
      });
    }
  }

  private finish(boss: Boss, onComplete: () => void): void {
    this.scene.time.timeScale = 1;
    this.scene.physics.world.timeScale = 1;
    boss.destroy();
    onComplete();
  }
}
