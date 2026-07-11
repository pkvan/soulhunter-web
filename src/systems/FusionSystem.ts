import Phaser from "phaser";
import { Player } from "@entities/Player";
import fusionsData from "@data/fusions.json";
import weaponsData from "@data/weapons.json";
import { FusionDef, WeaponDef } from "@types/index";

const fusions = fusionsData as FusionDef[];
const weapons = weaponsData as WeaponDef[];

/**
 * Cơ chế đặc trưng của game (xem docs/GDD.md mục 6). Điều kiện:
 * 1. Một vũ khí đang equip đạt maxLevel
 * 2. Player đang sở hữu vũ khí/status thứ hai trong công thức
 * 3. Vũ khí đó chưa từng fusion (equipped.fusedInto === undefined)
 */
export class FusionSystem {
  checkAvailableFusion(player: Player): FusionDef | null {
    const maxedWeapons = player.equippedWeapons.filter((w) => {
      const def = weapons.find((wd) => wd.id === w.weaponId);
      return def && w.level >= def.maxLevel && !w.fusedInto;
    });

    const candidates: FusionDef[] = [];
    for (const maxed of maxedWeapons) {
      for (const fusion of fusions) {
        if (!fusion.requires.includes(maxed.weaponId)) continue;
        const otherId = fusion.requires.find((id) => id !== maxed.weaponId);
        if (!otherId) continue;

        const hasOther = player.equippedWeapons.some((w) => w.weaponId === otherId);
        // TODO: otherId có thể là stat upgrade (ví dụ "poison", "burn") thay vì weapon —
        // cần check thêm player.stats[otherId + "Chance"] > 0 cho các công thức weapon+status
        if (hasOther) candidates.push(fusion);
      }
    }

    if (candidates.length === 0) return null;
    return Phaser.Utils.Array.GetRandom(candidates);
  }

  applyFusion(player: Player, fusion: FusionDef): void {
    // Xóa 2 vũ khí gốc, thêm vũ khí fusion mới vào cùng vị trí
    player.equippedWeapons = player.equippedWeapons.filter(
      (w) => !fusion.requires.includes(w.weaponId)
    );
    player.equippedWeapons.push({ weaponId: fusion.id, level: 1, fusedInto: fusion.id });
    // TODO: WeaponSystem cần đọc được stat/behaviour của vũ khí fusion —
    // thêm bảng "fusionWeaponBehaviours" ánh xạ fusion.id -> logic bắn riêng (không dùng chung switch case weapons.json)
  }
}
