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
import { VictoryController } from "@systems/VictoryController";
import { Challenge7DaysManager } from "@systems/Challenge7DaysManager";
import { HUD } from "@ui/HUD";
import { EventBus, GameEvents } from "@utils/EventBus";
import dailyChallengesData from "@data/dailyChallenges.json";
import eliteData from "@data/elite.json";
import soulCorruptionData from "@data/soulCorruption.json";
import { DailyChallengeDef, EliteConfig, SoulCorruptionConfig } from "@types/index";
import { calculateCoinEarned } from "@utils/CoinFormula";
import { hasClaimedDailyChallengeToday, markDailyChallengeClaimedToday } from "@utils/SaveData";
import { getMapById, getEnemyDataForMap, markMapCleared, getNextMap } from "@utils/MapData";
import { GAMEPLAY } from "@config/GameConfig";
import bossesData from "@data/bosses.json";
import { BossDef } from "@types/index";

const dailyChallenges = dailyChallengesData as DailyChallengeDef[];
const elite = eliteData as EliteConfig;
const soulCorruption = soulCorruptionData as SoulCorruptionConfig;
const bosses = bossesData as BossDef[];

// DEBUG TẠM THỜI: thay cho GAMEPLAY.BOSS_SPAWN_AT_MS thật (mặc định 5-10 phút) để test nhanh boss cuối
// map mà không phải đợi lâu. Mỗi map chỉ có 1 boss cuối (mapDef.bossId, luôn isFinalBoss — xem MapData.ts),
// spawn ở mốc này. SAU KHI TEST XONG: đổi về giá trị thật, vd GAMEPLAY.BOSS_SPAWN_AT_MS.
const BOSS_SPAWN_DEBUG_MS = 12000;

// Trần delta mỗi frame dùng để tính "thời gian chơi thực tế" (elapsedPlayMs). scene.time.now là clock
// tuyệt đối của Phaser — nếu tab bị trình duyệt tạm ẩn/throttle rồi bù khung hình khi quay lại, nó có thể
// NHẢY VỌT hàng chục giây chỉ trong 1 frame (đã verify: real time trôi ~100ms nhưng scene.time.now nhảy
// ~19600ms), khiến các mốc thời gian tuyệt đối (vd BOSS_SPAWN_DEBUG_MS) bị thỏa mãn gần như ngay lập tức.
// Cộng dồn delta đã bị chặn trần mỗi frame để elapsedPlayMs luôn phản ánh đúng thời gian chơi thực tế.
const MAX_FRAME_DELTA_MS = 100;

interface GameSceneData {
  characterId: string;
  mapId?: string; // id trong data/maps.json — quyết định bộ quái + boss cuối của ván, mặc định "forest" nếu thiếu
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
  private victoryController!: VictoryController;
  private hud!: HUD;
  private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private lootChest!: LootChest;
  private elapsedPlayMs = 0; // thời gian chơi thực tế cộng dồn từ delta đã chặn trần — xem MAX_FRAME_DELTA_MS
  private kills = 0;
  private mapId = "forest"; // map đang chơi (xem create()) — dùng để chọn bộ quái/boss + markMapCleared() khi thắng
  private mapBossId = "giant_skeleton"; // mapDef.bossId của map đang chơi — xem create()
  private bossSpawned = false; // mỗi map chỉ có đúng 1 boss cuối (mapDef.bossId) — xem BOSS_SPAWN_DEBUG_MS
  private isVictoryCinematicActive = false; // true trong suốt Boss Death Cinematic — chặn spawn quái mới, Pause, và Player chết (xem update()/onPlayerDied())
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
    this.mapId = data.mapId ?? "forest";
    this.bossSpawned = false;
    this.isVictoryCinematicActive = false;
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

    const mapDef = getMapById(this.mapId) ?? getMapById("forest")!;
    const mapEnemies = getEnemyDataForMap(mapDef);

    this.player = new Player(this, 480, 270, data.characterId ?? "hunter", this.activeChallenge?.playerDamageMultiplier ?? 1);
    this.poolManager = new PoolManager(this);
    this.spawnWalls();
    this.spawnSystem = new SpawnSystem(
      this, this.poolManager, this.player, mapEnemies,
      this.activeChallenge?.enemyHpMultiplier ?? 1,
      mapDef.difficultyMultiplier
    );
    this.mapBossId = mapDef.bossId;
    this.soulSystem = new SoulSystem(this, this.player);
    this.bossSystem = new BossSystem(this, this.player, this.poolManager, mapEnemies);
    this.victoryController = new VictoryController(this);
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
    if (!this.isVictoryCinematicActive) this.spawnSystem.update(time, delta); // Boss Death Cinematic: không spawn quái mới
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

    // DEBUG TẠM THỜI — xem comment ở đầu file. Mỗi map chỉ có 1 boss cuối (mapBossId, luôn isFinalBoss).
    if (!this.isVictoryCinematicActive && !this.bossSpawned && this.elapsedPlayMs >= BOSS_SPAWN_DEBUG_MS && !this.bossSystem.getBoss()) {
      this.bossSpawned = true;
      this.bossSystem.spawnBoss(this.mapBossId);
      this.startBossIntro();
    }
  }

  /**
   * Boss vừa spawn (còn đứng yên vì BossSystem.update() chưa chạy lần nào) — pause hẳn GameScene rồi giao
   * toàn bộ cinematic cho BossIntroScene/BossIntroController (camera pan+zoom, overlay, typewriter, Boss
   * idle animation). BossSystem.update() chỉ được gọi từ update() ở trên nên Boss AI tự động "đứng yên"
   * suốt cinematic mà không cần thêm cờ nào trên Boss — xem docblock BossIntroController.
   */
  private startBossIntro(): void {
    const boss = this.bossSystem.getBoss();
    const bossDef = bosses.find((b) => b.id === this.mapBossId);
    if (!boss || !bossDef) {
      // Fallback an toàn nếu thiếu data — vẫn cho boss xuất hiện bình thường thay vì kẹt game.
      EventBus.emit(GameEvents.BOSS_SPAWNED);
      return;
    }

    this.scene.pause();
    this.hud.setPauseButtonEnabled(false);
    this.scene.launch("BossIntroScene", {
      boss,
      bossDef,
      gameScene: this,
      onIntroComplete: () => this.onBossIntroComplete()
    });
  }

  /** BossIntroController đã resume gameplay xong (xem BossIntroScene) — chỉ còn việc GameScene tự quản lý (HUD + event có sẵn). */
  private onBossIntroComplete(): void {
    this.hud.setPauseButtonEnabled(true);
    EventBus.emit(GameEvents.BOSS_SPAWNED);
  }

  /** BossIntroController gọi sau khi cinematic kết thúc — khôi phục camera follow Player với đúng tham số lúc create(). */
  public resumeCameraFollow(): void {
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
  }

  private onPlayerDied(): void {
    if (this.isVictoryCinematicActive) return; // không cho Player "chết" trong lúc Boss Death Cinematic — xem VictoryController
    this.scene.stop("LevelUpScene"); // tránh card level-up đè lên màn hình Game Over nếu đang mở đúng lúc chết
    const survivalTimeMs = this.elapsedPlayMs;
    this.scene.start("GameOverScene", {
      survivalTimeMs,
      kills: this.kills,
      coinEarned: this.computeCoinEarned(false),
      highestCombo: this.highestCombo
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
   * Final Boss (isFinalBoss: true) chết — KHÔNG rơi Loot Chest. Chặn spawn quái mới/Pause/Player chết ngay
   * lập tức (isVictoryCinematicActive), rồi giao toàn bộ trình tự cinematic cho VictoryController (Zoom
   * Camera → Slow Motion + Boss tan biến → Restore TimeScale) — xem systems/VictoryController.ts. GameScene
   * chỉ xử lý phần SAU cinematic: markMapCleared + xác định map kế tiếp + chuyển VictoryScene.
   */
  private onFinalBossDefeated({ boss }: { boss: Boss; x: number; y: number }): void {
    this.scene.stop("LevelUpScene"); // tránh card level-up đè lên cinematic chiến thắng
    // Phòng trường hợp LevelUpScene đang mở đúng lúc boss chết (đã tự pause GameScene trước đó) — resume
    // lại ngay để camera/timeScale cinematic bên dưới thực sự chạy, không bị đứng hình do GameScene còn pause.
    this.scene.resume();

    this.isVictoryCinematicActive = true;
    this.hud.setPauseButtonEnabled(false);

    this.victoryController.playBossDeathCinematic(boss, () => this.onVictoryCinematicComplete());
  }

  /** Cinematic đã xong (boss tan biến hoàn toàn, timeScale đã trả về 1) — ghi map cleared rồi chuyển VictoryScene. */
  private onVictoryCinematicComplete(): void {
    markMapCleared(this.mapId); // ghi trước khi chuyển scene — map tiếp theo mở khóa ngay khi quay lại MapSelectScene
    const nextMap = getNextMap(this.mapId);

    this.scene.start("VictoryScene", {
      characterId: this.player.characterId,
      mapId: this.mapId,
      nextMapId: nextMap?.id,
      survivalTimeMs: this.elapsedPlayMs,
      kills: this.kills,
      coinEarned: this.computeCoinEarned(true),
      highestCombo: this.highestCombo
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
    Challenge7DaysManager.addKillProgress(1);
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

  /** PauseScene "Play Again" đọc lại để restart đúng map đang chơi. */
  public getActiveMapId(): string {
    return this.mapId;
  }
}
