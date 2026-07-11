import Phaser from "phaser";
import { PlayerStats, EquippedWeapon } from "@types/index";
import { EventBus, GameEvents } from "@utils/EventBus";
import charactersData from "@data/characters.json";
import { CharacterDef } from "@types/index";

const characters = charactersData as CharacterDef[];

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public stats: PlayerStats;
  public equippedWeapons: EquippedWeapon[] = [];
  private soulCount = 0;
  private level = 1;
  private soulToNextLevel = 10;
  private keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  constructor(private scene: Phaser.Scene, x: number, y: number, characterId: string) {
    const def = characters.find((c) => c.id === characterId) ?? characters[0];

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

    this.equippedWeapons.push({ weaponId: def.startingWeapon, level: 1 });
  }

  update(_delta: number): void {
    const speed = this.stats.moveSpeed;
    let vx = 0;
    let vy = 0;
    if (this.keys.A.isDown) vx = -speed;
    if (this.keys.D.isDown) vx = speed;
    if (this.keys.W.isDown) vy = -speed;
    if (this.keys.S.isDown) vy = speed;
    this.sprite.setVelocity(vx, vy);
  }

  public takeDamage(amount: number): void {
    // TODO: trừ shieldCharges trước, roll dodgeChance, trừ flatDamageReduction rồi mới trừ HP
    this.stats.currentHp -= amount;
    if (this.stats.currentHp <= 0) {
      EventBus.emit(GameEvents.PLAYER_DIED);
    }
  }

  public getProgress(): { level: number; soulCount: number; soulToNextLevel: number } {
    return {
      level: this.level,
      soulCount: this.soulCount,
      soulToNextLevel: this.soulToNextLevel
    };
  }

  public gainSoul(value: number): void {
    this.soulCount += value;
    if (this.soulCount >= this.soulToNextLevel) {
      this.soulCount -= this.soulToNextLevel;
      this.level += 1;
      this.soulToNextLevel = Math.floor(this.soulToNextLevel * 1.25); // TODO: tune công thức tăng EXP
      EventBus.emit(GameEvents.LEVEL_UP, this.level);
    }
  }
}
