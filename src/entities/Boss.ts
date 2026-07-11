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

  /** Damage va chạm khi đang trong pha "active" của dash/charge — null = BossSystem dùng damage va chạm thường. */
  public activeContactDamage: number | null = null;

  private skills: SkillState[];
  private activeSkill: SkillState | null = null;
  private telegraphStartedAt = 0;
  private actionStartedAt = 0;
  private dashAngle = 0;
  private slamTelegraphGraphics?: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, x: number, y: number, bossDef: BossDef) {
    this.id = bossDef.id;
    this.name = bossDef.name;
    this.color = Number(bossDef.color);
    this.maxHp = bossDef.hp;
    this.currentHp = this.maxHp;
    this.moveSpeed = bossDef.moveSpeed;

    this.skills = bossDef.skillIds
      .map((skillId) => bossSkills.find((s) => s.id === skillId))
      .filter((def): def is BossSkillDef => def !== undefined)
      .map((def) => ({ def, lastUsedAt: 0 }));

    this.sprite = scene.physics.add.sprite(x, y, "boss_placeholder");
    this.sprite.setTint(this.color);
  }

  update(time: number, playerX: number, playerY: number): void {
    switch (this.phase) {
      case "chase":
        this.moveToward(playerX, playerY, this.moveSpeed);
        this.tryStartSkill(time);
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

  /** true = chết (currentHp <= 0), dùng chung style với Enemy.takeDamage. */
  takeDamage(amount: number): boolean {
    this.currentHp -= amount;
    return this.currentHp <= 0;
  }

  destroy(): void {
    this.destroySlamTelegraphGraphics();
    this.sprite.destroy();
  }

  private tryStartSkill(time: number): void {
    for (const skillState of this.skills) {
      if (time - skillState.lastUsedAt < skillState.def.cooldownMs) continue;
      this.startSkill(skillState, time);
      return;
    }
  }

  private startSkill(skillState: SkillState, time: number): void {
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
        this.drawSlamTelegraphCircle(def.radius ?? 0);
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
    }
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

  /** Vòng tròn viền đỏ báo trước vùng Ground Slam sắp nổ — vẽ 1 lần tại vị trí boss lúc bắt đầu telegraph (boss đứng yên suốt telegraph). */
  private drawSlamTelegraphCircle(radius: number): void {
    this.destroySlamTelegraphGraphics();
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, 0xff2222, 0.8);
    graphics.strokeCircle(this.sprite.x, this.sprite.y, radius);
    this.slamTelegraphGraphics = graphics;
  }

  private destroySlamTelegraphGraphics(): void {
    this.slamTelegraphGraphics?.destroy();
    this.slamTelegraphGraphics = undefined;
  }
}
