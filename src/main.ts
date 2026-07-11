import Phaser from "phaser";
import { GameConfig } from "@config/GameConfig";

const __game = new Phaser.Game(GameConfig);
(window as unknown as { __game: Phaser.Game }).__game = __game;
