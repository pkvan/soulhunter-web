import Phaser from "phaser";
import { PlayerStats, EquippedWeapon, PermanentUpgradeDef } from "@types/index";
import { EventBus, GameEvents } from "@utils/EventBus";
import charactersData from "@data/characters.json";
import permanentUpgradesData from "@data/permanentUpgrades.json";
import { CharacterDef } from "@types/index";
import { getPermanentUpgradeCount } from "@utils/SaveData";
import { GAMEPLAY } from "@config/GameConfig";

const characters = charactersData as CharacterDef[];
const permanentUpgrades = permanentUpgradesData as PermanentUpgradeDef[];

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public stats: PlayerStats;
  public equippedWeapons: EquippedWeapon[] = [];
  public readonly characterId: string; // lưu lại để PauseScene "Play Again" restart đúng nhân vật đang dùng
  public appliedUpgrades: string[] = []; // id của UpgradeDef đã chọn trong ván này (kể cả trùng nếu stack) — xem UpgradeSystem.applyUpgrade(), dùng để hiện icon loadout trong PauseScene
  public bonusCoinFromOverflowSoul = 0; // soul dư sau khi đạt MAX_LEVEL quy đổi thành Coin thay vì lãng phí — xem gainSoul() + GameScene.computeCoinEarned()
  private soulCount = 0;
  private level = 1;
  private soulToNextLevel = 10;
  private keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    characterId: string,
    extraDamageMultiplier = 1 // Daily Challenge modifier (xem GameScene) — mặc định 1 khi chơi ván thường
  ) {
    const def = characters.find((c) => c.id === characterId) ?? characters[0];
    this.characterId = def.id;

    // TODO: thay "player_placeholder" bằng texture key thật sau khi có asset
    this.sprite = scene.physics.add.sprite(x, y, "player_placeholder");
    this.sprite.setCollideWorldBounds(false); // map vô tận, không chặn biên

    this.keys = this.scene.input.keyboard!.addKeys("W,A,S,D") as typeof this.keys;

    this.stats = {
      maxHp: def.baseHp,
      currentHp: def.baseHp,
      moveSpeed: def.baseMoveSpeed,
      damageMultiplier: 1,
      cooldownMultiplier: 1,
      critChance: 0.05,
      critDamageMultiplier: 1.5,
      lifeStealPercent: 0,
      pickupRadiusMultiplier: 1,
      shieldCharges: 0
    };

    // Permanent Upgrade mua bằng Coin (GDD mục 13) — cộng vĩnh viễn vào stat gốc của MỌI nhân vật, mỗi ván.
    for (const upgradeDef of permanentUpgrades) {
      const count = getPermanentUpgradeCount(upgradeDef.id);
      if (count > 0) this.stats[upgradeDef.stat] += upgradeDef.value * count;
    }
    this.stats.damageMultiplier *= extraDamageMultiplier;
    this.stats.currentHp = this.stats.maxHp;

    this.equippedWeapons.push({ weaponId: def.startingWeapon, level: 1 });
  }

  update(_delta: number): void {
    // setVelocity() nhận world units/giây — Arcade Physics tự nhân với delta mỗi step, không cần nhân delta thủ công ở đây.
    const speed = this.stats.moveSpeed;
    let vx = 0;
    let vy = 0;
    if (this.keys.A.isDown) vx = -1;
    if (this.keys.D.isDown) vx = 1;
    if (this.keys.W.isDown) vy = -1;
    if (this.keys.S.isDown) vy = 1;

    // Chuẩn hóa vector để đi chéo không nhanh hơn đi thẳng (vx=vy=1 trước đây cho tốc độ ×√2)
    if (vx !== 0 && vy !== 0) {
      const norm = Math.SQRT1_2; // 1/sqrt(2)
      vx *= norm;
      vy *= norm;
    }

    this.sprite.setVelocity(vx * speed, vy * speed);
  }

  public takeDamage(amount: number): void {
    // TODO: trừ shieldCharges trước, roll dodgeChance, trừ flatDamageReduction rồi mới trừ HP
    this.stats.currentHp -= amount;
    this.playHitFeedback(amount);
    if (this.stats.currentHp <= 0) {
      EventBus.emit(GameEvents.PLAYER_DIED);
    }
  }

  /** Flash đỏ + screen shake khi nhận damage — mạnh hơn nếu đòn đủ nặng, bỏ qua shake nếu damage quá nhỏ (vd DOT tick lẻ tẻ). */
  private playHitFeedback(amount: number): void {
    this.sprite.setTint(GAMEPLAY.PLAYER_HIT_FLASH_COLOR);
    this.scene.time.delayedCall(GAMEPLAY.PLAYER_HIT_FLASH_MS, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });

    const damagePercent = amount / this.stats.maxHp;
    if (damagePercent < GAMEPLAY.PLAYER_HIT_SHAKE_MIN_PERCENT) return;

    const isBigHit = damagePercent > GAMEPLAY.PLAYER_HIT_BIG_THRESHOLD_PERCENT;
    this.scene.cameras.main.shake(
      isBigHit ? GAMEPLAY.PLAYER_HIT_BIG_SHAKE_DURATION_MS : GAMEPLAY.PLAYER_HIT_SHAKE_DURATION_MS,
      isBigHit ? GAMEPLAY.PLAYER_HIT_BIG_SHAKE_INTENSITY : GAMEPLAY.PLAYER_HIT_SHAKE_INTENSITY
    );
  }

  public heal(amount: number): void {
    this.stats.currentHp = Math.min(this.stats.maxHp, this.stats.currentHp + amount);
  }

  public getProgress(): { level: number; soulCount: number; soulToNextLevel: number; isMaxLevel: boolean } {
    return {
      level: this.level,
      soulCount: this.soulCount,
      soulToNextLevel: this.soulToNextLevel,
      isMaxLevel: this.level >= GAMEPLAY.MAX_LEVEL
    };
  }

  public gainSoul(value: number): void {
    // Đã đạt Max Level — không tăng level nữa, soul dư quy đổi thẳng thành Coin (1 soul = 1 Coin) thay vì mất trắng.
    if (this.level >= GAMEPLAY.MAX_LEVEL) {
      this.bonusCoinFromOverflowSoul += value;
      return;
    }

    this.soulCount += value;
    if (this.soulCount >= this.soulToNextLevel) {
      this.soulCount -= this.soulToNextLevel;
      this.level += 1;
      this.soulToNextLevel = Math.floor(this.soulToNextLevel * 1.25); // TODO: tune công thức tăng EXP
      EventBus.emit(GameEvents.LEVEL_UP, this.level);
    }
  }
}
