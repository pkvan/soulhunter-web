import Phaser from "phaser";
import { Player } from "@entities/Player";
import { PoolManager } from "@systems/PoolManager";
import { SpawnSystem } from "@systems/SpawnSystem";
import { WeaponSystem } from "@systems/WeaponSystem";
import { SoulSystem } from "@systems/SoulSystem";
import { CombatSystem } from "@systems/CombatSystem";
import { UpgradeSystem } from "@systems/UpgradeSystem";
import { FusionSystem } from "@systems/FusionSystem";
import { HUD } from "@ui/HUD";
import { EventBus, GameEvents } from "@utils/EventBus";
import { GAMEPLAY } from "@config/GameConfig";
import fusionsData from "@data/fusions.json";
import weaponsData from "@data/weapons.json";
import upgradesData from "@data/upgrades.json";
import { FusionDef, WeaponDef, UpgradeDef } from "@types/index";

// DEBUG TẠM: nhấn phím F để cưỡng bức điều kiện fusion tiếp theo trong fusions.json và hiện ngay
// LevelUpScene — dùng để test hết 15 công thức mà không cần chơi tới maxLevel từng cái.
// XÓA khối này (và __debugTriggerNextFusion) sau khi test xong toàn bộ.
const DEBUG_FUSION_TEST = true;
const fusions = fusionsData as FusionDef[];
const weapons = weaponsData as WeaponDef[];
const upgrades = upgradesData as UpgradeDef[];

interface GameSceneData {
  characterId: string;
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
  private hud!: HUD;
  private runStartTime = 0;
  private kills = 0;
  private debugFusionIndex = -1;

  constructor() {
    super("GameScene");
  }

  create(data: GameSceneData): void {
    this.runStartTime = this.time.now;
    this.kills = 0;

    // TODO: khởi tạo tilemap/background Forest lặp lại theo camera (map vô tận)

    this.player = new Player(this, 480, 270, data.characterId ?? "hunter");
    this.poolManager = new PoolManager(this);
    this.spawnSystem = new SpawnSystem(this, this.poolManager, this.player);
    this.soulSystem = new SoulSystem(this, this.player);
    this.weaponSystem = new WeaponSystem(
      this, this.player, this.poolManager, this.soulSystem, () => this.registerKill()
    );
    this.combatSystem = new CombatSystem(this, this.player, this.poolManager);
    this.fusionSystem = new FusionSystem();
    this.upgradeSystem = new UpgradeSystem(this.player, this.fusionSystem);
    this.hud = new HUD(this, this.player);

    this.cameras.main.startFollow(this.player.sprite, true);

    EventBus.off(GameEvents.PLAYER_DIED, this.onPlayerDied, this); // tránh đăng ký trùng khi chơi lại nhiều lần
    EventBus.on(GameEvents.PLAYER_DIED, this.onPlayerDied, this);

    this.scene.launch("LevelUpScene"); // chạy song song, LevelUpScene tự lắng nghe EventBus.LEVEL_UP

    if (DEBUG_FUSION_TEST) {
      this.input.keyboard!.on("keydown-F", () => this.debugTriggerNextFusion());
    }

    // TODO: bắn EventBus.emit(GameEvents.BOSS_SPAWNED) khi this.time.now - this.runStartTime >= GAMEPLAY.BOSS_SPAWN_AT_MS
  }

  update(time: number, delta: number): void {
    this.player.update(delta);
    this.spawnSystem.update(time, delta);
    this.weaponSystem.update(time, delta);
    this.soulSystem.update(delta);
    this.combatSystem.update(time, delta);
    this.hud.update(time - this.runStartTime);

    // TODO: check win condition / boss defeated -> chuyển GameOverScene với kết quả thắng
  }

  private onPlayerDied(): void {
    const survivalTimeMs = this.time.now - this.runStartTime;
    this.scene.start("GameOverScene", {
      survivalTimeMs,
      kills: this.kills,
      coinEarned: Math.floor(this.kills / 10), // TODO: công thức Coin thật, thay placeholder
      highestCombo: 0 // TODO: lấy từ hệ thống combo khi có
    });
  }

  public registerKill(): void {
    this.kills += 1;
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
