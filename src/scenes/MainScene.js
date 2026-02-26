import Phaser from "phaser";

let score = 0;
let lives = 3;
let highScore = localStorage.getItem("highScore") || 0;

export default class MainScene extends Phaser.Scene {

  constructor() {
    super("MainScene");
  }

  preload() {
    // responsive width/height for loading screen
    const W = this.scale.width;
    const H = this.scale.height;

    // Premium Loading UI
    // "SHOCKY" in Orange with Black Border
    this.shockyText = this.add.text(W / 2 - 100, H / 2 - 80, "SHOCKY", {
      fontSize: "64px",
      fill: "#ff8c00",
      stroke: "#000",
      strokeThickness: 8,
      fontWeight: "900",
      fontFamily: "Arial Black"
    }).setOrigin(0.5);

    // "UNIVERSE" in Blue with White Border
    this.universeText = this.add.text(W / 2 + 100, H / 2 - 80, "UNIVERSE", {
      fontSize: "52px",
      fill: "#00bfff",
      stroke: "#fff",
      strokeThickness: 4,
      fontWeight: "900",
      fontFamily: "Arial Black"
    }).setOrigin(0.5);

    // Awesome Progress Bar (Glow Effect)
    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();
    const progressGlow = this.add.graphics();

    // Sleek White/Grey Box
    progressBox.fillStyle(0xffffff, 0.2);
    progressBox.fillRoundedRect(W / 2 - 160, H / 2 - 10, 320, 40, 10);
    progressBox.lineStyle(2, 0xffffff, 1);
    progressBox.strokeRoundedRect(W / 2 - 160, H / 2 - 10, 320, 40, 10);

    this.loadingFinished = false;

    this.load.on("progress", (value) => {
      progressBar.clear();
      progressGlow.clear();

      // Neon Green Glow
      progressGlow.fillStyle(0x00ff00, 0.3);
      progressGlow.fillRoundedRect(W / 2 - 155, H / 2 - 5, 310 * value, 30, 8);

      // Solid Neon Green Bar
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRoundedRect(W / 2 - 150, H / 2, 300 * value, 20, 5);
    });

    this.load.on("complete", () => {
      this.loadingFinished = true;
      if (this.forcedLoadComplete) {
        this.cleanupLoadingUI();
      }
    });

    // Forced 2-second look
    this.forcedLoadComplete = false;
    this.time.delayedCall(2000, () => {
      this.forcedLoadComplete = true;
      if (this.loadingFinished) {
        this.cleanupLoadingUI();
      }
    });

    this.cleanupLoadingUI = () => {
      progressBox.destroy();
      progressBar.destroy();
      progressGlow.destroy();
      this.shockyText.destroy();
      this.universeText.destroy();
    };

    // images
    this.load.image("bg", "assets/bg.jpg");
    this.load.image("basket", "assets/basket.png");
    this.load.image("apple", "assets/apple.png");
    this.load.image("banana", "assets/banana.png");
    this.load.image("mango", "assets/mango.png");
    this.load.image("bomb", "assets/bomb.png");

    // audio
    this.load.audio("bgm", ["assets/bgm.mp3"]);
  }

  // Synthesized "Buffer Sound" (Pop/Hit)
  playBufferSound(frequency = 400, type = 'sine', duration = 0.1) {
    if (!this.sound.context) return;

    const ctx = this.sound.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  create() {

    score = 0;
    lives = 3;
    this.fallSpeed = 220;
    this.caughtFruits = []; // Store fruits that stay in the basket

    // responsive width/height
    const W = this.scale.width;
    const H = this.scale.height;

    // 🌄 background (cover screen)
    this.bg = this.add.image(W / 2, H / 2, "bg");
    this.updateBackground();
    this.bg.setDepth(-1);

    // 🎵 music (robust autoplay & resume)
    const playBGM = () => {
      // Resume context if suspended
      if (this.sound.context.state === 'suspended') {
        this.sound.context.resume();
      }

      // Check if audio is in cache
      if (this.cache.audio.exists("bgm")) {
        if (!this.bgm) {
          this.bgm = this.sound.add("bgm", { volume: 0.4, loop: true });
        }

        if (!this.bgm.isPlaying) {
          this.bgm.play();
          console.log("BGM started playing.");
          // We can stop listening once it's playing
          this.input.off("pointerdown", playBGM);
        }
      }
    };

    // Listen for any interaction to start audio
    this.input.on("pointerdown", playBGM);

    // Also try to play when the sound manager is unlocked by Phaser
    this.sound.once("unlocked", playBGM);

    // Basket & Physics (Higher on mobile for finger space)
    const basketY = W < 600 ? H - 140 : H - 80;
    this.basket = this.physics.add.sprite(W / 2, basketY, "basket");
    this.basket.setImmovable(true);
    this.basket.body.allowGravity = false;
    this.basket.setCollideWorldBounds(true);
    this.basket.setDisplaySize(160, 100);

    // basket better hitbox
    this.basket.body.setSize(110, 35);
    this.basket.body.setOffset(25, 60);

    // ⭐ invisible catch zone (DYNAMIC BODY FIX)
    this.catchZone = this.add.rectangle(W / 2, basketY - 40, 220, 50, 0x000000, 0);
    this.physics.add.existing(this.catchZone);
    this.catchZone.body.allowGravity = false;
    this.catchZone.body.setImmovable(true);

    // keyboard
    this.cursors = this.input.keyboard.createCursorKeys();

    // mouse/touch drag control (mobile play!)
    this.input.on("pointermove", (pointer) => {
      this.basket.x = pointer.x;
      this.catchZone.x = pointer.x;
    });

    // groups
    this.fruits = this.physics.add.group();
    this.bombs = this.physics.add.group();

    // UI
    this.scoreText = this.add.text(20, 20, "Score: 0", { fontSize: "26px", fill: "#fff" });
    this.livesText = this.add.text(20, 55, "Lives: 3", { fontSize: "26px", fill: "#fff" });
    this.highText = this.add.text(20, 90, "High Score: " + highScore, { fontSize: "26px", fill: "#ffff00" });

    // spawn timer
    this.spawnTimer = this.time.addEvent({
      delay: 900,
      callback: this.spawnObjects,
      callbackScope: this,
      loop: true,
    });

    // collisions
    this.physics.add.overlap(this.catchZone, this.fruits, this.catchFruit, null, this);
    this.physics.add.overlap(this.catchZone, this.bombs, this.hitBomb, null, this);

    // Resize listener
    this.scale.on('resize', this.resize, this);
  }

  resize(gameSize) {
    const { width: W, height: H } = gameSize;
    const isMobile = W < 600;

    this.updateBackground();

    // Reposition Basket (Higher on mobile)
    const basketY = W < 600 ? H - 120 : H - 80;
    this.basket.setPosition(W / 2, basketY);
    this.catchZone.setPosition(W / 2, basketY - 40);

    // Keep caught fruits in basket
    this.caughtFruits.forEach(item => {
      item.sprite.x = this.basket.x + item.offsetX;
      item.sprite.y = this.basket.y + item.offsetY;
    });

    // Update Game Over UI if it exists
    if (this.overlay) {
      this.overlay.setSize(W, H).setPosition(W / 2, H / 2);
    }
    if (this.goText) {
      this.goText.setPosition(W / 2, H / 2 - (isMobile ? 120 : 160));
      this.goText.setFontSize(isMobile ? "55px" : "80px");
      this.goText.setStroke("#000", isMobile ? 6 : 8);
    }
    if (this.scoreBox) {
      this.scoreBox.setPosition(W / 2, H / 2 + 10);
      const scoreBg = this.scoreBox.getAt(0);
      const boardWidth = isMobile ? Math.min(W * 0.9, 320) : 340;
      scoreBg.setSize(boardWidth, 140);

      const scoreVal = this.scoreBox.getAt(1);
      const highVal = this.scoreBox.getAt(2);
      scoreVal.setFontSize(isMobile ? "30px" : "38px");
      highVal.setFontSize(isMobile ? "30px" : "38px");
    }
    if (this.btnContainer) {
      this.btnContainer.setPosition(W / 2, H / 2 + (isMobile ? 140 : 160));
      const btnBg = this.btnContainer.getAt(0);
      const btnText = this.btnContainer.getAt(1);
      const btnWidth = isMobile ? Math.min(W * 0.75, 260) : 280;
      btnBg.setSize(btnWidth, 75);
      btnText.setFontSize(isMobile ? "24px" : "32px");
    }
  }

  updateBackground() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.bg.setPosition(W / 2, H / 2);
    const scaleX = W / this.bg.width;
    const scaleY = H / this.bg.height;
    const scale = Math.max(scaleX, scaleY);
    this.bg.setScale(scale).setScrollFactor(0);
  }

  update() {

    // keyboard movement
    if (this.cursors.left.isDown) {
      this.basket.setVelocityX(-500);
      this.catchZone.x = this.basket.x;
    }
    else if (this.cursors.right.isDown) {
      this.basket.setVelocityX(500);
      this.catchZone.x = this.basket.x;
    }
    else {
      this.basket.setVelocityX(0);
    }
    this.catchZone.x = this.basket.x;

    // Update fruits staying in the basket
    this.caughtFruits.forEach(item => {
      item.sprite.x = this.basket.x + item.offsetX;
      item.sprite.y = this.basket.y + item.offsetY;
    });

    const H = this.scale.height;

    // fruit missed
    this.fruits.getChildren().forEach((fruit) => {
      if (fruit.y > H) {
        fruit.destroy();
        this.loseLife();
      }
    });

    // bomb missed
    this.bombs.getChildren().forEach((bomb) => {
      if (bomb.y > H) {
        bomb.destroy();
      }
    });
  }

  spawnObjects() {
    const W = this.scale.width;
    let x = Phaser.Math.Between(80, W - 80);
    const fruitTypes = ["apple", "banana", "mango"];

    // Dynamic difficulty: Increase bomb probability (starting 15%, up to 45%)
    let bombProb = 0.15 + Math.min(score / 150, 0.3);

    // PC vs Mobile balance: scale fall speed slightly with width
    // Wider screens (PC) get a speed boost to make travel time fair
    const widthMultiplier = Math.max(1, W / 1000);
    const currentFallSpeed = this.fallSpeed * widthMultiplier;

    if (Math.random() > bombProb) {
      let type = Phaser.Utils.Array.GetRandom(fruitTypes);
      let fruit = this.fruits.create(x, -50, type);
      fruit.setDisplaySize(65, 65);
      fruit.body.setSize(60, 60);
      fruit.setVelocityY(currentFallSpeed);
    } else {
      let bomb = this.bombs.create(x, -50, "bomb");
      bomb.setDisplaySize(55, 55);
      bomb.body.setSize(50, 50);
      bomb.setVelocityY(currentFallSpeed + 80);
    }
  }

  catchFruit(zone, fruit) {
    // Advanced Realism: up to 8 fruits stay in basket with layering
    if (this.caughtFruits.length < 8) {
      fruit.body.enable = false;
      fruit.setVelocity(0);

      const count = this.caughtFruits.length;
      const layer = Math.floor(count / 4); // 4 fruits per layer
      const posInLayer = count % 4;

      // Distribute across the basket width with layering
      const offsetX = -45 + (posInLayer * 30) + Phaser.Math.FloatBetween(-5, 5);
      const offsetY = -15 - (layer * 12); // Slightly stack upwards

      this.caughtFruits.push({
        sprite: fruit,
        offsetX,
        offsetY,
        rotation: Phaser.Math.FloatBetween(-0.2, 0.2)
      });

      fruit.setRotation(this.caughtFruits[count].rotation);
      fruit.setDepth(layer); // Higher layers look like they are on top
    } else {
      fruit.destroy();
    }

    this.playBufferSound(600, 'sine', 0.1); // "Pop" sound for catching
    score++;
    this.scoreText.setText("Score: " + score);

    // difficulty scaling
    if (score % 5 === 0) {
      this.fallSpeed += 30;

      // Speed up spawning (limit to 350ms)
      if (this.spawnTimer.delay > 350) {
        this.spawnTimer.delay -= 40;
      }
    }
  }

  hitBomb(zone, bomb) {
    bomb.destroy();

    this.cameras.main.shake(300, 0.04); // Stronger shake

    // Buffer sound for bomb (Lower, rougher sound)
    this.playBufferSound(150, 'square', 0.2);

    // Vibration (mobile)
    if (navigator.vibrate) navigator.vibrate(200);

    this.basket.setTint(0xff0000);

    this.time.delayedCall(250, () => {
      this.basket.clearTint();
    });

    this.loseLife();
  }

  loseLife() {
    lives--;
    this.livesText.setText("Lives: " + lives);

    if (lives <= 0) {
      this.gameOver();
    }
  }

  gameOver() {
    this.physics.pause();
    this.time.removeAllEvents();
    if (this.bgm) this.bgm.stop();

    // Sound effect for Game Over
    this.playBufferSound(100, 'sawtooth', 0.4);

    // Vibration (mobile/supported browsers)
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("highScore", highScore);
    }

    const W = this.scale.width;
    const H = this.scale.height;
    const isMobile = W < 600;

    // Overlay (Darker & Animated)
    this.overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0);
    this.overlay.setDepth(10);
    this.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.85,
      duration: 500
    });

    // Game Over Text (Entrance Animation) - Responsive
    const goFontSize = isMobile ? "55px" : "80px";
    this.goText = this.add.text(W / 2, H / 2 - (isMobile ? 120 : 160), "GAME OVER", {
      fontSize: goFontSize,
      fill: "#ff0000",
      stroke: "#000",
      strokeThickness: isMobile ? 6 : 8,
      fontWeight: "900",
      fontFamily: "Arial Black"
    }).setOrigin(0.5).setDepth(11).setScale(0);

    this.tweens.add({
      targets: this.goText,
      scale: 1,
      duration: 800,
      ease: 'Back.easeOut'
    });

    // Score Board - Responsive width
    const boardWidth = isMobile ? Math.min(W * 0.9, 320) : 340;
    this.scoreBox = this.add.container(W / 2, H / 2).setDepth(11).setAlpha(0);

    const scoreBg = this.add.rectangle(0, 0, boardWidth, 140, 0x333333, 0.9).setStrokeStyle(4, 0x00ff00);
    const scoreVal = this.add.text(0, -35, `SCORE: ${score}`, { fontSize: isMobile ? "30px" : "38px", fill: "#fff", fontWeight: "bold" }).setOrigin(0.5);
    const highVal = this.add.text(0, 35, `BEST: ${highScore}`, { fontSize: isMobile ? "30px" : "38px", fill: "#ffff00", fontWeight: "bold" }).setOrigin(0.5);

    this.scoreBox.add([scoreBg, scoreVal, highVal]);

    this.tweens.add({
      targets: this.scoreBox,
      alpha: 1,
      y: H / 2 + 10,
      duration: 600,
      delay: 400
    });

    // Play Again Button - Responsive
    const btnWidth = isMobile ? Math.min(W * 0.75, 260) : 280;
    this.btnContainer = this.add.container(W / 2, H / 2 + (isMobile ? 140 : 160)).setDepth(11).setScale(0);

    const btnBg = this.add.rectangle(0, 0, btnWidth, 75, 0x00ff00, 1).setInteractive({ useHandCursor: true });
    const btnText = this.add.text(0, 0, "PLAY AGAIN", { fontSize: isMobile ? "24px" : "32px", fill: "#000", fontWeight: "bold" }).setOrigin(0.5);

    this.btnContainer.add([btnBg, btnText]);

    this.tweens.add({
      targets: this.btnContainer,
      scale: 1,
      duration: 500,
      delay: 800,
      ease: 'Back.easeOut'
    });

    // Interactions
    btnBg.on("pointerover", () => {
      this.tweens.add({ targets: this.btnContainer, scale: 1.1, duration: 100 });
      btnBg.setFillStyle(0xffffff);
    });

    btnBg.on("pointerout", () => {
      this.tweens.add({ targets: this.btnContainer, scale: 1, duration: 100 });
      btnBg.setFillStyle(0x00ff00);
    });

    btnBg.on("pointerdown", () => {
      score = 0;
      lives = 3;
      this.scene.restart();
    });
  }
}