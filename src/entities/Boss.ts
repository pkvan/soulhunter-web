import Phaser from "phaser";
import bossSkillsData from "@data/bossSkills.json";
import { BossDef, BossSkillDef } from "@types/index";

const bossSkills = bossSkillsData as BossSkillDef[];

type BossPhase = "chase" | "telegraph" | "active";

interface SkillState {
  def: BossSkillDef;
  lastUsedAt: number;
}

/**
 * Boss data-driven (xem src/data/bosses.json + bossSkills.json) — không hardcode HP/tốc độ/skill riêng
 * cho từng loại boss trong class này, chỉ đọc theo bossDef truyền vào lúc spawn. Skill nào nằm trong
 * bossDef.skillIds sẽ được nạp theo đúng thứ tự khai báo; thứ tự đó cũng là thứ tự ưu tiên khi nhiều
 * skill cùng hết cooldown 1 lúc (skill đứng trước trong mảng được dùng trước — tránh spam dồn dập).
 * Boss không giữ PoolManager/Player — phần world-effect (summon quái, gây damage player, buff enemy
 * thường) do BossSystem đọc các cờ pending* mỗi frame để xử lý.
 */
export class Boss {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public readonly id: string;
  public readonly name: string;
  public readonly color: number;
  public readonly isFinalBoss: boolean;
  public isDying = false; // true ngay khi Final Boss chết — chặn tuyệt đối mọi logic update() (xem update())
  public maxHp: number;
  public currentHp: number;
  public moveSpeed: number;
  public phase: BossPhase = "chase";

  public pendingSummon = false;
  public summonCount = 0;

  public pendingSlamDamage = false;
  public slamCenterX = 0;
  public slamCenterY = 0;
  public slamRadius = 0;
  public slamDamage = 0;

  public pendingRoar = false;
  public roarRadius = 0;
  public roarDurationMs = 0;
  public roarMoveSpeedBuff = 0;
  public roarDamageBuff = 0;

  public pendingFreezePulse = false;
  public freezePulseRadius = 0;
  public freezePulseSlowFactor = 0;
  public freezePulseDurationMs = 0;

  public pendingPoisonCloud = false;
  public poisonCloudRadius = 0;
  public poisonCloudTickDamage = 0;
  public poisonCloudTickIntervalMs = 0;
  public poisonCloudDurationMs = 0;

  public pendingClone = false;
  public cloneHp = 0;
  public cloneDamage = 0;
  public cloneMoveSpeed = 0;
  public cloneDurationMs = 0;

  /** Damage va chạm khi đang trong pha "active" của dash/charge — null = BossSystem dùng damage va chạm thường. */
  public activeContactDamage: number | null = null;

  private skills: SkillState[];
  private activeSkill: SkillState | null = null;
  private telegraphStartedAt = 0;
  private actionStartedAt = 0;
  private dashAngle = 0;
  private slamTelegraphGraphics?: Phaser.GameObjects.Graphics;

  // heal_self là passive theo ngưỡng HP, KHÔNG theo cooldown xoay vòng như các skill khác — tách riêng
  // khỏi mảng `skills` (tryStartSkill) ngay từ constructor, tự kiểm tra trong takeDamage().
  private healSelfDef: BossSkillDef | undefined;
  private healSelfUsed = false;

  constructor(private scene: Phaser.Scene, x: number, y: number, bossDef: BossDef) {
    this.id = bossDef.id;
    this.name = bossDef.name;
    this.color = Number(bossDef.color);
    this.isFinalBoss = bossDef.isFinalBoss ?? false;
    this.maxHp = bossDef.hp;
    this.currentHp = this.maxHp;
    this.moveSpeed = bossDef.moveSpeed;

    const resolvedSkillDefs = bossDef.skillIds
      .map((skillId) => bossSkills.find((s) => s.id === skillId))
      .filter((def): def is BossSkillDef => def !== undefined);

    this.healSelfDef = resolvedSkillDefs.find((def) => def.type === "heal_self");
    this.skills = resolvedSkillDefs
      .filter((def) => def.type !== "heal_self")
      .map((def) => ({ def, lastUsedAt: 0 }));

    this.sprite = scene.physics.add.sprite(x, y, "boss_placeholder");
    this.sprite.setTint(this.color);
  }

  update(time: number, playerX: number, playerY: number): void {
    if (this.isDying) return; // đang chạy cutscene chiến thắng (Final Boss) — không còn Dash/Summon/Ground Slam/di chuyển nào nữa dù update() vẫn được gọi mỗi frame
    switch (this.phase) {
      case "chase":
        this.moveToward(playerX, playerY, this.moveSpeed);
        this.tryStartSkill(time, playerX, playerY);
        break;

      case "telegraph": {
        this.sprite.setVelocity(0, 0);
        this.updateTelegraphFlicker(time);
        const skill = this.activeSkill!.def;
        if (time - this.telegraphStartedAt >= (skill.telegraphMs ?? 0)) {
          this.beginActivePhase(time, playerX, playerY);
        }
        break;
      }

      case "active": {
        const skill = this.activeSkill!.def;
        if (skill.type === "dash" || skill.type === "charge") {
          this.sprite.setVelocity(Math.cos(this.dashAngle) * (skill.speed ?? 0), Math.sin(this.dashAngle) * (skill.speed ?? 0));
          if (time - this.actionStartedAt >= (skill.durationMs ?? 0)) {
            this.finishSkill();
          }
        }
        break;
      }
    }
  }

  /** true = chết (currentHp <= 0), dùng chung style với Enemy.takeDamage. Kiểm tra heal_self NGAY SAU khi trừ máu — chỉ kích hoạt đúng 1 lần/trận (healSelfUsed), tránh vòng lặp không thể hạ gục. */
  takeDamage(amount: number): boolean {
    this.currentHp -= amount;
    this.tryTriggerHealSelf();
    return this.currentHp <= 0;
  }

  private tryTriggerHealSelf(): void {
    if (!this.healSelfDef || this.healSelfUsed || this.currentHp <= 0) return;
    const threshold = this.healSelfDef.hpThreshold ?? 0.3;
    if (this.currentHp / this.maxHp > threshold) return;

    this.healSelfUsed = true;
    const healAmount = this.maxHp * (this.healSelfDef.healPercent ?? 0.25);
    this.currentHp = Math.min(this.maxHp, this.currentHp + healAmount);
    this.spawnHealFlash();
  }

  /** Vòng sáng xanh lá bùng lên quanh boss lúc heal_self kích hoạt — phản hồi hình ảnh rõ ràng cho 1 sự kiện chỉ xảy ra đúng 1 lần/trận. */
  private spawnHealFlash(): void {
    const flash = this.scene.add.circle(this.sprite.x, this.sprite.y, 20, 0x4ade80, 0.6).setDepth(5);
    this.scene.tweens.add({
      targets: flash,
      radius: 70,
      alpha: 0,
      duration: 500,
      ease: "Sine.easeOut",
      onComplete: () => flash.destroy()
    });
  }

  destroy(): void {
    this.destroySlamTelegraphGraphics();
    this.sprite.destroy();
  }

  /**
   * Gọi NGAY LẬP TỨC khi currentHp <= 0 với Final Boss (xem BossSystem.killBoss()) — dừng tuyệt đối mọi
   * chuyển động/skill trước khi GameScene chạy cutscene chiến thắng, đảm bảo boss đứng yên hoàn toàn:
   * setVelocity(0,0) + tắt hẳn physics body (không còn bị đẩy/va chạm bởi bất kỳ thứ gì) + huỷ mọi tween
   * đang dở (vd không có tween nào chạy trên boss lúc chết, nhưng phòng trường hợp sau này thêm hiệu ứng
   * khác) + huỷ luôn vòng tròn telegraph Ground Slam nếu còn sót lại + set isDying để update() bỏ qua hẳn.
   */
  stopForDeathCutscene(): void {
    this.isDying = true;
    this.sprite.setVelocity(0, 0);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (body) body.enable = false;
    this.scene.tweens.killTweensOf(this.sprite);
    this.destroySlamTelegraphGraphics();
  }

  private tryStartSkill(time: number, playerX: number, playerY: number): void {
    for (const skillState of this.skills) {
      if (time - skillState.lastUsedAt < skillState.def.cooldownMs) continue;
      this.startSkill(skillState, time, playerX, playerY);
      return;
    }
  }

  private startSkill(skillState: SkillState, time: number, playerX: number, playerY: number): void {
    skillState.lastUsedAt = time;
    const def = skillState.def;

    switch (def.type) {
      case "dash":
      case "charge":
        this.activeSkill = skillState;
        this.telegraphStartedAt = time;
        this.phase = "telegraph";
        break;
      case "ground_slam":
        this.activeSkill = skillState;
        this.telegraphStartedAt = time;
        this.phase = "telegraph";
        this.drawTelegraphCircle(this.sprite.x, this.sprite.y, def.radius ?? 0);
        break;
      case "meteor":
        // Vòng cảnh báo cố định NGAY tại vị trí player lúc bắt đầu cast (không đuổi theo player suốt telegraph) — player phải né ra khỏi đó.
        this.activeSkill = skillState;
        this.telegraphStartedAt = time;
        this.phase = "telegraph";
        this.slamCenterX = playerX;
        this.slamCenterY = playerY;
        this.drawTelegraphCircle(playerX, playerY, def.radius ?? 0);
        break;
      case "summon":
        // Không có telegraph/active phase — thực hiện ngay, BossSystem đọc cờ này mỗi frame rồi tự reset về false.
        this.pendingSummon = true;
        this.summonCount = def.count ?? 0;
        break;
      case "roar":
        this.pendingRoar = true; // BossSystem đọc cờ này mỗi frame rồi tự reset về false
        this.roarRadius = def.radius ?? 0;
        this.roarDurationMs = def.durationMs ?? 0;
        this.roarMoveSpeedBuff = def.moveSpeedBuff ?? 0;
        this.roarDamageBuff = def.damageBuff ?? 0;
        break;
      case "teleport":
        // Tức thời, không telegraph — tự dịch chuyển sprite trong startSkill(), boss vẫn ở phase "chase".
        this.executeTeleport(def.radius ?? 240, playerX, playerY);
        break;
      case "freeze_pulse":
        this.pendingFreezePulse = true; // BossSystem đọc cờ này mỗi frame rồi tự reset về false
        this.freezePulseRadius = def.radius ?? 0;
        this.freezePulseSlowFactor = def.slowFactor ?? 0;
        this.freezePulseDurationMs = def.durationMs ?? 0;
        this.spawnFreezePulseRing(def.radius ?? 0);
        break;
      case "poison_cloud":
        // Thả tại vị trí boss lúc cast — BossSystem đọc cờ này mỗi frame, tự tạo vùng DOT sống trong poisonCloudDurationMs (không phải hiệu ứng tức thời như summon/roar).
        this.pendingPoisonCloud = true;
        this.poisonCloudRadius = def.radius ?? 0;
        this.poisonCloudTickDamage = def.damage ?? 0;
        this.poisonCloudTickIntervalMs = def.tickIntervalMs ?? 1000;
        this.poisonCloudDurationMs = def.durationMs ?? 0;
        break;
      case "clone":
        // BossSystem đọc cờ này, tự spawn 1 Enemy từ PoolManager với EnemyDef tổng hợp tại runtime (tái dùng toàn bộ AI/damage/collision có sẵn của Enemy thay vì viết entity mới).
        this.pendingClone = true;
        this.cloneHp = def.cloneHp ?? 0;
        this.cloneDamage = def.cloneDamage ?? 0;
        this.cloneMoveSpeed = def.cloneMoveSpeed ?? 0;
        this.cloneDurationMs = def.durationMs ?? 0;
        break;
    }
  }

  private beginActivePhase(time: number, playerX: number, playerY: number): void {
    const skill = this.activeSkill!.def;
    this.sprite.clearTint();
    this.sprite.setTint(this.color); // trả lại màu gốc của boss sau khi hết nháy telegraph

    if (skill.type === "dash" || skill.type === "charge") {
      this.dashAngle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerX, playerY);
      this.actionStartedAt = time;
      this.activeContactDamage = skill.damage ?? null;
      this.phase = "active";
    } else if (skill.type === "ground_slam") {
      this.slamCenterX = this.sprite.x;
      this.slamCenterY = this.sprite.y;
      this.slamRadius = skill.radius ?? 0;
      this.slamDamage = skill.damage ?? 0;
      this.pendingSlamDamage = true; // BossSystem đọc cờ này mỗi frame rồi tự reset về false
      this.destroySlamTelegraphGraphics();
      this.finishSkill();
    } else if (skill.type === "meteor") {
      // slamCenterX/Y đã được chốt lúc startSkill() (vị trí player NGAY lúc bắt đầu cast) — không đọc lại playerX/Y ở đây.
      this.slamRadius = skill.radius ?? 0;
      this.slamDamage = skill.damage ?? 0;
      this.pendingSlamDamage = true; // tái dùng đúng cờ AOE của ground_slam — BossSystem không cần biết đây là meteor hay slam
      this.destroySlamTelegraphGraphics();
      this.finishSkill();
    }
  }

  /** Dịch chuyển tức thời tới 1 điểm ngẫu nhiên quanh player (không quá sát để tránh dính luôn), kèm flash lúc biến mất/xuất hiện. */
  private executeTeleport(radius: number, playerX: number, playerY: number): void {
    this.spawnTeleportFlash(this.sprite.x, this.sprite.y);

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = Phaser.Math.FloatBetween(radius * 0.4, radius);
    this.sprite.setPosition(playerX + Math.cos(angle) * dist, playerY + Math.sin(angle) * dist);

    this.spawnTeleportFlash(this.sprite.x, this.sprite.y);
  }

  /** Vòng sáng bùng lên rồi tan biến — dùng chung cho lúc boss biến mất VÀ lúc xuất hiện trở lại. */
  private spawnTeleportFlash(x: number, y: number): void {
    const flash = this.scene.add.circle(x, y, 24, 0xffffff, 0.9).setDepth(5);
    this.scene.tweens.add({
      targets: flash,
      radius: 46,
      alpha: 0,
      duration: 250,
      ease: "Sine.easeOut",
      onComplete: () => flash.destroy()
    });
  }

  /** Vòng xung mở rộng từ tâm boss ra tới đúng bán kính freeze_pulse rồi tan biến — chỉ hiệu ứng hình ảnh, phần làm chậm player do BossSystem xử lý (đọc pendingFreezePulse). */
  private spawnFreezePulseRing(radius: number): void {
    const ring = this.scene.add.circle(this.sprite.x, this.sprite.y, 4, 0x7dd3fc, 0).setDepth(4);
    ring.setStrokeStyle(3, 0x7dd3fc, 0.9);
    this.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 400,
      ease: "Sine.easeOut",
      onComplete: () => ring.destroy()
    });
  }

  private finishSkill(): void {
    this.activeSkill = null;
    this.activeContactDamage = null;
    this.phase = "chase";
  }

  private moveToward(targetX: number, targetY: number, speed: number): void {
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, targetX, targetY);
    this.sprite.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  /** Nháy trắng/đỏ mỗi 100ms để báo trước dash/charge/ground_slam sắp xảy ra — placeholder cho tới khi có animation thật. */
  private updateTelegraphFlicker(time: number): void {
    const flicker = Math.floor(time / 100) % 2 === 0;
    this.sprite.setTint(flicker ? 0xffffff : 0xff2222);
  }

  /** Vòng tròn viền đỏ báo trước vùng AOE sắp nổ (Ground Slam tại vị trí boss, Meteor tại vị trí player lúc cast) — vẽ 1 lần lúc bắt đầu telegraph. */
  private drawTelegraphCircle(x: number, y: number, radius: number): void {
    this.destroySlamTelegraphGraphics();
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, 0xff2222, 0.8);
    graphics.strokeCircle(x, y, radius);
    this.slamTelegraphGraphics = graphics;
  }

  private destroySlamTelegraphGraphics(): void {
    this.slamTelegraphGraphics?.destroy();
    this.slamTelegraphGraphics = undefined;
  }
}
