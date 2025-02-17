import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  tileSize = 128;
  worldSize = 1000;

  // UI States
  buildMode = true;
  equippedTile = 'grass';
  showHUD = true;

  // Player Stats
  health = 100;
  money = 0;

  nonWalkableTiles = ['tree-tile', 'house-1'];

  // Inventory Items (for selecting tiles)
  inventoryItems = [
    { name: 'AK-47', type: 'ak47', icon: '../../assets/weapons/ak.png' }
  ];

  // Game Map Data
  map: { type: string, growthStage: number }[][] = [];

  // NEW: Array to record house coordinates
  public houseCoordinates: { x: number, y: number }[] = [];

  constructor() {
    this.generateMap();
  }

  // ---------------
  // HUD and Player Methods
  // ---------------
  toggleHUD() {
    this.showHUD = !this.showHUD;
  }

  // ---------------
  // Map Generation Methods
  // ---------------
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
    // Clear any previous house coordinates
    this.houseCoordinates = [];

    // Run a randomized loop to generate roads and houses.
    for (let r = 0; r < Math.floor(Math.random() * 250) + 100; r++) {
      // Randomly decide if this road is horizontal or vertical.
      const horizontal = Math.random() < 0.5;
      let x = horizontal ? 0 : Math.floor(Math.random() * this.worldSize);
      let y = horizontal ? Math.floor(Math.random() * this.worldSize) : 0;
      while (x < this.worldSize && y < this.worldSize) {
        if (this.map[y][x].type === 'grass') {
          // With a 10% chance, set this tile to a house and record it.
          if (Math.random() < 0.1) {
            this.map[y][x].type = 'house-1';
            this.houseCoordinates.push({ x, y });
          } else {
            // Otherwise, set it as a road tile.
            this.map[y][x].type = horizontal ? 'road-lr' : 'road-td';
          }
        }
        // Advance in the chosen direction.
        horizontal ? x++ : y++;
      }
    }
  }

  // ---------------
  // Tile Interaction Methods
  // ---------------
  onTileClick(x: number, y: number) {
    if (!this.buildMode || !this.equippedTile) return;
    const nonBuildable = ['tree-tile', 'house-1', 'ocean'];
    if (nonBuildable.includes(this.map[y][x].type)) {
      console.log(`Cannot build on ${this.map[y][x].type}`);
      return;
    }
    console.log(`Placing ${this.equippedTile} at (${x}, ${y})`);
    this.map[y][x].type = this.equippedTile;
  }

  selectTile(tileType: string) {
    this.equippedTile = tileType;
    console.log(`Equipped tile: ${tileType}`);
  }

  exportWorld() {
    console.log(JSON.stringify(this.map.map(row => row.map(tile => tile.type))));
  }

  // ---------------
  // Style Getter for Tiles
  // ---------------
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
