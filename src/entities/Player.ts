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
  private swordHpBonusApplied = false; // đánh dấu đã cộng GAMEPLAY.SWORD_HP_BONUS chưa, tránh cộng/trừ trùng lặp — xem syncSwordHpBonus()
  // Làm chậm tạm thời (vd Boss skill freeze_pulse) — cùng pattern slowFactor/slowUntil với Enemy.applySlow().
  private slowFactor = 0;
  private slowUntil = 0;
  private soulCount = 0;
  private level = 1;
  private soulToNextLevel = 10;
  public currentDirection: "up" | "down" | "left" | "right" = "down";
  private isAttacking = false;
  // State tracking cho updateMovementAnimation() — CHỈ gọi lại anims.play()/setTexture() khi 1 trong 2 giá trị
  // này thực sự đổi so với lần trước, tránh gọi lại animation mỗi frame dù hướng/trạng thái không đổi (nguyên
  // nhân gây chớp nháy). null = "cần áp lại animation ngay lần update() tới" — dùng lúc Attack1 vừa kết thúc để
  // ép quay lại đúng Run/Idle dù hướng+trạng thái di chuyển giống hệt lúc trước khi bắt đầu đòn đánh.
  private lastDirection: "up" | "down" | "left" | "right" | null = null;
  private lastMovementState: "moving" | "idle" | null = null;
  // Frame (0-based, khớp đúng file PNG gốc) lúc mũi tên rời cung trong animation Attack1 — xác định bằng cách
  // xem trực tiếp từng frame attack1_<hướng>.png: frame 2 dây cung còn kéo căng, frame 3 dây đã bung/mũi tên
  // tách khỏi cung (rõ nhất ở "left": mũi tên hiện hẳn ra phía trước cung). Cả 4 hướng đều trùng tại frame 3.
  private readonly attackReleaseFrame: Record<"up" | "down" | "left" | "right", number> = {
    up: 3,
    down: 3,
    left: 3,
    right: 3
  };
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

    this.createAnimations();

    // Ưu tiên Run rồi tới Attack cho frame đứng ban đầu — nhân vật có thể CHƯA có Run (vd Assassin/Mage lúc này),
    // fallback cuối cùng là player_placeholder (hình vuông màu, xem BootScene) nếu không có sprite thật nào.
    const initialRunKey = this.runKey("down");
    const initialAttackKey = this.attackKey("down");
    let initialTexture = "player_placeholder";
    let hasInitialFrame = false;
    if (this.scene.textures.exists(initialRunKey)) {
      initialTexture = initialRunKey;
      hasInitialFrame = true;
    } else if (this.scene.textures.exists(initialAttackKey)) {
      initialTexture = initialAttackKey;
      hasInitialFrame = true;
    } else {
      console.warn(`[Player] characterId="${this.characterId}" không có sprite Run/Attack nào — dùng player_placeholder.`);
    }
    this.sprite = hasInitialFrame
      ? scene.physics.add.sprite(x, y, initialTexture, 0)
      : scene.physics.add.sprite(x, y, initialTexture);
    // Neo giữa-đáy: Run/Attack1 đều dùng chung khung 96x110, đổi animation qua lại không bị lệch chân nhân vật.
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setCollideWorldBounds(false); // map vô tận, không chặn biên
    // Frame 96x110 nhưng nhân vật thật chỉ chiếm khoảng giữa khung hình (đã đo bbox qua Pillow) — thu nhỏ hitbox
    // vật lý (dùng cho wall collider) để khớp đúng bóng nhân vật thay vì để nguyên cả khung hình trong suốt.
    this.sprite.body!.setSize(28, 40);
    this.sprite.body!.setOffset(34, 64);

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
    this.syncSwordHpBonus();
  }

  /** Key texture/animation namespace theo characterId (vd "run_hunter_down") — nhiều nhân vật cùng tồn tại trong TextureManager mà không đè lên nhau khi đổi nhân vật giữa phiên, xem CharacterSpriteLoader. */
  private runKey(dir: "up" | "down" | "left" | "right"): string {
    return `run_${this.characterId}_${dir}`;
  }

  private attackKey(dir: "up" | "down" | "left" | "right"): string {
    return `attack_${this.characterId}_${dir}`;
  }

  /**
   * Tạo animation Run/Attack1 4 hướng 1 lần cho ĐÚNG characterId hiện tại (guard bằng anims.exists — Player
   * khởi tạo lại mỗi ván nhưng AnimationManager dùng chung toàn Scene Manager). Chỉ tạo animation cho hướng nào
   * CÓ texture tương ứng đã load — nhân vật chưa có Run/Attack (xem CharacterSpriteLoader) sẽ đơn giản không có
   * animation đó, updateMovementAnimation()/playAttackAnimation() tự kiểm tra và fallback placeholder.
   */
  private createAnimations(): void {
    const directions: Array<"up" | "down" | "left" | "right"> = ["up", "down", "left", "right"];
    for (const dir of directions) {
      const runKey = this.runKey(dir);
      if (this.scene.textures.exists(runKey) && !this.scene.anims.exists(runKey)) {
        this.scene.anims.create({
          key: runKey,
          frames: this.scene.anims.generateFrameNumbers(runKey, { start: 0, end: 7 }),
          frameRate: 11,
          repeat: -1
        });
      }
      const attackKey = this.attackKey(dir);
      if (this.scene.textures.exists(attackKey) && !this.scene.anims.exists(attackKey)) {
        this.scene.anims.create({
          key: attackKey,
          frames: this.scene.anims.generateFrameNumbers(attackKey, { start: 0, end: 7 }),
          frameRate: 15,
          repeat: 0
        });
      }
    }
  }

  /**
   * Sword đổi lại +SWORD_HP_BONUS Max HP khi trang bị (bù cho baseDamage thấp hơn hẳn vũ khí khác) — gọi lại
   * mỗi lần equippedWeapons thay đổi (thêm vũ khí mới, hoặc Sword bị fusion "nuốt" mất) để cộng/trừ đúng 1 lần.
   */
  public syncSwordHpBonus(): void {
    const hasSword = this.equippedWeapons.some((w) => w.weaponId === "sword" && !w.fusedInto);
    if (hasSword && !this.swordHpBonusApplied) {
      this.stats.maxHp += GAMEPLAY.SWORD_HP_BONUS;
      this.stats.currentHp += GAMEPLAY.SWORD_HP_BONUS;
      this.swordHpBonusApplied = true;
    } else if (!hasSword && this.swordHpBonusApplied) {
      this.stats.maxHp -= GAMEPLAY.SWORD_HP_BONUS;
      this.stats.currentHp = Math.min(this.stats.currentHp, this.stats.maxHp);
      this.swordHpBonusApplied = false;
    }
  }

  update(time: number, delta: number): void {
    // setVelocity() nhận world units/giây — Arcade Physics tự nhân với delta mỗi step, không cần nhân delta thủ công ở đây.
    const slowMultiplier = time < this.slowUntil ? 1 - this.slowFactor : 1;
    // moveSpeedMultiplier (move_speed_up upgrade) KHÔNG pre-init trong constructor như damageMultiplier/cooldownMultiplier
    // (những stat đó bắt đầu = 1, upgrade cộng thẳng) — field này bắt đầu undefined, upgrade cộng dồn % thô
    // (0.1/0.2/...) nên phải tự +1 ở đây lúc đọc, không nhân thẳng giá trị thô vào speed.
    const speed = this.stats.moveSpeed * slowMultiplier * (1 + (this.stats.moveSpeedMultiplier ?? 0));
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
    this.updateMovementAnimation(vx, vy);

    // hp_regen upgrade: hồi liên tục theo delta thay vì tick rời rạc mỗi giây — mượt hơn trên HUD, heal() đã tự clamp maxHp.
    if (this.stats.hpRegenPerSecond) this.heal(this.stats.hpRegenPerSecond * (delta / 1000));
  }

  /**
   * Thứ tự phòng thủ: Shield (miễn nhiễm hoàn toàn, tiêu 1 charge) -> Dodge (né hẳn, không mất charge) ->
   * Armor/flatDamageReduction (trừ thẳng vào damage, sàn 0) -> trừ HP. Né/chặn hoàn toàn thì KHÔNG chạy
   * playHitFeedback (không flash/shake cho đòn không hề trúng).
   */
  public takeDamage(amount: number): void {
    if (this.stats.shieldCharges > 0) {
      this.stats.shieldCharges -= 1;
      return;
    }
    if (this.stats.dodgeChance && Phaser.Math.FloatBetween(0, 1) < this.stats.dodgeChance) {
      return;
    }

    const reduced = Math.max(0, amount - (this.stats.flatDamageReduction ?? 0));
    this.stats.currentHp -= reduced;
    this.playHitFeedback(reduced);
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

  /**
   * Đổi animation Run theo hướng di chuyển WASD — không đè lên animation Attack1 đang chạy (xem playAttackAnimation()).
   * CHỈ set lại animation/texture khi hướng HOẶC trạng thái di chuyển thực sự đổi so với lần gọi trước (lastDirection/
   * lastMovementState) — gọi lại anims.play()/setTexture() mỗi frame dù không đổi gì từng gây chớp nháy, đặc biệt rõ
   * với nhân vật CHƯA có sprite Run (Assassin): mỗi lần Attack1 (Triple Throw tự bắn) kết thúc, nhánh fallback dưới
   * đây từng luôn set về "player_placeholder" (ô vuông xanh) bất kể đã ở trạng thái đó chưa, tạo cảm giác nhấp nháy
   * qua lại với texture Attack thật mỗi chu kỳ cooldown.
   */
  private updateMovementAnimation(vx: number, vy: number): void {
    if (this.isAttacking) return;

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      // Ưu tiên trục ngang khi đi chéo (chỉ có 4 hướng sprite, không có hướng chéo riêng).
      this.currentDirection = vx !== 0 ? (vx > 0 ? "right" : "left") : vy > 0 ? "down" : "up";
    }
    const movementState: "moving" | "idle" = moving ? "moving" : "idle";

    // lastDirection/lastMovementState === null nghĩa là "vừa hết Attack1, bắt buộc áp lại animation ngay" (set ở
    // animationcomplete trong playAttackAnimation()) — kể cả khi hướng+trạng thái giống hệt lúc trước lúc đánh.
    const forceReapply = this.lastDirection === null || this.lastMovementState === null;
    if (!forceReapply && this.lastDirection === this.currentDirection && this.lastMovementState === movementState) {
      return;
    }
    this.lastDirection = this.currentDirection;
    this.lastMovementState = movementState;

    const runKey = this.runKey(this.currentDirection);
    if (!this.scene.anims.exists(runKey)) {
      // Chưa có sprite Run (vd Assassin lúc này) — ưu tiên đứng yên ở frame đầu Attack (đã load, hình nhân vật
      // thật) thay vì rơi thẳng về player_placeholder — chỉ dùng placeholder khi KHÔNG có cả Attack lẫn Run.
      const attackKey = this.attackKey(this.currentDirection);
      if (this.scene.textures.exists(attackKey)) {
        this.sprite.anims.stop();
        this.sprite.setTexture(attackKey, 0);
      } else {
        this.sprite.setTexture("player_placeholder");
      }
      return;
    }

    if (moving) {
      this.sprite.anims.play(runKey, true); // ignoreIfPlaying=true — không restart animation nếu đang chạy đúng key
    } else {
      // TODO: chưa có sprite Idle riêng — tạm dừng ở frame đầu Run làm Idle, thay bằng animation Idle thật khi có asset.
      this.sprite.anims.stop();
      this.sprite.setTexture(runKey, 0);
    }
  }

  /**
   * Gọi khi Sword/Bow tấn công (xem WeaponSystem.fire() case "melee"/"projectile_straight") — phát Attack1 theo
   * hướng đang currentDirection, khóa animation di chuyển tới khi phát xong.
   *
   * `onRelease` (dùng cho Bow): thay vì bắn projectile ngay lúc gọi hàm này, WeaponSystem truyền vào 1 callback
   * chỉ được gọi ĐÚNG lúc animation chạy tới frame mũi tên rời cung (attackReleaseFrame). Phaser CHỈ emit sự kiện
   * `animationupdate` DÙNG CHUNG (không có biến thể `animationupdate-<key>` như `animationcomplete-<key>` —
   * đã verify trực tiếp trong AnimationState.js: chỉ ANIMATION_COMPLETE mới emit thêm bản có key, ANIMATION_UPDATE
   * thì không) nên phải lắng nghe event chung rồi tự lọc `anim.key === key`. `released` chặn gọi trùng nếu
   * animationupdate bắn nhiều lần cho cùng 1 frame.
   *
   * `aimAngleRad` (dùng cho Bow): góc bắn thật (atan2 tới quái gần nhất) tại thời điểm BẮT ĐẦU đòn đánh — quy
   * đổi sang 1 trong 4 hướng animation gần nhất (xem angleToDirection) để chọn đúng attack_up/down/left/right.
   * Mũi tên thật KHÔNG bị bó theo hướng này — WeaponSystem tự bắn theo góc thật lúc release, animation nhân vật
   * chỉ là xấp xỉ trực quan gần nhất trong 4 hướng có sẵn.
   */
  public playAttackAnimation(onRelease?: () => void, aimAngleRad?: number): void {
    if (aimAngleRad !== undefined) this.currentDirection = this.angleToDirection(aimAngleRad);
    const key = this.attackKey(this.currentDirection);

    if (!this.scene.anims.exists(key)) {
      // Nhân vật chưa có sprite Attack (vd Mage lúc này — xem CharacterSpriteLoader) — không có animation để
      // đồng bộ frame release, nhưng vũ khí vẫn phải bắn ngay, không được im lặng mất tác dụng.
      if (onRelease) onRelease();
      return;
    }

    this.isAttacking = true;
    this.sprite.anims.play(key, true);

    let updateHandler: ((anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => void) | undefined;
    if (onRelease) {
      const releaseFrame = this.attackReleaseFrame[this.currentDirection];
      let released = false;
      updateHandler = (anim, frame) => {
        if (released || anim.key !== key) return;
        if (Number(frame.frame.name) === releaseFrame) {
          released = true;
          onRelease();
        }
      };
      this.sprite.on("animationupdate", updateHandler);
    }

    this.sprite.once(`animationcomplete-${key}`, () => {
      this.isAttacking = false;
      if (updateHandler) this.sprite.off("animationupdate", updateHandler);
      // updateMovementAnimation() chạy lại ngay ở update() frame kế tiếp, tự chọn đúng Run/Idle theo trạng thái
      // di chuyển TẠI THỜI ĐIỂM ĐÓ (không phải lúc bắt đầu đòn đánh) — không set cứng animation ở đây.
      // Reset về null để ép updateMovementAnimation() áp lại animation NGAY (bỏ qua guard lastDirection/
      // lastMovementState) — texture hiện tại vẫn đang là frame cuối Attack1, phải chủ động quay lại Run/Idle.
      this.lastDirection = null;
      this.lastMovementState = null;
    });
  }

  /** Quy đổi góc bắn (radian, quy ước Phaser: 0 = phải, dương = xuống) sang 1 trong 4 hướng animation gần nhất — chia 360° thành 4 phần tư 90° quanh trục right/down/left/up. */
  private angleToDirection(angleRad: number): "up" | "down" | "left" | "right" {
    const deg = Phaser.Math.RadToDeg(angleRad); // (-180, 180]
    if (deg >= -45 && deg < 45) return "right";
    if (deg >= 45 && deg < 135) return "down";
    if (deg >= -135 && deg < -45) return "up";
    return "left";
  }

  /** Gắn hiệu ứng làm chậm (vd Boss skill freeze_pulse) — factor=0.5 nghĩa là di chuyển chậm đi 50%. */
  public applySlow(factor: number, durationMs: number, time: number): void {
    this.slowFactor = factor;
    this.slowUntil = time + durationMs;
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
