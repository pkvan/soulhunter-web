import Phaser from "phaser";
import { Enemy } from "@entities/Enemy";
import { Boss } from "@entities/Boss";
import { WeaponDef } from "@types/index";

type Target = Enemy | Boss;

// Texture placeholder riêng theo từng vũ khí để phân biệt bằng mắt — xem BootScene.generatePlaceholderTextures()
const PROJECTILE_TEXTURES: Record<string, string> = {
  fireball: "projectile_fireball",
  ice_shard: "projectile_ice_shard",
  boomerang: "projectile_boomerang"
};
const BOOMERANG_SPIN_DEGREES_PER_UPDATE = 12;

/**
 * Projectile dùng chung cho Fireball / Ice Shard / Boomerang / vũ khí fusion có projectile.
 * Được PoolManager tái sử dụng.
 */
export class Projectile {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public active = false;
  public damage = 0;
  public pierceRemaining = 0;
  public weaponId = ""; // để WeaponSystem tra lại WeaponDef (kể cả vũ khí fusion) khi xử lý on-hit effect
  private weaponType: WeaponDef["type"] = "projectile_straight";
  private speed = 200;
  private returning = false;
  private originX = 0;
  private originY = 0;
  private readonly maxDistance = 300; // boomerang: khoảng cách bay ra tối đa trước khi quay lại
  private readonly maxTravelDistance = 500; // fireball/ice shard: tự despawn nếu bay quá xa mà không trúng gì
  private readonly returnDespawnRadius = 20;
  private hitEnemies: Set<Target> = new Set(); // dùng chung cho Enemy thường lẫn Boss (xem entities/Boss.ts)

  constructor(private scene: Phaser.Scene) {
    this.sprite = scene.physics.add.sprite(-1000, -1000, "projectile_placeholder");
    this.sprite.setActive(false).setVisible(false);
  }

  fire(x: number, y: number, angleRad: number, weapon: WeaponDef, damage: number): void {
    this.originX = x;
    this.originY = y;
    this.damage = damage;
    this.weaponId = weapon.id;
    this.weaponType = weapon.type;
    this.pierceRemaining = (weapon.pierceCount as number) ?? 0;
    this.speed = (weapon.baseSpeed as number) ?? 200;
    this.returning = false;
    this.active = true;
    this.hitEnemies.clear();

    this.sprite.setTexture(PROJECTILE_TEXTURES[weapon.id] ?? "projectile_placeholder");
    this.sprite.setAngle(0);
    this.sprite.setPosition(x, y);
    this.sprite.setActive(true).setVisible(true);
    this.sprite.setVelocity(Math.cos(angleRad) * this.speed, Math.sin(angleRad) * this.speed);
  }

  hasHit(target: Target): boolean {
    return this.hitEnemies.has(target);
  }

  /** Gọi khi projectile va chạm 1 enemy/boss — quyết định có despawn/giảm pierce hay không tùy loại vũ khí. */
  registerHit(target: Target): void {
    this.hitEnemies.add(target);

    if (this.weaponType === "projectile_pierce") {
      this.pierceRemaining -= 1;
      if (this.pierceRemaining <= 0) this.despawn();
    } else if (this.weaponType === "projectile_straight") {
      this.despawn(); // nổ khi trúng, chỉ gây damage 1 lần
    }
    // projectile_return (boomerang): không despawn khi trúng, tiếp tục bay
  }

  update(playerX: number, playerY: number): void {
    if (!this.active) return;

    if (this.weaponType === "projectile_return") {
      this.sprite.angle += BOOMERANG_SPIN_DEGREES_PER_UPDATE; // xoay liên tục để phân biệt rõ với Fireball/Ice Shard

      if (!this.returning) {
        const traveled = Phaser.Math.Distance.Between(this.originX, this.originY, this.sprite.x, this.sprite.y);
        if (traveled >= this.maxDistance) {
          this.returning = true;
          this.hitEnemies.clear(); // cho phép trúng lại quái trên đường bay về
        }
      }

      if (this.returning) {
        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerX, playerY);
        this.sprite.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);

        const distToPlayer = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerX, playerY);
        if (distToPlayer < this.returnDespawnRadius) {
          this.despawn();
        }
      }
    } else {
      const traveled = Phaser.Math.Distance.Between(this.originX, this.originY, this.sprite.x, this.sprite.y);
      if (traveled > this.maxTravelDistance) {
        this.despawn(); // bay ra quá xa mà không trúng gì -> despawn tránh leak
      }
    }
  }

  despawn(): void {
    this.active = false;
    this.sprite.setActive(false).setVisible(false);
    this.sprite.setVelocity(0, 0);
    this.sprite.setPosition(-1000, -1000);
    this.hitEnemies.clear();
  }
}
