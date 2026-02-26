import { useEffect, useRef } from "react";
import Phaser from "phaser";
import MainScene from "./scenes/MainScene";

export default function Game() {
  const gameRef = useRef(null);

  useEffect(() => {

    if (gameRef.current) return;

    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: "game-container",

      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },

      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 300 },
          debug: false,
        },
      },

      scene: [MainScene],
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current.destroy(true);
      gameRef.current = null;
    };

  }, []);

  return <div id="game-container" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}></div>;
}