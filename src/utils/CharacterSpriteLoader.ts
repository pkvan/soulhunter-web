import Phaser from "phaser";

export type Direction = "up" | "down" | "left" | "right";

interface SpriteSetConfig {
  dir: string; // thư mục con trong assets/sprites/player/, tương đối
  prefix: string; // tiền tố tên file trước "_<hướng>.png" (vd "run", "attack1", "attack")
}

interface CharacterSpriteConfig {
  run?: SpriteSetConfig; // undefined = nhân vật CHƯA có sprite Run — Player.ts tự fallback placeholder khi di chuyển
  attack?: SpriteSetConfig; // undefined = CHƯA có sprite Attack — Player.ts tự fallback, vũ khí vẫn bắn bình thường
  projectileWeaponId?: string; // weapon.id cần texture riêng (khớp PROJECTILE_TEXTURES trong Projectile.ts)
  projectileFile?: string; // tên file trong assets/sprites/weapons/
  projectileTextureKey?: string;
}

/**
 * Map characterId (đúng theo characters.json) -> đường dẫn asset thật. KHÔNG suy diễn tên thư mục từ
 * characterId bằng string template vì tên thư mục thật KHÔNG khớp characterId trong nhiều trường hợp:
 * - "hunter" (Soul Hunter, vũ khí Bow) dùng art nằm trong thư mục "archer" — KHÔNG phải nhân vật roster
 *   riêng "archer" (id="archer", vũ khí Ice Shard, chưa có asset).
 * - "assassin" (2 chữ "s") có thư mục đặt tên thiếu 1 chữ "s" thành "assasin".
 * - "archer" (thư mục thật) dùng prefix "attack1" cho Attack, các nhân vật khác dùng "attack" (không có "1").
 * - "mage" chưa có thư mục con run/attack riêng — file nằm thẳng trong player/mage/.
 */
const CHARACTER_SPRITES: Record<string, CharacterSpriteConfig> = {
  hunter: {
    run: { dir: "archer/run", prefix: "run" },
    attack: { dir: "archer/attack", prefix: "attack1" },
    projectileWeaponId: "bow",
    projectileFile: "arrow_projectile.png",
    projectileTextureKey: "arrow_projectile"
  },
  knight: {
    run: { dir: "knight/run", prefix: "run" },
    attack: { dir: "knight/attack", prefix: "attack" }
  },
  assassin: {
    // player/assasin/run/ tồn tại nhưng đang RỖNG (0 file) — coi như chưa có Run, không khai báo `run` ở đây.
    attack: { dir: "assasin/attack", prefix: "attack" },
    projectileWeaponId: "triple_throw",
    projectileFile: "assasin_projectile.png",
    projectileTextureKey: "assasin_projectile"
  },
  mage: {
    // Chưa có Run, và Attack nằm thẳng trong player/mage/ (không có subfolder "attack/").
    attack: { dir: "mage", prefix: "attack" }
  }
  // "archer" (characterId riêng trong characters.json, khác "hunter", vũ khí Ice Shard): chưa có asset —
  // không khai báo, Player.ts tự fallback placeholder toàn bộ (run lẫn attack).
};

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];
const PLAYER_BASE = "assets/sprites/player";
const WEAPON_BASE = "assets/sprites/weapons";

/**
 * Queue load sprite Run/Attack + texture projectile riêng (nếu có) cho đúng characterId — dùng key namespace
 * theo characterId (`run_<characterId>_<dir>`, `attack_<characterId>_<dir>`) để nhiều nhân vật có thể cùng tồn
 * tại trong TextureManager mà không đè lên nhau khi người chơi đổi nhân vật giữa phiên (không cần reload trang).
 * Tự bỏ qua nếu texture đã load rồi (chơi lại cùng 1 nhân vật). Thiếu file (run/attack chưa có, hoặc lỗi mạng)
 * KHÔNG crash — chỉ log warning rõ ràng, Player.ts/Projectile.ts tự fallback placeholder ở nơi dùng.
 */
export function loadCharacterSprites(scene: Phaser.Scene, characterId: string): void {
  const config = CHARACTER_SPRITES[characterId];
  if (!config) {
    console.warn(`[CharacterSpriteLoader] Chưa có cấu hình sprite cho characterId="${characterId}" — dùng placeholder toàn bộ.`);
    return;
  }

  if (config.run) {
    for (const dir of DIRECTIONS) {
      const key = `run_${characterId}_${dir}`;
      if (scene.textures.exists(key)) continue;
      const path = `${PLAYER_BASE}/${config.run.dir}/${config.run.prefix}_${dir}.png`;
      console.log(`[CharacterSpriteLoader] load Run key="${key}" path="${path}"`);
      scene.load.spritesheet(key, path, { frameWidth: 96, frameHeight: 110 });
    }
  } else {
    console.warn(`[CharacterSpriteLoader] characterId="${characterId}" chưa có sprite Run — fallback placeholder khi di chuyển.`);
  }

  if (config.attack) {
    for (const dir of DIRECTIONS) {
      const key = `attack_${characterId}_${dir}`;
      if (scene.textures.exists(key)) continue;
      const path = `${PLAYER_BASE}/${config.attack.dir}/${config.attack.prefix}_${dir}.png`;
      console.log(`[CharacterSpriteLoader] load Attack key="${key}" path="${path}"`);
      scene.load.spritesheet(key, path, { frameWidth: 96, frameHeight: 110 });
    }
  } else {
    console.warn(`[CharacterSpriteLoader] characterId="${characterId}" chưa có sprite Attack — fallback placeholder khi tấn công (vũ khí vẫn bắn bình thường).`);
  }

  if (config.projectileFile && config.projectileTextureKey && !scene.textures.exists(config.projectileTextureKey)) {
    const path = `${WEAPON_BASE}/${config.projectileFile}`;
    console.log(`[CharacterSpriteLoader] load Projectile key="${config.projectileTextureKey}" path="${path}"`);
    scene.load.image(config.projectileTextureKey, path);
  }

  // Log rõ file nào lỗi thật sự (đường dẫn đúng cấu hình nhưng server 404/lỗi mạng) — không throw, texture đó
  // đơn giản sẽ không tồn tại sau khi load xong và nơi dùng (Player.ts/Projectile.ts) tự fallback.
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
    console.warn(`[CharacterSpriteLoader] Lỗi load file "${file.key}" (${file.url}) — sẽ dùng placeholder.`);
  });
}
