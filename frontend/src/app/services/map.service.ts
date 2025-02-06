import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  tileSize = 128;
  worldSize = 1000;

  // --- UI States ---
  buildMode = true;
  equippedTile = 'grass';
  showHUD = true;

  // --- Player Stats ---
  health = 100;
  money = 0;

  nonWalkableTiles = ['tree-tile', 'house-1'];


  // --- Inventory Items ---
  inventoryItems = [
    { name: 'AK-47', type: 'ak47', icon: '../../assets/weapons/ak.png' }
  ];

  // --- Game Map ---
  map: { type: string, growthStage: number }[][] = [];

  constructor() {
    this.generateMap();
  }

  toggleHUD() {
    this.showHUD = !this.showHUD;
  }

  // --- Generate or Import Map ---
  generateMap() {
    this.map = Array.from({ length: this.worldSize }, () =>
      Array.from({ length: this.worldSize }, () => ({ type: 'grass', growthStage: 0 }))
    );

    this.generateForests();
    this.generateRivers();
    this.generateRoads();
  }

  generateForests() {
    for (let i = 0; i < 150000; i++) { // 🔥 Controls tree density
      const x = Math.floor(Math.random() * this.worldSize);
      const y = Math.floor(Math.random() * this.worldSize);
      
      // Ensure spacing by checking adjacent tiles
      if (this.map[y][x].type === 'grass' && Math.random() < 0.35) {
        this.map[y][x].type = 'tree-tile';
      }
    }
  }

  generateRivers() {
    for (let r = 0; r < 15; r++) { // Generate 15 rivers
      let x = Math.floor(Math.random() * this.worldSize);
      let y = 0; // Start from top
      let width = Math.floor(Math.random() * 3) + 2; // 2-4 tiles wide

      while (y < this.worldSize) {
        for (let i = 0; i < width; i++) {
          let riverX = x + i;
          if (riverX >= 0 && riverX < this.worldSize) {
            this.map[y][riverX].type = 'ocean'; // Water tile
          }
        }
        x += Math.floor(Math.random() * 5) - 2; // Random left/right movement
        y++; // Move downward
      }
    }
  }

  getMap() {
    return this.map;
  }

  generateRoads() {
    for (let r = 0; r < Math.floor(Math.random() * 250) + 100; r++) { // 3-7 roads
      let horizontal = Math.random() < 0.5;
      let x = horizontal ? 0 : Math.floor(Math.random() * this.worldSize);
      let y = horizontal ? Math.floor(Math.random() * this.worldSize) : 0;

      while (x < this.worldSize && y < this.worldSize) {
        if (this.map[y][x].type === 'grass') { // Only replace grass
          this.map[y][x].type = horizontal ? 'road-lr' : 'road-td';

          // Occasionally place houses next to the road
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

  // --- Handle Tile Placement ---
  onTileClick(x: number, y: number) {
    if (!this.buildMode || !this.equippedTile) return;

    const nonBuildable = ['tree-tile', 'house-1', 'ocean']; // Cannot replace
    if (nonBuildable.includes(this.map[y][x].type)) {
      console.log(`Cannot build on ${this.map[y][x].type}`);
      return;
    }

    console.log(`Placing ${this.equippedTile} at (${x}, ${y})`);
    this.map[y][x].type = this.equippedTile;
  }

  // --- Select Tile from Inventory ---
  selectTile(tileType: string) {
    this.equippedTile = tileType;
    console.log(`Equipped tile: ${tileType}`);
  }

  // --- Export Map Data ---
  exportWorld() {
    console.log(JSON.stringify(this.map.map(row => row.map(tile => tile.type))));
  }

  // --- Get Tile Style ---
  getTileStyle(x: number, y: number, cameraX: number, cameraY: number) {
    if (y >= this.worldSize || x >= this.worldSize) return {}; // Prevent errors
    const tileExists = this.map[y] && this.map[y][x];
    const tileType = tileExists ? this.map[y][x].type : 'ocean';

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
