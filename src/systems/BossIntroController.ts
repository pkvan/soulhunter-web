import Phaser from "phaser";
import { Boss } from "@entities/Boss";
import { GameScene } from "@scenes/GameScene";
import { BossDef } from "@types/index";
import { GAMEPLAY } from "@config/GameConfig";

export interface BossIntroCallbacks {
  /** Gọi SAU KHI gameplay đã resume (BossIntroController tự resume) — GameScene chỉ dùng để emit
   * BOSS_SPAWNED/bật lại nút Pause, KHÔNG tự resume lại lần nữa. */
  onComplete: () => void;
}

/** Kết quả phân bổ ngân sách thời gian cho typewriter — xem computeTypewriterTiming(). */
interface TypewriterTiming {
  msPerChar: number;
  holdMs: number;
}

/**
 * Điều phối TOÀN BỘ Boss Intro Cinematic — Pause gameplay -> Shake/Flash -> Camera pan+zoom tới Boss ->
 * Vignette FX + overlay dungeon + hạt bụi/tro tối dần -> Boss idle animation -> Tên + đoạn giới thiệu
 * (typewriter, skip được, kèm nhịp tim "thình...thình..." lúc hold) -> Camera quay lại Player -> Resume
 * gameplay. Tách hẳn khỏi Boss/GameScene (đúng tinh thần VictoryController) — Boss không biết gì về
 * cinematic, GameScene chỉ gọi play() rồi nhận lại onComplete().
 *
 * Chạy trong BossIntroScene (scene song song, xem scenes/BossIntroScene.ts) trong khi GameScene bị
 * scene.pause() HẲN — mọi tween/timer ở đây dùng this.scene (BossIntroScene) nên KHÔNG bị pause theo,
 * và tự mutate trực tiếp scrollX/scrollY/zoom của camera GameScene (thay vì gọi camera.pan()/zoomTo() —
 * FX built-in của Camera phụ thuộc update loop của scene sở hữu nó, không đảm bảo chạy khi scene đó pause).
 *
 * VIGNETTE dùng Camera Post FX built-in của Phaser (`camera.postFX.addVignette()`, WebGL, có sẵn từ
 * Phaser 3.60+, không thêm dependency) thay vì tự vẽ nhiều vòng tròn bằng Graphics — mượt hơn nhiều vì
 * chạy trên GPU. `Phaser.FX.Vignette` là 1 object thường với property `strength` (number) nên tween trực
 * tiếp được y hệt mọi object khác (`this.scene.tweens.add({ targets: vignetteFX, strength: ... })`),
 * KHÔNG cần vòng lặp update thủ công để "giả tween" property đó.
 *
 * Cấu hình riêng theo từng Boss đọc từ BossDef (introText/introCameraZoom trong bosses.json), KHÔNG
 * hardcode trong class này — hằng số dùng chung (tốc độ pan, cường độ shake, TỔNG thời lượng cố định...)
 * nằm ở GameConfig.ts GAMEPLAY.BOSS_INTRO_*, tái sử dụng được cho mọi Boss sau này.
 *
 * TỔNG THỜI LƯỢNG CỐ ĐỊNH (GAMEPLAY.BOSS_INTRO_TOTAL_MS, mặc định 6500ms) cho MỌI boss bất kể introText
 * dài ngắn khác nhau — xem computeTypewriterTiming(): ngân sách pan-in (BOSS_INTRO_CAMERA_PAN_MS) và
 * return (BOSS_INTRO_RETURN_MS) cố định, phần còn lại chia cho typewriter+hold theo công thức động.
 */
export class BossIntroController {
  private idleTweens: Phaser.Tweens.Tween[] = [];
  private idleGlow?: Phaser.GameObjects.Arc;
  private idleGlowDark?: Phaser.GameObjects.Arc;
  private skipHandler?: () => void;
  private titleObj?: Phaser.GameObjects.Text;
  private textObj?: Phaser.GameObjects.Text;
  private heartbeatActive = false;
  private ashParticlesActive = false;
  private ashParticles: Phaser.GameObjects.Arc[] = [];

  constructor(private scene: Phaser.Scene, private gameScene: GameScene) {}

  /**
   * Tính tốc độ gõ (ms/ký tự) + hold time sao cho typewriter + hold LUÔN cộng lại đúng `budgetMs` —
   * 70% ngân sách dành cho gõ chữ (kẹp MIN-MAX ms/ký tự để không quá nhanh/chậm mất chất điện ảnh),
   * phần dư (30% hoặc dư ra nếu text ngắn/dài bị kẹp) dùng làm hold. Không hardcode rải rác trong
   * showNameAndText() — 1 nguồn tính toán duy nhất, dễ test độc lập.
   */
  private computeTypewriterTiming(textLength: number, budgetMs: number): TypewriterTiming {
    const rawMsPerChar = (budgetMs * GAMEPLAY.BOSS_INTRO_TYPEWRITER_BUDGET_RATIO) / Math.max(1, textLength);
    const msPerChar = Phaser.Math.Clamp(
      rawMsPerChar,
      GAMEPLAY.BOSS_INTRO_TYPEWRITER_MIN_MS_PER_CHAR,
      GAMEPLAY.BOSS_INTRO_TYPEWRITER_MAX_MS_PER_CHAR
    );
    const typeMs = msPerChar * textLength;
    const holdMs = Math.max(0, budgetMs - typeMs);
    return { msPerChar, holdMs };
  }

  play(boss: Boss, bossDef: BossDef, callbacks: BossIntroCallbacks): void {
    // DEBUG TẠM THỜI — đo tổng thời gian thật từ play() tới onComplete() để verify khớp
    // GAMEPLAY.BOSS_INTRO_TOTAL_MS (~6500ms) dù introText dài ngắn khác nhau. Xoá console.time/timeEnd
    // này sau khi verify xong, không phải debug feature vĩnh viễn trong build.
    console.time(`[BossIntro] ${bossDef.id}`);

    const camera = this.gameScene.cameras.main;
    camera.stopFollow();
    const startZoom = camera.zoom;
    const startCenterX = camera.scrollX + camera.width / 2 / startZoom;
    const startCenterY = camera.scrollY + camera.height / 2 / startZoom;

    // Overlay màu dungeon (xanh tím tối, thay vì đen thuần) — kết hợp với Vignette FX bên dưới: overlay
    // phủ tông màu đều khắp màn hình, Vignette FX lo phần tối viền mượt (GPU).
    const overlay = this.scene.add.rectangle(480, 270, 960, 540, 0x0d0614, 0).setDepth(0);
    const vignetteFX = camera.postFX.addVignette(0.5, 0.5, GAMEPLAY.BOSS_INTRO_VIGNETTE_RADIUS, 0);

    this.startAshParticles();

    this.shakeCamera(camera, GAMEPLAY.BOSS_INTRO_SHAKE_MS, GAMEPLAY.BOSS_INTRO_SHAKE_INTENSITY, () => {
      this.flashDark();
    });

    this.scene.tweens.add({ targets: overlay, alpha: GAMEPLAY.BOSS_INTRO_OVERLAY_ALPHA, duration: GAMEPLAY.BOSS_INTRO_OVERLAY_FADE_MS });
    this.scene.tweens.add({ targets: vignetteFX, strength: GAMEPLAY.BOSS_INTRO_VIGNETTE_STRENGTH, duration: GAMEPLAY.BOSS_INTRO_OVERLAY_FADE_MS });

    const targetZoom = bossDef.introCameraZoom ?? GAMEPLAY.BOSS_INTRO_DEFAULT_ZOOM;
    this.panAndZoomTo(camera, boss.sprite.x, boss.sprite.y, targetZoom, GAMEPLAY.BOSS_INTRO_CAMERA_PAN_MS, "Sine.easeInOut", () => {
      this.startBossIdleAnimation(boss);
      this.showNameAndText(bossDef, camera, overlay, vignetteFX, () => {
        this.returnToGameplay(camera, startCenterX, startCenterY, startZoom, overlay, vignetteFX, boss, () => {
          console.timeEnd(`[BossIntro] ${bossDef.id}`); // DEBUG TẠM THỜI — xem comment ở play()
          callbacks.onComplete();
        });
      });
    });
  }

  // ---------- Bước 1-2: Shake + Flash + Camera pan/zoom ----------

  private shakeCamera(camera: Phaser.Cameras.Scene2D.Camera, durationMs: number, intensity: number, onComplete: () => void): void {
    const baseX = camera.scrollX;
    const baseY = camera.scrollY;
    const tickMs = 30;
    const ticks = Math.max(1, Math.floor(durationMs / tickMs));
    this.scene.time.addEvent({
      delay: tickMs,
      repeat: ticks - 1,
      callback: () => {
        camera.scrollX = baseX + Phaser.Math.Between(-intensity, intensity);
        camera.scrollY = baseY + Phaser.Math.Between(-intensity, intensity);
      }
    });
    this.scene.time.delayedCall(durationMs, () => {
      camera.scrollX = baseX;
      camera.scrollY = baseY;
      onComplete();
    });
  }

  private flashDark(): void {
    const flash = this.scene.add.rectangle(480, 270, 960, 540, 0x000000, 1).setDepth(50);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration: GAMEPLAY.BOSS_INTRO_FLASH_MS, onComplete: () => flash.destroy() });
  }

  /** Tween thủ công scrollX/scrollY/zoom bằng camera.centerOn() mỗi tick — KHÔNG dùng camera.pan()/zoomTo() built-in (xem docblock đầu file). */
  private panAndZoomTo(
    camera: Phaser.Cameras.Scene2D.Camera,
    targetX: number,
    targetY: number,
    targetZoom: number,
    durationMs: number,
    ease: string,
    onComplete: () => void
  ): void {
    const startZoom = camera.zoom;
    const startCenterX = camera.scrollX + camera.width / 2 / startZoom;
    const startCenterY = camera.scrollY + camera.height / 2 / startZoom;
    const state = { t: 0 };
    this.scene.tweens.add({
      targets: state,
      t: 1,
      duration: durationMs,
      ease,
      onUpdate: () => {
        camera.zoom = Phaser.Math.Linear(startZoom, targetZoom, state.t);
        camera.centerOn(
          Phaser.Math.Linear(startCenterX, targetX, state.t),
          Phaser.Math.Linear(startCenterY, targetY, state.t)
        );
      },
      onComplete
    });
  }

  // ---------- Hạt bụi/tro bay (suốt cinematic, dừng lúc returnToGameplay) ----------

  private startAshParticles(): void {
    this.ashParticlesActive = true;
    const INITIAL_COUNT = 18;
    for (let i = 0; i < INITIAL_COUNT; i++) {
      this.scene.time.delayedCall(Phaser.Math.Between(0, 2200), () => this.spawnAshParticle());
    }
  }

  private spawnAshParticle(): void {
    if (!this.ashParticlesActive) return;
    const x = Phaser.Math.Between(0, 960);
    const y = Phaser.Math.Between(540, 620);
    const size = Phaser.Math.Between(1, 3);
    const particle = this.scene.add.circle(x, y, size, 0xa8998a, Phaser.Math.FloatBetween(0.15, 0.35)).setDepth(3);
    this.ashParticles.push(particle);

    this.scene.tweens.add({
      targets: particle,
      y: y - Phaser.Math.Between(400, 620),
      x: x + Phaser.Math.Between(-20, 20),
      alpha: 0,
      duration: Phaser.Math.Between(3500, 6500),
      ease: "Sine.easeOut",
      onComplete: () => {
        particle.destroy();
        this.ashParticles = this.ashParticles.filter((p) => p !== particle);
        if (this.ashParticlesActive) this.spawnAshParticle();
      }
    });
  }

  private stopAshParticles(): void {
    this.ashParticlesActive = false;
    this.ashParticles.forEach((p) => {
      this.scene.tweens.killTweensOf(p);
      p.destroy();
    });
    this.ashParticles = [];
  }

  // ---------- Bước 5: Boss idle animation ----------

  private startBossIdleAnimation(boss: Boss): void {
    const sprite = boss.sprite;
    this.idleGlow = this.scene.add.circle(sprite.x, sprite.y, 46, boss.color, 0.35).setDepth(2);
    // Lớp glow phụ màu đỏ tối phía sau glow chính, pulse chậm hơn — tạo cảm giác "khí xấu" toả ra từ boss.
    this.idleGlowDark = this.scene.add.circle(sprite.x, sprite.y, 60, 0x3a0000, 0.25).setDepth(1);
    this.idleTweens = [
      this.scene.tweens.add({ targets: sprite, y: sprite.y - 6, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }),
      this.scene.tweens.add({ targets: sprite, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }),
      this.scene.tweens.add({ targets: this.idleGlow, alpha: 0.6, scale: 1.25, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }),
      this.scene.tweens.add({ targets: this.idleGlowDark, alpha: 0.45, scale: 1.4, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" })
    ];
  }

  private stopBossIdleAnimation(): void {
    this.idleTweens.forEach((t) => t.stop());
    this.idleTweens = [];
    this.idleGlow?.destroy();
    this.idleGlow = undefined;
    this.idleGlowDark?.destroy();
    this.idleGlowDark = undefined;
  }

  // ---------- Nhịp tim (chỉ chạy trong lúc hold) ----------

  /**
   * "Thình...thình... (nghỉ)..." — 2 nhịp nhanh cách nhau 150ms rồi nghỉ 700ms, lặp lại suốt hold. Mỗi
   * nhịp: overlay.alpha VÀ vignetteFX.strength cùng nhích lên (+= delta, yoyo nhanh — 2 tween riêng vì
   * khác tên property, không gộp chung 1 tween được) kèm camera rung cực nhẹ (2-3px, ~80ms, tái dùng
   * shakeCamera()). Chỉ chạy trong hold, dừng hẳn trước returnToGameplay() (xem stopHeartbeat).
   */
  private startHeartbeat(camera: Phaser.Cameras.Scene2D.Camera, overlay: Phaser.GameObjects.Rectangle, vignetteFX: Phaser.FX.Vignette): void {
    this.heartbeatActive = true;
    const BEAT_GAP_MS = 150;
    const REST_MS = 700;

    const scheduleCycle = () => {
      if (!this.heartbeatActive) return;
      this.pulseBeat(camera, overlay, vignetteFX);
      this.scene.time.delayedCall(BEAT_GAP_MS, () => {
        if (!this.heartbeatActive) return;
        this.pulseBeat(camera, overlay, vignetteFX);
        this.scene.time.delayedCall(REST_MS, scheduleCycle);
      });
    };
    scheduleCycle();
  }

  private pulseBeat(camera: Phaser.Cameras.Scene2D.Camera, overlay: Phaser.GameObjects.Rectangle, vignetteFX: Phaser.FX.Vignette): void {
    this.scene.tweens.add({ targets: overlay, alpha: "+=0.08", duration: 70, yoyo: true, ease: "Sine.easeOut" });
    this.scene.tweens.add({ targets: vignetteFX, strength: "+=0.3", duration: 70, yoyo: true, ease: "Sine.easeOut" });
    this.shakeCamera(camera, 80, 3, () => {});
  }

  private stopHeartbeat(overlay: Phaser.GameObjects.Rectangle, vignetteFX: Phaser.FX.Vignette, baseOverlayAlpha: number): void {
    this.heartbeatActive = false;
    this.scene.tweens.killTweensOf(overlay);
    this.scene.tweens.killTweensOf(vignetteFX);
    overlay.setAlpha(baseOverlayAlpha);
    vignetteFX.strength = GAMEPLAY.BOSS_INTRO_VIGNETTE_STRENGTH;
  }

  // ---------- Bước 4: Tên + typewriter ----------

  private showNameAndText(
    bossDef: BossDef,
    camera: Phaser.Cameras.Scene2D.Camera,
    overlay: Phaser.GameObjects.Rectangle,
    vignetteFX: Phaser.FX.Vignette,
    onDone: () => void
  ): void {
    const title = this.scene.add
      .text(480, 190, `— ${bossDef.name.toUpperCase()} —`, {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "42px",
        color: "#f5d67a",
        fontStyle: "bold",
        stroke: "#1a0f00",
        strokeThickness: 8,
        shadow: { offsetX: 0, offsetY: 3, color: "#000000", blur: 10, fill: true }
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setScale(0.7)
      .setAlpha(0);

    this.scene.tweens.add({ targets: title, alpha: 1, scale: 1, duration: GAMEPLAY.BOSS_INTRO_TITLE_POP_MS, ease: "Back.easeOut" });

    const introText = bossDef.introText ?? "A powerful enemy blocks your path...";

    // Ngân sách CỐ ĐỊNH cho typewriter+hold = TOTAL - pan-in - return, luôn cho tổng thời lượng thật
    // ~GAMEPLAY.BOSS_INTRO_TOTAL_MS bất kể introText dài ngắn — xem computeTypewriterTiming().
    const textBudgetMs = GAMEPLAY.BOSS_INTRO_TOTAL_MS - GAMEPLAY.BOSS_INTRO_CAMERA_PAN_MS - GAMEPLAY.BOSS_INTRO_RETURN_MS;
    const { msPerChar, holdMs } = this.computeTypewriterTiming(introText.length, textBudgetMs);

    const textObj = this.scene.add
      .text(480, 250, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "18px",
        color: "#e5e7eb",
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: 640 },
        shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 6, fill: true }
      })
      .setOrigin(0.5, 0)
      .setDepth(5);

    const state = { charIndex: 0, cursorOn: true, phase: "revealing" as "revealing" | "holding" };
    const renderText = () => {
      const shown = introText.slice(0, state.charIndex);
      textObj.setText(shown + (state.cursorOn ? "▌" : ""));
    };

    const cursorBlink = this.scene.time.addEvent({
      delay: GAMEPLAY.BOSS_INTRO_CURSOR_BLINK_MS,
      loop: true,
      callback: () => {
        state.cursorOn = !state.cursorOn;
        renderText();
      }
    });

    let revealTimer: Phaser.Time.TimerEvent | undefined;
    let holdTimer: Phaser.Time.TimerEvent | undefined;

    const finishIntro = () => {
      revealTimer?.remove(false);
      holdTimer?.remove(false);
      cursorBlink.remove(false);
      this.stopHeartbeat(overlay, vignetteFX, GAMEPLAY.BOSS_INTRO_OVERLAY_ALPHA);
      if (this.skipHandler) {
        this.scene.input.off("pointerdown", this.skipHandler);
        this.scene.input.keyboard?.off("keydown", this.skipHandler);
        this.skipHandler = undefined;
      }
      onDone();
    };

    const beginHold = () => {
      state.phase = "holding";
      state.charIndex = introText.length;
      state.cursorOn = true;
      renderText();
      this.startHeartbeat(camera, overlay, vignetteFX);
      holdTimer = this.scene.time.delayedCall(holdMs, finishIntro);
    };

    revealTimer = this.scene.time.addEvent({
      delay: msPerChar,
      repeat: introText.length - 1,
      callback: () => {
        state.charIndex++;
        renderText();
        if (state.charIndex >= introText.length) beginHold();
      }
    });

    // Skip: đang gõ -> hiện hết chữ ngay + vào giai đoạn hold; đang hold -> bỏ qua nốt, kết thúc luôn.
    this.skipHandler = () => {
      if (state.phase === "revealing") {
        revealTimer?.remove(false);
        beginHold();
      } else {
        holdTimer?.remove(false);
        finishIntro();
      }
    };
    this.scene.input.on("pointerdown", this.skipHandler);
    this.scene.input.keyboard?.on("keydown", this.skipHandler);

    // Giữ tham chiếu để returnToGameplay() fade out cùng overlay/title/text.
    this.titleObj = title;
    this.textObj = textObj;
  }

  // ---------- Bước 6: Camera return + resume ----------

  private returnToGameplay(
    camera: Phaser.Cameras.Scene2D.Camera,
    centerX: number,
    centerY: number,
    zoom: number,
    overlay: Phaser.GameObjects.Rectangle,
    vignetteFX: Phaser.FX.Vignette,
    boss: Boss,
    onComplete: () => void
  ): void {
    this.stopBossIdleAnimation();
    this.stopAshParticles();

    const fadeTargets: Phaser.GameObjects.GameObject[] = [overlay];
    if (this.titleObj) fadeTargets.push(this.titleObj);
    if (this.textObj) fadeTargets.push(this.textObj);
    this.scene.tweens.add({ targets: fadeTargets, alpha: 0, duration: GAMEPLAY.BOSS_INTRO_OVERLAY_FADE_MS });
    this.scene.tweens.add({ targets: vignetteFX, strength: 0, duration: GAMEPLAY.BOSS_INTRO_OVERLAY_FADE_MS });

    this.panAndZoomTo(camera, centerX, centerY, zoom, GAMEPLAY.BOSS_INTRO_RETURN_MS, "Sine.easeInOut", () => {
      overlay.destroy();
      camera.postFX.remove(vignetteFX); // dọn sạch FX — không để dính lại cho gameplay bình thường sau cinematic
      this.titleObj?.destroy();
      this.textObj?.destroy();
      boss.sprite.setScale(1);

      this.gameScene.resumeCameraFollow();
      this.gameScene.scene.resume();
      onComplete();
    });
  }
}
