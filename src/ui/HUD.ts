import Phaser from "phaser";
import { Player } from "@entities/Player";
import { BossSystem } from "@systems/BossSystem";
import { EventBus, GameEvents } from "@utils/EventBus";

/**
 * HUD hiển thị HP bar, thời gian sống, Kills — cố định trên màn hình (setScrollFactor(0)).
 * Boss HP bar + banner announcement lắng nghe EventBus (BOSS_SPAWNED/BOSS_DEFEATED/PLAYER_DIED)
 * thay vì tự poll mỗi frame — ẩn mặc định, chỉ hiện khi thực sự có boss.
 */
export class HUD {
  private hpText: Phaser.GameObjects.Text;
  private timeText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private soulBarBg: Phaser.GameObjects.Rectangle;
  private soulBarFill: Phaser.GameObjects.Rectangle;
  private readonly soulBarWidth = 150;
  private readonly soulBarHeight = 10;
  private readonly soulBarX = 16;
  private readonly soulBarY = 40;

  private bossNameText: Phaser.GameObjects.Text;
  private bossBarBg: Phaser.GameObjects.Rectangle;
  private bossBarFill: Phaser.GameObjects.Rectangle;
  private readonly bossBarWidth = 300;
  private readonly bossBarHeight = 14;
  private bossBarVisible = false;

  private bannerText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene, private player: Player, private bossSystem: BossSystem) {
    this.hpText = scene.add.text(16, 16, "", { fontSize: "14px", color: "#ffffff" }).setScrollFactor(0);

    this.soulBarBg = scene.add.rectangle(
      this.soulBarX, this.soulBarY, this.soulBarWidth, this.soulBarHeight, 0x333333
    ).setOrigin(0, 0).setScrollFactor(0);
    this.soulBarFill = scene.add.rectangle(
      this.soulBarX, this.soulBarY, 0, this.soulBarHeight, 0x8be9fd
    ).setOrigin(0, 0).setScrollFactor(0);

    this.levelText = scene.add.text(this.soulBarX + this.soulBarWidth + 8, this.soulBarY - 3, "", {
      fontSize: "14px", color: "#ffffff"
    }).setScrollFactor(0);

    this.timeText = scene.add.text(16, 60, "", { fontSize: "14px", color: "#ffffff" }).setScrollFactor(0);
    // TODO: thêm HP bar dạng thanh (rectangle fill theo %), không chỉ text
    // TODO: hiện icon các vũ khí đang equip ở góc dưới

    const bossBarX = scene.cameras.main.width / 2;
    this.bossNameText = scene.add.text(bossBarX, 12, "", {
      fontSize: "13px", color: "#ff8a8a"
    }).setOrigin(0.5, 0).setScrollFactor(0).setVisible(false);
    this.bossBarBg = scene.add.rectangle(bossBarX, 28, this.bossBarWidth, this.bossBarHeight, 0x330000)
      .setOrigin(0.5, 0).setScrollFactor(0).setVisible(false);
    this.bossBarFill = scene.add.rectangle(bossBarX, 28, this.bossBarWidth, this.bossBarHeight, 0xef4444)
      .setOrigin(0.5, 0).setScrollFactor(0).setVisible(false);

    this.bannerText = scene.add.text(scene.cameras.main.width / 2, scene.cameras.main.height / 2, "", {
      fontSize: "30px", color: "#ff4444", fontStyle: "bold", align: "center"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);

    EventBus.off(GameEvents.BOSS_SPAWNED, this.onBossSpawned, this);
    EventBus.on(GameEvents.BOSS_SPAWNED, this.onBossSpawned, this);
    EventBus.off(GameEvents.BOSS_DEFEATED, this.hideBossBar, this);
    EventBus.on(GameEvents.BOSS_DEFEATED, this.hideBossBar, this);
    EventBus.off(GameEvents.PLAYER_DIED, this.hideBossBar, this);
    EventBus.on(GameEvents.PLAYER_DIED, this.hideBossBar, this);
  }

  update(survivalTimeMs: number): void {
    this.hpText.setText(`HP: ${Math.max(0, Math.floor(this.player.stats.currentHp))}/${this.player.stats.maxHp}`);

    const { level, soulCount, soulToNextLevel } = this.player.getProgress();
    const soulPercent = Phaser.Math.Clamp(soulCount / soulToNextLevel, 0, 1);
    this.soulBarFill.width = this.soulBarWidth * soulPercent;
    this.levelText.setText(`Lv. ${level}`);

    const mm = Math.floor(survivalTimeMs / 60000);
    const ss = Math.floor((survivalTimeMs % 60000) / 1000);
    this.timeText.setText(`${mm}:${ss.toString().padStart(2, "0")}`);

    if (this.bossBarVisible) {
      const boss = this.bossSystem.getBoss();
      if (boss) {
        const bossHpPercent = Phaser.Math.Clamp(boss.currentHp / boss.maxHp, 0, 1);
        this.bossBarFill.width = this.bossBarWidth * bossHpPercent;
      }
    }
  }

  private onBossSpawned(): void {
    const boss = this.bossSystem.getBoss();
    if (!boss) return; // an toàn, không nên xảy ra vì GameScene emit event ngay sau khi spawnBoss()

    const colorCss = this.toCssColor(boss.color);
    this.bossNameText.setText(boss.name).setColor(colorCss);
    this.bossBarFill.setFillStyle(boss.color);
    this.bossBarFill.width = this.bossBarWidth;
    this.bossBarVisible = true;
    this.bossNameText.setVisible(true);
    this.bossBarBg.setVisible(true);
    this.bossBarFill.setVisible(true);

    this.showBanner(`⚠ ${boss.name.toUpperCase()} XUẤT HIỆN`, colorCss);
  }

  private hideBossBar(): void {
    this.bossBarVisible = false;
    this.bossNameText.setVisible(false);
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
  }

  /** Banner cảnh báo giữa màn hình: scale-in rồi giữ 1 lúc rồi fade-out, kèm rung màn hình nhẹ. */
  private showBanner(text: string, colorCss: string): void {
    this.bannerText.setText(text).setColor(colorCss).setScale(0.5).setAlpha(1);

    this.scene.tweens.add({
      targets: this.bannerText,
      scale: 1,
      duration: 300,
      ease: "Back.Out",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.bannerText,
          alpha: 0,
          delay: 1200,
          duration: 500
        });
      }
    });

    this.scene.cameras.main.shake(300, 0.01);
  }

  private toCssColor(colorNum: number): string {
    return "#" + colorNum.toString(16).padStart(6, "0");
  }
}
