import Phaser from "phaser";
import { Player } from "@entities/Player";
import { Enemy } from "@entities/Enemy";
import { Boss } from "@entities/Boss";
import { LootChest } from "@entities/LootChest";
import { PoolManager } from "@systems/PoolManager";
import { SpawnSystem } from "@systems/SpawnSystem";
import { WeaponSystem } from "@systems/WeaponSystem";
import { SoulSystem } from "@systems/SoulSystem";
import { PickupSystem } from "@systems/PickupSystem";
import { CombatSystem } from "@systems/CombatSystem";
import { UpgradeSystem } from "@systems/UpgradeSystem";
import { FusionSystem } from "@systems/FusionSystem";
import { BossSystem } from "@systems/BossSystem";
import { HUD } from "@ui/HUD";
import { EventBus, GameEvents } from "@utils/EventBus";
import dailyChallengesData from "@data/dailyChallenges.json";
import eliteData from "@data/elite.json";
import soulCorruptionData from "@data/soulCorruption.json";
import { DailyChallengeDef, EliteConfig, SoulCorruptionConfig } from "@types/index";
import { calculateCoinEarned } from "@utils/CoinFormula";
import { hasClaimedDailyChallengeToday, markDailyChallengeClaimedToday } from "@utils/SaveData";
import { GAMEPLAY } from "@config/GameConfig";

const dailyChallenges = dailyChallengesData as DailyChallengeDef[];
const elite = eliteData as EliteConfig;
const soulCorruption = soulCorruptionData as SoulCorruptionConfig;

// DEBUG TẠM THỜI: thay cho GAMEPLAY.BOSS_SPAWN_AT_MS thật (mặc định 5-10 phút) để test nhanh 2 boss
// mà không phải đợi lâu. Boss 1 (Giant Skeleton, bosses.json[0]) spawn ở mốc này; Boss 2 (Orc Warlord,
// bosses.json[1]) spawn ở mốc gấp đôi (nếu player còn sống và đã hạ xong Boss 1 trước đó).
// SAU KHI TEST XONG: đổi bossSpawnThresholdsMs về giá trị thật, vd [GAMEPLAY.BOSS_SPAWN_AT_MS, GAMEPLAY.RUN_DURATION_MS - 60_000].
const BOSS_SPAWN_DEBUG_MS = 12000;

// Trần delta mỗi frame dùng để tính "thời gian chơi thực tế" (elapsedPlayMs). scene.time.now là clock
// tuyệt đối của Phaser — nếu tab bị trình duyệt tạm ẩn/throttle rồi bù khung hình khi quay lại, nó có thể
// NHẢY VỌT hàng chục giây chỉ trong 1 frame (đã verify: real time trôi ~100ms nhưng scene.time.now nhảy
// ~19600ms), khiến các mốc thời gian tuyệt đối (vd BOSS_SPAWN_DEBUG_MS) bị thỏa mãn gần như ngay lập tức.
// Cộng dồn delta đã bị chặn trần mỗi frame để elapsedPlayMs luôn phản ánh đúng thời gian chơi thực tế.
const MAX_FRAME_DELTA_MS = 100;

interface GameSceneData {
  characterId: string;
  dailyChallengeId?: string; // nếu có, ván này chạy dưới modifier Daily Challenge (xem MenuScene + GAMEPLAY GDD mục 15)
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private poolManager!: PoolManager;
  private spawnSystem!: SpawnSystem;
  private weaponSystem!: WeaponSystem;
  private soulSystem!: SoulSystem;
  private pickupSystem!: PickupSystem;
  private combatSystem!: CombatSystem;
  private fusionSystem!: FusionSystem;
  private upgradeSystem!: UpgradeSystem;
  private bossSystem!: BossSystem;
  private hud!: HUD;
  private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private lootChest!: LootChest;
  private elapsedPlayMs = 0; // thời gian chơi thực tế cộng dồn từ delta đã chặn trần — xem MAX_FRAME_DELTA_MS
  private kills = 0;
  private bossesSpawnedCount = 0; // 0, 1, 2 — số boss đã spawn trong ván, xem BOSS_SPAWN_DEBUG_MS
  private comboCount = 0;
  private highestCombo = 0;
  private lastKillAtMs = -Infinity;
  private readonly COMBO_RESET_MS = 2000; // không giết thêm trong khoảng này thì lần giết tiếp theo reset combo về 1
  private activeChallenge?: DailyChallengeDef;
  private bonusCoinFromElites = 0; // cộng thẳng vào coinEarned cuối ván, xem registerKill() + computeCoinEarned()
  private bonusCoinFromBossLoot = 0; // cộng dồn Coin từ Loot Chest của các boss GIỮA CHỪNG (không phải boss cuối) — boss cuối cộng thẳng lúc kết thúc ván, xem onBossLootResolved()
  private corruptionActiveUntilTime = -Infinity; // "time" clock (giống SpawnSystem), xem activateCorruption()
  private corruptionBonusApplied = false; // tránh cộng damageMultiplier lặp lại nếu nhặt nhiều Dark Soul liên tiếp trong lúc buff đang active

  constructor() {
    super("GameScene");
  }

  create(data: GameSceneData): void {
    this.elapsedPlayMs = 0;
    this.kills = 0;
    this.bossesSpawnedCount = 0;
    this.comboCount = 0;
    this.highestCombo = 0;
    this.lastKillAtMs = -Infinity;
    this.bonusCoinFromElites = 0;
    this.bonusCoinFromBossLoot = 0;
    this.corruptionActiveUntilTime = -Infinity;
    this.corruptionBonusApplied = false;

    // TODO: khởi tạo tilemap/background Forest lặp lại theo camera (map vô tận)

    this.activeChallenge = data.dailyChallengeId
      ? dailyChallenges.find((c) => c.id === data.dailyChallengeId)
      : undefined;

    this.player = new Player(this, 480, 270, data.characterId ?? "hunter", this.activeChallenge?.playerDamageMultiplier ?? 1);
    this.poolManager = new PoolManager(this);
    this.spawnWalls();
    this.spawnSystem = new SpawnSystem(this, this.poolManager, this.player, this.activeChallenge?.enemyHpMultiplier ?? 1);
    this.soulSystem = new SoulSystem(this, this.player);
    this.bossSystem = new BossSystem(this, this.player, this.poolManager);
    this.pickupSystem = new PickupSystem(this, this.poolManager, this.player, this.soulSystem);
    this.weaponSystem = new WeaponSystem(
      this, this.player, this.poolManager, this.soulSystem, this.bossSystem, (isElite) => this.registerKill(isElite)
    );
    this.combatSystem = new CombatSystem(this, this.player, this.poolManager);
    this.fusionSystem = new FusionSystem();
    this.upgradeSystem = new UpgradeSystem(this.player, this.fusionSystem);
    this.lootChest = new LootChest(this); // rương chiến lợi phẩm rơi khi hạ boss THƯỜNG (không phải Final Boss), xem onBossDefeated()

    // HUD là object tạo mới mỗi ván (khác GameScene/LevelUpScene là scene singleton) — phải hủy đăng ký
    // EventBus của HUD ván trước, nếu không nó vẫn nhận event và thao tác lên GameObject đã bị destroy,
    // gây treo game khi ván sau bắn event BOSS_SPAWNED/BOSS_DEFEATED/PLAYER_DIED (xem HUD.destroy()).
    this.hud?.destroy();
    this.hud = new HUD(this, this.player, this.bossSystem);

    // lerpX/lerpY 0.1 — camera đuổi theo mượt thay vì snap tức thì mỗi frame (snap + roundPixels dễ gây giật khi player di chuyển)
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    EventBus.off(GameEvents.PLAYER_DIED, this.onPlayerDied, this); // tránh đăng ký trùng khi chơi lại nhiều lần
    EventBus.on(GameEvents.PLAYER_DIED, this.onPlayerDied, this);
    EventBus.off(GameEvents.BOSS_DEFEATED, this.onBossDefeated, this);
    EventBus.on(GameEvents.BOSS_DEFEATED, this.onBossDefeated, this);
    EventBus.off(GameEvents.FINAL_BOSS_DEFEATED, this.onFinalBossDefeated, this);
    EventBus.on(GameEvents.FINAL_BOSS_DEFEATED, this.onFinalBossDefeated, this);

    this.scene.launch("LevelUpScene"); // chạy song song, LevelUpScene tự lắng nghe EventBus.LEVEL_UP
  }

  update(time: number, delta: number): void {
    this.elapsedPlayMs += Math.min(delta, MAX_FRAME_DELTA_MS);

    this.player.update(delta);
    this.spawnSystem.update(time, delta);
    this.weaponSystem.update(time, delta);
    this.soulSystem.update(delta);
    this.pickupSystem.update(time, delta);
    this.combatSystem.update(time, delta);
    this.bossSystem.update(time, delta);

    if (this.soulSystem.consumeDarkSoulPickup()) {
      this.activateCorruption(time);
    }
    if (this.corruptionBonusApplied && time >= this.corruptionActiveUntilTime) {
      this.player.stats.damageMultiplier -= soulCorruption.corruptionDamageBonus;
      this.corruptionBonusApplied = false;
    }

    this.hud.update(this.elapsedPlayMs, Math.max(0, this.corruptionActiveUntilTime - time));

    // Loot Chest KHÔNG tự hút theo Magnet như Soul — chỉ kiểm tra va chạm trực tiếp, player phải chủ động đi tới nhặt.
    if (this.lootChest.active) {
      const dist = Phaser.Math.Distance.Between(
        this.player.sprite.x, this.player.sprite.y,
        this.lootChest.container.x, this.lootChest.container.y
      );
      if (dist <= GAMEPLAY.LOOT_CHEST_COLLECT_RADIUS) {
        this.lootChest.despawn();
        this.openBossLoot();
      }
    }

    // DEBUG TẠM THỜI — xem comment ở đầu file. Boss thứ N+1 chỉ spawn khi đã qua mốc thời gian riêng
    // VÀ chưa có boss nào đang sống (đảm bảo Boss 2 chỉ xuất hiện sau khi Boss 1 bị hạ, không spawn chồng).
    const bossSpawnThresholdsMs = [BOSS_SPAWN_DEBUG_MS, BOSS_SPAWN_DEBUG_MS * 2];
    if (
      this.bossesSpawnedCount < bossSpawnThresholdsMs.length &&
      this.elapsedPlayMs >= bossSpawnThresholdsMs[this.bossesSpawnedCount] &&
      !this.bossSystem.getBoss()
    ) {
      this.bossSystem.spawnBoss(this.bossesSpawnedCount);
      this.bossesSpawnedCount += 1;
      EventBus.emit(GameEvents.BOSS_SPAWNED);
    }
  }

  private onPlayerDied(): void {
    this.scene.stop("LevelUpScene"); // tránh card level-up đè lên màn hình Game Over nếu đang mở đúng lúc chết
    const survivalTimeMs = this.elapsedPlayMs;
    this.scene.start("GameOverScene", {
      survivalTimeMs,
      kills: this.kills,
      coinEarned: this.computeCoinEarned(false),
      highestCombo: this.highestCombo,
      victory: false
    });
  }

  /**
   * Boss THƯỜNG (isFinalBoss !== true, vd Giant Skeleton) chết đều rơi Loot Chest 100% tại đúng vị trí vừa
   * chết — CHƯA trigger vòng xoay (vòng xoay chỉ mở khi player chủ động va chạm nhặt rương, xem
   * update()/openBossLoot()). Final Boss KHÔNG đi qua đường này — xem onFinalBossDefeated().
   */
  private onBossDefeated(pos: { x: number; y: number }): void {
    this.lootChest.spawn(pos.x, pos.y);
  }

  /** Player vừa va chạm nhặt Loot Chest — mở vòng xoay chiến lợi phẩm, tự pause GameScene, chờ BOSS_LOOT_RESOLVED. */
  private openBossLoot(): void {
    this.scene.stop("LevelUpScene"); // tránh card level-up đè lên vòng xoay nếu đang mở đúng lúc nhặt rương
    EventBus.off(GameEvents.BOSS_LOOT_RESOLVED, this.onBossLootResolved, this);
    EventBus.once(GameEvents.BOSS_LOOT_RESOLVED, this.onBossLootResolved, this);
    this.scene.launch("BossLootScene");
  }

  /**
   * BossLootScene bắn về sau khi player xem kết quả vòng quay — bonusCoin (nếu loại thưởng là coin/darkSoul)
   * cộng dồn vào coinEarned cuối ván. Rương luôn rơi từ boss THƯỜNG (Final Boss không rơi rương, xem
   * onFinalBossDefeated) nên nhặt xong chỉ nhận thưởng rồi resume chơi tiếp, KHÔNG kết thúc ván — phải
   * launch lại LevelUpScene (vừa bị stop ở openBossLoot()) để các lượt lên cấp tiếp theo vẫn hoạt động.
   */
  private onBossLootResolved(bonusCoin: number): void {
    this.scene.stop("BossLootScene");
    this.bonusCoinFromBossLoot += bonusCoin;
    this.scene.resume();
    this.scene.launch("LevelUpScene");
  }

  /**
   * Final Boss (isFinalBoss: true, vd Orc Warlord) chết — KHÔNG rơi Loot Chest, đi thẳng cutscene chiến
   * thắng chạy TUẦN TỰ 3 bước (bước sau chỉ bắt đầu khi bước trước hoàn tất hẳn, không song song). MỌI mốc
   * chờ giữa các bước dùng setTimeout() THUẦN JAVASCRIPT (không phải scene.time.delayedCall) — lý do: sau
   * khi Bước 2 set scene.time.timeScale = 0.06, bất kỳ scene.time.delayedCall nào lên lịch SAU thời điểm đó
   * sẽ bị chính timeScale đó làm kéo dài giả (Clock nhân delta với timeScale trước khi cộng dồn elapsed của
   * TimerEvent), khiến "chờ 3000ms" thực tế mất tới 3000/0.06 = 50000ms thật. setTimeout() nằm ngoài hoàn
   * toàn hệ thời gian của Phaser nên luôn đúng mili-giây thật, bất kể timeScale đang là bao nhiêu.
   *   Bước 0 (đã làm ở BossSystem.killBoss() → Boss.stopForDeathCutscene() TRƯỚC KHI emit event này):
   *     boss đã đứng yên tuyệt đối — velocity 0, physics body tắt hẳn, mọi tween cũ đã huỷ, isDying=true
   *     chặn update() — nên tại đây boss.sprite.x/y chắc chắn KHÔNG còn đổi nữa.
   *   Bước 1 (hàm này): camera pan 0.5s tới đúng vị trí boss, KHÔNG đổi zoom — đợi pan xong (setTimeout 500ms,
   *     lúc này timeScale vẫn còn 1 nên không có rủi ro lệch) mới sang bước 2.
   *   Bước 2 (runFinalBossSlowMotionAndFade): slow-motion gần đứng hình + bọt khí quanh boss + alpha fade
   *     dần đều, kéo dài ĐÚNG FINAL_BOSS_FADE_REAL_MS (3000ms) thật — mốc chuyển sang bước 3 là setTimeout
   *     riêng, KHÔNG phải tween onComplete (tween chỉ lo phần hình ảnh, không phải nguồn chân lý về thời gian).
   *   Bước 3 (finishFinalBossCutscene): trả timeScale, fade đen, chuyển GameOverScene victory:true.
   */
  private onFinalBossDefeated({ boss }: { boss: Boss; x: number; y: number }): void {
    this.scene.stop("LevelUpScene"); // tránh card level-up đè lên cutscene chiến thắng
    // Phòng trường hợp LevelUpScene đang mở đúng lúc boss chết (đã tự pause GameScene trước đó) — resume
    // lại ngay để tween/pan/timeScale cutscene bên dưới thực sự chạy, không bị đứng hình do GameScene còn pause.
    this.scene.resume();

    const t0 = Date.now();
    console.log(`[FinalBossCutscene] Bước 1 (camera pan ${GAMEPLAY.FINAL_BOSS_PAN_MS}ms) bắt đầu @ ${t0}`);

    this.cameras.main.stopFollow();
    this.cameras.main.pan(boss.sprite.x, boss.sprite.y, GAMEPLAY.FINAL_BOSS_PAN_MS, "Sine.easeInOut");

    setTimeout(() => {
      const t1 = Date.now();
      console.log(`[FinalBossCutscene] Bước 1 kết thúc @ ${t1} (đã trôi ${t1 - t0}ms, kỳ vọng ~${GAMEPLAY.FINAL_BOSS_PAN_MS}ms) — Bước 2 bắt đầu`);
      this.runFinalBossSlowMotionAndFade(boss, t0);
    }, GAMEPLAY.FINAL_BOSS_PAN_MS);
  }

  /** Bước 2: slow-motion gần đứng hình + bọt khí quanh boss (đứng yên từ bước 0) + boss tan biến dần đều, kéo dài ĐÚNG FINAL_BOSS_FADE_REAL_MS thật (mốc bằng setTimeout, không phải tween onComplete). */
  private runFinalBossSlowMotionAndFade(boss: Boss, t0: number): void {
    const t1 = Date.now();
    this.time.timeScale = GAMEPLAY.FINAL_BOSS_SLOWMO_TIMESCALE;
    this.physics.world.timeScale = GAMEPLAY.FINAL_BOSS_SLOWMO_TIMESCALE;

    const bossX = boss.sprite.x;
    const bossY = boss.sprite.y;
    const bubbleTimer = setInterval(() => this.spawnFinalBossBubble(bossX, bossY), GAMEPLAY.FINAL_BOSS_BUBBLE_INTERVAL_MS);

    // this.tweens KHÔNG phụ thuộc time.timeScale (TweenManager nhận delta thô từ vòng lặp game, không qua
    // Clock đã bị hạ timeScale) nên duration ở đây chính là thời gian thật — nhưng đây CHỈ lo phần hình ảnh,
    // KHÔNG dùng onComplete của tween này làm mốc chuyển bước (xem setTimeout riêng bên dưới).
    this.tweens.add({
      targets: boss.sprite,
      alpha: 0,
      duration: GAMEPLAY.FINAL_BOSS_FADE_REAL_MS,
      ease: "Linear"
    });

    setTimeout(() => {
      const t2 = Date.now();
      console.log(`[FinalBossCutscene] Bước 2 kết thúc @ ${t2} (slow-motion+fade kéo dài ${t2 - t1}ms thật, kỳ vọng ~${GAMEPLAY.FINAL_BOSS_FADE_REAL_MS}ms) — Bước 3 bắt đầu`);
      clearInterval(bubbleTimer);
      this.finishFinalBossCutscene(boss, t0);
    }, GAMEPLAY.FINAL_BOSS_FADE_REAL_MS);
  }

  /** Bước 3: boss đã tan biến hoàn toàn — trả timeScale, fade đen, rồi mới chuyển GameOverScene. */
  private finishFinalBossCutscene(boss: Boss, t0: number): void {
    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;
    boss.destroy();

    this.cameras.main.fadeOut(GAMEPLAY.FINAL_BOSS_FADE_OUT_MS, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      const t3 = Date.now();
      console.log(`[FinalBossCutscene] Bước 3 kết thúc, chuyển GameOverScene @ ${t3} (TỔNG CỘNG ${t3 - t0}ms thật kể từ lúc boss chết)`);
      const survivalTimeMs = this.elapsedPlayMs;
      this.scene.start("GameOverScene", {
        survivalTimeMs,
        kills: this.kills,
        coinEarned: this.computeCoinEarned(true),
        highestCombo: this.highestCombo,
        victory: true
      });
    });
  }

  /** 1 bọt khí nhỏ trôi nhẹ ra xung quanh rồi fade — placeholder Graphics cho tới khi có particle texture thật. */
  private spawnFinalBossBubble(centerX: number, centerY: number): void {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const startDist = Phaser.Math.FloatBetween(0, 20);
    const startX = centerX + Math.cos(angle) * startDist;
    const startY = centerY + Math.sin(angle) * startDist;
    const driftDist = Phaser.Math.FloatBetween(30, 60);

    const bubble = this.add.circle(startX, startY, Phaser.Math.Between(2, 5), 0xbfefff, 0.5).setDepth(20);
    bubble.setStrokeStyle(1, 0xffffff, 0.6);

    this.tweens.add({
      targets: bubble,
      x: startX + Math.cos(angle) * driftDist,
      y: startY + Math.sin(angle) * driftDist - Phaser.Math.Between(10, 30), // trôi hơi lên nhẹ, giống bọt khí nổi
      scale: 1.4,
      alpha: 0,
      duration: Phaser.Math.Between(900, 1400),
      ease: "Sine.easeOut",
      onComplete: () => bubble.destroy()
    });
  }

  /**
   * Coin cuối ván — nếu đang chơi Daily Challenge VÀ chưa nhận thưởng nhân hệ số hôm nay thì áp dụng
   * coinRewardMultiplier rồi đánh dấu đã nhận (GDD mục 15: chơi lại thoải mái trong ngày nhưng chỉ tính
   * thưởng nhân hệ số 1 lần/ngày, tránh farm Coin bằng cách chơi Daily Challenge liên tục). Coin bonus
   * từ Elite Enemy (GDD mục 18) và soul dư sau khi đạt Max Level cộng thẳng vào sau cùng, không nhân
   * theo Daily Challenge multiplier.
   */
  private computeCoinEarned(victory: boolean): number {
    let coinEarned: number;
    if (this.activeChallenge && !hasClaimedDailyChallengeToday()) {
      coinEarned = calculateCoinEarned(this.kills, this.elapsedPlayMs, victory, this.activeChallenge.coinRewardMultiplier);
      markDailyChallengeClaimedToday();
    } else {
      coinEarned = calculateCoinEarned(this.kills, this.elapsedPlayMs, victory);
    }
    return coinEarned + this.bonusCoinFromElites + this.bonusCoinFromBossLoot + this.player.bonusCoinFromOverflowSoul;
  }

  public registerKill(isElite = false): void {
    this.kills += 1;
    if (isElite) this.bonusCoinFromElites += elite.eliteCoinBonus;

    // Combo: chuỗi kill liên tiếp trong COMBO_RESET_MS — quá khoảng này thì lần giết tiếp theo bắt đầu lại từ 1.
    if (this.elapsedPlayMs - this.lastKillAtMs <= this.COMBO_RESET_MS) {
      this.comboCount += 1;
    } else {
      this.comboCount = 1;
    }
    this.lastKillAtMs = this.elapsedPlayMs;
    this.highestCombo = Math.max(this.highestCombo, this.comboCount);
  }

  /**
   * Soul Corruption (Dark Soul pickup, GDD mục 18): +damageMultiplier tạm thời (chỉ cộng 1 lần, nhặt
   * thêm Dark Soul trong lúc đang active chỉ gia hạn thời gian chứ không cộng chồng) + báo SpawnSystem
   * tăng tốc độ spawn trong cùng khoảng thời gian.
   */
  private activateCorruption(time: number): void {
    if (!this.corruptionBonusApplied) {
      this.player.stats.damageMultiplier += soulCorruption.corruptionDamageBonus;
      this.corruptionBonusApplied = true;
    }
    this.corruptionActiveUntilTime = time + soulCorruption.corruptionDurationMs;
    this.spawnSystem.activateCorruption(time, soulCorruption.corruptionDurationMs);
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getUpgradeSystem(): UpgradeSystem {
    return this.upgradeSystem;
  }

  public getFusionSystem(): FusionSystem {
    return this.fusionSystem;
  }

  public getBossSystem(): BossSystem {
    return this.bossSystem;
  }

  /**
   * Wall (GDD chưa có tilemap thật, dùng static physics body placeholder) — rải vài cụm quanh khu vực player
   * xuất phát, đủ thưa để không cản trở gameplay chính. Player + mọi Enemy va chạm (chặn đường đi), TRỪ Ghost
   * (def.flag === "phasing", xử lý qua processCallback vì cùng 1 sprite pool được tái sử dụng cho nhiều loại quái).
   */
  private spawnWalls(): void {
    this.wallsGroup = this.physics.add.staticGroup();

    const CLUSTER_COUNT = 14;
    const RECTS_PER_CLUSTER_MIN = 2;
    const RECTS_PER_CLUSTER_MAX = 4;
    const MIN_DIST_FROM_SPAWN = 260; // tránh vây kín player ngay lúc bắt đầu ván
    const MAX_DIST_FROM_SPAWN = 2600;
    const spawnX = 480;
    const spawnY = 270;

    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(MIN_DIST_FROM_SPAWN, MAX_DIST_FROM_SPAWN);
      const clusterX = spawnX + Math.cos(angle) * dist;
      const clusterY = spawnY + Math.sin(angle) * dist;

      const rectCount = Phaser.Math.Between(RECTS_PER_CLUSTER_MIN, RECTS_PER_CLUSTER_MAX);
      for (let j = 0; j < rectCount; j++) {
        const x = clusterX + Phaser.Math.Between(-60, 60);
        const y = clusterY + Phaser.Math.Between(-60, 60);
        const wall = this.wallsGroup.create(x, y, "wall_placeholder") as Phaser.Physics.Arcade.Sprite;
        wall.refreshBody(); // static body cần refresh lại sau khi đặt vị trí qua group.create()
      }
    }

    this.physics.add.collider(this.player.sprite, this.wallsGroup);
    this.physics.add.collider(
      this.poolManager.getAllEnemySprites(),
      this.wallsGroup,
      undefined,
      (obj) => {
        const enemy = (obj as Phaser.Physics.Arcade.Sprite).getData("enemyInstance") as Enemy | undefined;
        return !!enemy?.active && enemy.def?.flag !== "phasing";
      }
    );
  }

  /** PauseScene "Play Again" đọc lại để restart đúng điều kiện ván hiện tại (giữ nguyên Daily Challenge nếu có). */
  public getActiveChallengeId(): string | undefined {
    return this.activeChallenge?.id;
  }
}
