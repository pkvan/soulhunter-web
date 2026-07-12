import Phaser from "phaser";
import { Player } from "@entities/Player";
import { BossSystem } from "@systems/BossSystem";
import { EventBus, GameEvents } from "@utils/EventBus";
import soulCorruptionData from "@data/soulCorruption.json";
import { SoulCorruptionConfig } from "@types/index";

const soulCorruption = soulCorruptionData as SoulCorruptionConfig;

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

  // Soul Corruption (Dark Soul pickup, GDD mục 18): thanh countdown bám theo đầu player (world-space,
  // KHÔNG scrollFactor(0) — phải trôi theo player qua camera) + glow pulse quanh player trong lúc active.
  private corruptionBarBg: Phaser.GameObjects.Rectangle;
  private corruptionBarFill: Phaser.GameObjects.Rectangle;
  private readonly corruptionBarWidth = 40;
  private readonly corruptionBarHeight = 5;
  private readonly corruptionBarOffsetY = 40; // offset từ TÂM sprite (sprite 32x32 origin giữa -> ~24px phía trên đỉnh sprite)
  private corruptionGlow: Phaser.GameObjects.Arc;
  private corruptionGlowActive = false;

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

    // Nút Pause góc phải trên — icon-only (2 thanh dọc), mở PauseScene overlay. Đường kính 44px, đủ lớn để bấm dễ.
    const pauseBtnX = scene.cameras.main.width - 40;
    const pauseBtnY = 30;
    const pauseBg = scene.add.circle(pauseBtnX, pauseBtnY, 22, 0x1f2937, 0.85)
      .setStrokeStyle(2, 0xffffff, 0.5).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });
    const pauseIcon = scene.add.graphics().setScrollFactor(0).setDepth(201);
    pauseIcon.fillStyle(0xffffff, 1);
    pauseIcon.fillRect(pauseBtnX - 7, pauseBtnY - 8, 5, 16);
    pauseIcon.fillRect(pauseBtnX + 2, pauseBtnY - 8, 5, 16);

    pauseBg.on("pointerover", () => pauseBg.setScale(1.08));
    pauseBg.on("pointerout", () => pauseBg.setScale(1));
    pauseBg.on("pointerdown", () => {
      scene.scene.pause();
      scene.scene.launch("PauseScene");
    });

    // Glow phía sau player (depth âm, giống eliteGlow của Enemy) — chỉ hiện + pulse trong lúc Corruption active.
    this.corruptionGlow = scene.add.circle(player.sprite.x, player.sprite.y, 26, 0x9d4edd, 0.25)
      .setDepth(-1).setVisible(false);

    // Bar countdown phía trên đầu player, giống health bar NPC — nền tối để dễ đọc trên mọi nền.
    this.corruptionBarBg = scene.add.rectangle(
      player.sprite.x, player.sprite.y - this.corruptionBarOffsetY,
      this.corruptionBarWidth, this.corruptionBarHeight, 0x1a1a1a, 0.85
    ).setStrokeStyle(1, 0x000000, 0.7).setDepth(50).setVisible(false);
    this.corruptionBarFill = scene.add.rectangle(
      player.sprite.x - this.corruptionBarWidth / 2, player.sprite.y - this.corruptionBarOffsetY,
      this.corruptionBarWidth, this.corruptionBarHeight, 0x9d4edd
    ).setOrigin(0, 0.5).setDepth(51).setVisible(false);

    EventBus.off(GameEvents.BOSS_SPAWNED, this.onBossSpawned, this);
    EventBus.on(GameEvents.BOSS_SPAWNED, this.onBossSpawned, this);
    EventBus.off(GameEvents.BOSS_DEFEATED, this.hideBossBar, this);
    EventBus.on(GameEvents.BOSS_DEFEATED, this.hideBossBar, this);
    EventBus.off(GameEvents.PLAYER_DIED, this.hideBossBar, this);
    EventBus.on(GameEvents.PLAYER_DIED, this.hideBossBar, this);
  }

  /**
   * BẮT BUỘC gọi trước khi tạo HUD mới cho ván tiếp theo (xem GameScene.create()). HUD là object tạo mới
   * mỗi ván (khác với GameScene/LevelUpScene là scene singleton tự dedupe qua this) — nếu không hủy đăng ký,
   * instance HUD của ván trước vẫn còn lắng nghe EventBus và sẽ thao tác lên các GameObject đã bị Phaser
   * destroy khi scene shutdown, ném lỗi giữa vòng lặp render và làm treo toàn bộ game (rAF không tự gọi lại).
   */
  public destroy(): void {
    EventBus.off(GameEvents.BOSS_SPAWNED, this.onBossSpawned, this);
    EventBus.off(GameEvents.BOSS_DEFEATED, this.hideBossBar, this);
    EventBus.off(GameEvents.PLAYER_DIED, this.hideBossBar, this);
  }

  update(survivalTimeMs: number, corruptionRemainingMs = 0): void {
    this.hpText.setText(`HP: ${Math.max(0, Math.floor(this.player.stats.currentHp))}/${this.player.stats.maxHp}`);

    const { level, soulCount, soulToNextLevel, isMaxLevel } = this.player.getProgress();
    if (isMaxLevel) {
      // Đạt Max Level — bar cố định đầy, đổi màu vàng để phân biệt rõ với trạng thái đang lên cấp bình thường.
      this.soulBarFill.width = this.soulBarWidth;
      this.soulBarFill.setFillStyle(0xfbbf24);
      this.levelText.setText("MAX LEVEL");
    } else {
      const soulPercent = Phaser.Math.Clamp(soulCount / soulToNextLevel, 0, 1);
      this.soulBarFill.width = this.soulBarWidth * soulPercent;
      this.soulBarFill.setFillStyle(0x8be9fd);
      this.levelText.setText(`Lv. ${level}`);
    }

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

    this.updateCorruptionVisuals(corruptionRemainingMs);
  }

  /** Theo dõi vị trí player MỖI FRAME (bar/glow world-space, không cố định màn hình) — xem field comment ở trên. */
  private updateCorruptionVisuals(corruptionRemainingMs: number): void {
    const px = this.player.sprite.x;
    const barY = this.player.sprite.y - this.corruptionBarOffsetY;
    this.corruptionBarBg.setPosition(px, barY);
    this.corruptionBarFill.setPosition(px - this.corruptionBarWidth / 2, barY);
    this.corruptionGlow.setPosition(this.player.sprite.x, this.player.sprite.y);

    if (corruptionRemainingMs > 0) {
      const percent = Phaser.Math.Clamp(corruptionRemainingMs / soulCorruption.corruptionDurationMs, 0, 1);
      this.corruptionBarFill.width = this.corruptionBarWidth * percent;
      this.corruptionBarBg.setVisible(true);
      this.corruptionBarFill.setVisible(true);

      if (!this.corruptionGlowActive) {
        this.corruptionGlowActive = true;
        this.corruptionGlow.setScale(1).setVisible(true);
        this.scene.tweens.killTweensOf(this.corruptionGlow);
        this.scene.tweens.add({
          targets: this.corruptionGlow,
          scale: 1.3,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
      }
    } else {
      this.corruptionBarBg.setVisible(false);
      this.corruptionBarFill.setVisible(false);
      if (this.corruptionGlowActive) {
        this.corruptionGlowActive = false;
        this.scene.tweens.killTweensOf(this.corruptionGlow);
        this.corruptionGlow.setVisible(false);
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
