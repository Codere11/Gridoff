import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  tileSize = 128;
  worldSize = 1000;

  // --- Player State ---
  player = { x: 20, y: 20, health: 100, money: 0 };
  currentWeapon: string | null = null;
  spriteFrame = 0;
  spritePosition = '0px 0px';
  lastDirection = 'right';

  // --- Inventory ---
  inventoryItems = [
    { name: 'AK-47', type: 'ak47', icon: '../../assets/weapons/ak.png' }
  ];

  // --- Map Data ---
  map: { type: string, growthStage: number }[][] = [];
  nonWalkableTiles = ['tree-tile', 'house-1'];
  showHUD = true;

  constructor() {
    this.generateMap();
  }

  // --- Player Actions ---
  equipWeapon(weapon: string) {
    this.currentWeapon = weapon;
  }

  movePlayer(dx: number, dy: number) {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    const targetTile = this.map[Math.floor(newY)]?.[Math.floor(newX)];
    if (!targetTile ||  ['tree-tile', 'house-1'].includes(targetTile.type)) {
      console.log('Movement blockes by terrain:', targetTile?.type)
      return;
    }

    this.player.x = newX;
    this.player.y = newY;

    this.updatePlayerAnimation(dx, dy)
  }
  
  

  updatePlayerAnimation(dx: number, dy: number, isShooting: boolean = false) {
    this.spriteFrame = (this.spriteFrame + 1) % 2; // Toggle frames
  
    if (dx > 0 || (isShooting && this.lastDirection === 'right')) {  
      this.lastDirection = 'right';
      this.spritePosition = `-${this.spriteFrame * 128}px 0px`;
    } else if (dx < 0 || (isShooting && this.lastDirection === 'left')) {  
      this.lastDirection = 'left';
      this.spritePosition = `-${this.spriteFrame * 128}px 0px`;
    } else if (dy < 0 || (isShooting && this.lastDirection === 'up')) {  
      this.lastDirection = 'up';
      this.spritePosition = `-${this.spriteFrame * 128}px -128px`;
    } else if (dy > 0 || (isShooting && this.lastDirection === 'down')) {  
      this.lastDirection = 'down';
      this.spritePosition = `-${this.spriteFrame * 128}px -128px`;
    }
  }
  
  

  // --- Map Generation ---
  generateMap() {
    this.map = Array.from({ length: this.worldSize }, () =>
      Array.from({ length: this.worldSize }, () => ({ type: 'grass', growthStage: 0 }))
    );

    this.generateForests();
    this.generateRivers();
    this.generateRoads();
  }

  generateForests() {
    for (let i = 0; i < 150000; i++) {
      const x = Math.floor(Math.random() * this.worldSize);
      const y = Math.floor(Math.random() * this.worldSize);
      if (this.map[y][x].type === 'grass' && Math.random() < 0.35) {
        this.map[y][x].type = 'tree-tile';
      }
    }
  }

  generateRivers() {
    for (let r = 0; r < 15; r++) {
      let x = Math.floor(Math.random() * this.worldSize);
      let y = 0;
      let width = Math.floor(Math.random() * 3) + 2;

      while (y < this.worldSize) {
        for (let i = 0; i < width; i++) {
          let riverX = x + i;
          if (riverX >= 0 && riverX < this.worldSize) {
            this.map[y][riverX].type = 'ocean';
          }
        }
        x += Math.floor(Math.random() * 5) - 2;
        y++;
      }
    }
  }

  generateRoads() {
    for (let r = 0; r < Math.floor(Math.random() * 250) + 100; r++) {
      let horizontal = Math.random() < 0.5;
      let x = horizontal ? 0 : Math.floor(Math.random() * this.worldSize);
      let y = horizontal ? Math.floor(Math.random() * this.worldSize) : 0;

      while (x < this.worldSize && y < this.worldSize) {
        if (this.map[y][x].type === 'grass') {
          this.map[y][x].type = horizontal ? 'road-lr' : 'road-td';

          if (Math.random() < 0.1) {
            if (horizontal && y + 1 < this.worldSize) this.map[y + 1][x].type = 'house-1';
            if (!horizontal && x + 1 < this.worldSize) this.map[y][x + 1].type = 'house-1';
          }
        }
        if (horizontal) x++;
        else y++;
      }
    }
  }

  // --- HUD & Rendering ---
  toggleHUD() {
    this.showHUD = !this.showHUD;
  }

  getPlayerStyle(cameraX: number, cameraY: number) {
    let sprite = this.currentWeapon === 'ak47'
      ? "url('assets/sprites/ak-spritesheet.png')"
      : "url('assets/sprites/player-movement.png')";

    return {
      position: 'absolute',
      left: `${(this.player.x - cameraX) * this.tileSize}px`,
      top: `${(this.player.y - cameraY) * this.tileSize}px`,
      backgroundImage: sprite,
      backgroundSize: "256px 256px",
      backgroundPosition: this.spritePosition,
      width: "128px",
      height: "128px",
      zIndex: '100'
    };
  }

  getTileStyle(x: number, y: number, cameraX: number, cameraY: number) {
    if (y >= this.worldSize || x >= this.worldSize) return {};
    const tileType = this.map[y][x]?.type || 'ocean';

    return {
      position: 'absolute',
      left: `${(x - cameraX) * this.tileSize}px`,
      top: `${(y - cameraY) * this.tileSize}px`,
      backgroundImage: `url('../../assets/tiles/${tileType}.png')`,
      backgroundSize: 'cover',
      width: `${this.tileSize}px`,
      height: `${this.tileSize}px`,
      zIndex: '10'
    };
  }
}
