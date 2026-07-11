import Phaser from "phaser";
import { Player } from "@entities/Player";
import { PoolManager } from "@systems/PoolManager";
import { SpawnSystem } from "@systems/SpawnSystem";
import { WeaponSystem } from "@systems/WeaponSystem";
import { SoulSystem } from "@systems/SoulSystem";
import { CombatSystem } from "@systems/CombatSystem";
import { UpgradeSystem } from "@systems/UpgradeSystem";
import { FusionSystem } from "@systems/FusionSystem";
import { BossSystem } from "@systems/BossSystem";
import { HUD } from "@ui/HUD";
import { EventBus, GameEvents } from "@utils/EventBus";
import fusionsData from "@data/fusions.json";
import weaponsData from "@data/weapons.json";
import upgradesData from "@data/upgrades.json";
import bossesData from "@data/bosses.json";
import dailyChallengesData from "@data/dailyChallenges.json";
import { FusionDef, WeaponDef, UpgradeDef, BossDef, DailyChallengeDef } from "@types/index";
import { calculateCoinEarned } from "@utils/CoinFormula";
import { hasClaimedDailyChallengeToday, markDailyChallengeClaimedToday } from "@utils/SaveData";

// DEBUG TẠM: nhấn phím F để cưỡng bức điều kiện fusion tiếp theo trong fusions.json và hiện ngay
// LevelUpScene — dùng để test hết 15 công thức mà không cần chơi tới maxLevel từng cái.
// XÓA khối này (và __debugTriggerNextFusion) sau khi test xong toàn bộ.
const DEBUG_FUSION_TEST = true;
const fusions = fusionsData as FusionDef[];
const weapons = weaponsData as WeaponDef[];
const upgrades = upgradesData as UpgradeDef[];
const bosses = bossesData as BossDef[];
const dailyChallenges = dailyChallengesData as DailyChallengeDef[];

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
  private combatSystem!: CombatSystem;
  private fusionSystem!: FusionSystem;
  private upgradeSystem!: UpgradeSystem;
  private bossSystem!: BossSystem;
  private hud!: HUD;
  private elapsedPlayMs = 0; // thời gian chơi thực tế cộng dồn từ delta đã chặn trần — xem MAX_FRAME_DELTA_MS
  private kills = 0;
  private bossesSpawnedCount = 0; // 0, 1, 2 — số boss đã spawn trong ván, xem BOSS_SPAWN_DEBUG_MS
  private debugFusionIndex = -1;
  private comboCount = 0;
  private highestCombo = 0;
  private lastKillAtMs = -Infinity;
  private readonly COMBO_RESET_MS = 2000; // không giết thêm trong khoảng này thì lần giết tiếp theo reset combo về 1
  private activeChallenge?: DailyChallengeDef;

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

    // TODO: khởi tạo tilemap/background Forest lặp lại theo camera (map vô tận)

    this.activeChallenge = data.dailyChallengeId
      ? dailyChallenges.find((c) => c.id === data.dailyChallengeId)
      : undefined;

    this.player = new Player(this, 480, 270, data.characterId ?? "hunter", this.activeChallenge?.playerDamageMultiplier ?? 1);
    this.poolManager = new PoolManager(this);
    this.spawnSystem = new SpawnSystem(this, this.poolManager, this.player, this.activeChallenge?.enemyHpMultiplier ?? 1);
    this.soulSystem = new SoulSystem(this, this.player);
    this.bossSystem = new BossSystem(this, this.player, this.poolManager);
    this.weaponSystem = new WeaponSystem(
      this, this.player, this.poolManager, this.soulSystem, this.bossSystem, () => this.registerKill()
    );
    this.combatSystem = new CombatSystem(this, this.player, this.poolManager);
    this.fusionSystem = new FusionSystem();
    this.upgradeSystem = new UpgradeSystem(this.player, this.fusionSystem);

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

    this.scene.launch("LevelUpScene"); // chạy song song, LevelUpScene tự lắng nghe EventBus.LEVEL_UP

    if (DEBUG_FUSION_TEST) {
      this.input.keyboard!.on("keydown-F", () => this.debugTriggerNextFusion());
    }
  }

  update(time: number, delta: number): void {
    this.elapsedPlayMs += Math.min(delta, MAX_FRAME_DELTA_MS);

    this.player.update(delta);
    this.spawnSystem.update(time, delta);
    this.weaponSystem.update(time, delta);
    this.soulSystem.update(delta);
    this.combatSystem.update(time, delta);
    this.bossSystem.update(time, delta);
    this.hud.update(this.elapsedPlayMs);

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

  private onBossDefeated(): void {
    // Nhiều boss/ván (xem bosses.json) — chỉ kết thúc ván (victory) khi đã hạ xong boss CUỐI CÙNG trong
    // danh sách. Hạ boss giữa chừng (vd boss 1/2) chỉ ẩn HP bar rồi chơi tiếp, boss tiếp theo tự spawn
    // theo mốc thời gian riêng (xem update()).
    if (this.bossesSpawnedCount < bosses.length) return;

    this.scene.stop("LevelUpScene"); // tránh card level-up đè lên màn hình chiến thắng nếu đang mở đúng lúc boss chết
    const survivalTimeMs = this.elapsedPlayMs;
    this.scene.start("GameOverScene", {
      survivalTimeMs,
      kills: this.kills,
      coinEarned: this.computeCoinEarned(true),
      highestCombo: this.highestCombo,
      victory: true
    });
  }

  /**
   * Coin cuối ván — nếu đang chơi Daily Challenge VÀ chưa nhận thưởng nhân hệ số hôm nay thì áp dụng
   * coinRewardMultiplier rồi đánh dấu đã nhận (GDD mục 15: chơi lại thoải mái trong ngày nhưng chỉ tính
   * thưởng nhân hệ số 1 lần/ngày, tránh farm Coin bằng cách chơi Daily Challenge liên tục).
   */
  private computeCoinEarned(victory: boolean): number {
    if (this.activeChallenge && !hasClaimedDailyChallengeToday()) {
      const coinEarned = calculateCoinEarned(this.kills, this.elapsedPlayMs, victory, this.activeChallenge.coinRewardMultiplier);
      markDailyChallengeClaimedToday();
      return coinEarned;
    }
    return calculateCoinEarned(this.kills, this.elapsedPlayMs, victory);
  }

  public registerKill(): void {
    this.kills += 1;

    // Combo: chuỗi kill liên tiếp trong COMBO_RESET_MS — quá khoảng này thì lần giết tiếp theo bắt đầu lại từ 1.
    if (this.elapsedPlayMs - this.lastKillAtMs <= this.COMBO_RESET_MS) {
      this.comboCount += 1;
    } else {
      this.comboCount = 1;
    }
    this.lastKillAtMs = this.elapsedPlayMs;
    this.highestCombo = Math.max(this.highestCombo, this.comboCount);
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

  /** DEBUG TẠM: xem comment ở đầu file. */
  private debugTriggerNextFusion(): void {
    this.debugFusionIndex = (this.debugFusionIndex + 1) % fusions.length;
    const fusion = fusions[this.debugFusionIndex];
    const [idA, idB] = fusion.requires;

    this.player.equippedWeapons = [];
    for (const id of [idA, idB]) {
      const weaponDef = weapons.find((w) => w.id === id);
      if (weaponDef) {
        this.player.equippedWeapons.push({ weaponId: id, level: weaponDef.maxLevel });
      } else {
        const upgradeDef = upgrades.find((u) => u.id === id);
        if (upgradeDef) this.player.stats[upgradeDef.stat] = Math.max(this.player.stats[upgradeDef.stat] ?? 0, 0.5);
      }
    }

    console.log(`[DEBUG] Testing fusion ${this.debugFusionIndex + 1}/${fusions.length}: ${fusion.name} (${fusion.id})`);
    EventBus.emit(GameEvents.LEVEL_UP, this.player.getProgress().level);
  }
}
