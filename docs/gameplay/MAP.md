# Map

*Thiết kế map hiện tại và chướng ngại vật (Wall). Spawn quái xem [ENEMIES.md](./ENEMIES.md).*

## Map hiện tại

Chỉ 1 map: Forest, dạng vô tận (procedural/tile lặp lại), không cần nhiều màn. (TODO tilemap/background thật — hiện dùng placeholder, xem [ASSET_GUIDE.md](../assets/ASSET_GUIDE.md).)

## Wall (chướng ngại vật)

Rải ~14 cụm static physics body quanh khu vực player xuất phát (`GameScene.spawnWalls()`), đủ thưa để không cản trở gameplay chính. Player và mọi Enemy va chạm (chặn đường đi) qua Arcade `collider`, **TRỪ Ghost** (`def.flag === "phasing"`) — đúng đặc điểm "đi xuyên vật cản" trong [ENEMIES.md](./ENEMIES.md). Lọc Ghost qua `processCallback` đọc `sprite.getData("enemyInstance")` vì cùng 1 sprite pool được tái sử dụng cho nhiều loại quái — xem gotcha pooling trong [ARCHITECTURE.md](../architecture/ARCHITECTURE.md).

**Liên kết:** [ENEMIES.md](./ENEMIES.md), [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) (gotcha `processCallback`)
