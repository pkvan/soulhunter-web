import Phaser from "phaser";
import { Enemy } from "@entities/Enemy";
import { Boss } from "@entities/Boss";
import { WeaponDef } from "@types/index";

type Target = Enemy | Boss;

// Texture placeholder riêng theo từng vũ khí để phân biệt bằng mắt — xem BootScene.generatePlaceholderTextures()
// (bow/triple_throw load qua CharacterSpriteLoader thay vì generate ở đây, nhưng vẫn cùng 1 bảng tra key).
const PROJECTILE_TEXTURES: Record<string, string> = {
  bow: "arrow_projectile",
  triple_throw: "assasin_projectile",
  fireball: "projectile_fireball",
  ice_shard: "projectile_ice_shard",
  boomerang: "projectile_boomerang"
};
const BOOMERANG_SPIN_DEGREES_PER_UPDATE = 12;
// Vũ khí cần xoay sprite đúng góc bay thật (đầu nhọn/lưỡi dao hướng đúng chiều di chuyển) thay vì quay tròn liên
// tục (Boomerang) hoặc đứng yên góc 0 (Fireball/Ice Shard).
const DIRECTIONAL_ROTATION_WEAPON_IDS = ["bow", "triple_throw"];
// Triple Throw (Assassin) dùng type "projectile_straight" (bay thẳng, trúng/hết maxDistance thì despawn — KHÔNG
// quay lại player) nhưng cần khoảng bay xa hơn mặc định maxTravelDistance của Fireball/Ice Shard/Holy Javelin —
// đọc riêng weapon.maxDistance (480, xem weapons.json) thay vì maxTravelDistance chung cho các weaponId này.
const CUSTOM_MAX_DISTANCE_WEAPON_IDS = ["triple_throw"];

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
  public isShrapnel = false; // tia phụ do upgrade Shrapnel bắn ra — chặn đệ quy (tia phụ trúng KHÔNG tự bắn thêm tia phụ)
  public isCrit = false; // crit_chance/crit_damage upgrade — quyết định lúc bắn (WeaponSystem.fire()), giữ nguyên tới lúc trúng để showDamageNumber hiện đúng màu
  private weaponType: WeaponDef["type"] = "projectile_straight";
  private speed = 200;
  private returning = false;
  private originX = 0;
  private originY = 0;
  private maxDistance = 300; // boomerang: khoảng cách bay ra tối đa trước khi quay lại, đọc từ weapon.maxDistance nếu có
  private readonly maxTravelDistance = 500; // fireball/ice shard: tự despawn nếu bay quá xa mà không trúng gì
  private readonly returnDespawnRadius = 20;
  private hitEnemies: Set<Target> = new Set(); // dùng chung cho Enemy thường lẫn Boss (xem entities/Boss.ts)

  constructor(private scene: Phaser.Scene) {
    this.sprite = scene.physics.add.sprite(-1000, -1000, "projectile_placeholder");
    // Neo giữa tâm — bắt buộc để setAngle() (arrow_projectile) xoay đúng quanh tâm mũi tên, không lệch tâm bay.
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setActive(false).setVisible(false);
  }

  fire(x: number, y: number, angleRad: number, weapon: WeaponDef, damage: number, isShrapnel = false, isCrit = false, scaleMultiplier = 1): void {
    this.originX = x;
    this.originY = y;
    this.damage = damage;
    this.weaponId = weapon.id;
    this.weaponType = weapon.type;
    this.pierceRemaining = (weapon.pierceCount as number) ?? 0;
    this.speed = (weapon.baseSpeed as number) ?? 200;
    this.maxDistance = (weapon.maxDistance as number) ?? 300;
    this.returning = false;
    this.active = true;
    this.isShrapnel = isShrapnel;
    this.isCrit = isCrit;
    this.hitEnemies.clear();

    this.sprite.setTexture(PROJECTILE_TEXTURES[weapon.id] ?? "projectile_placeholder");
    // Bow/Triple Throw: ảnh vẽ đầu nhọn/lưỡi dao quay phải theo trục ngang mặc định (angle 0), cần xoay đúng góc
    // bay để hướng đúng chiều di chuyển — Fireball (tròn)/Ice Shard (thoi cân đối) không cần nên giữ nguyên angle 0.
    this.sprite.setAngle(DIRECTIONAL_ROTATION_WEAPON_IDS.includes(weapon.id) ? Phaser.Math.RadToDeg(angleRad) : 0);
    this.sprite.setScale(scaleMultiplier); // fireball_size upgrade: chỉ WeaponSystem truyền khác 1 khi def.id === "fireball"
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
      const cutoff = CUSTOM_MAX_DISTANCE_WEAPON_IDS.includes(this.weaponId) ? this.maxDistance : this.maxTravelDistance;
      if (traveled > cutoff) {
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
