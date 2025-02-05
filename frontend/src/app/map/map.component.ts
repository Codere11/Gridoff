import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';

@Component({
  selector: 'app-map',
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  
  // --- Game Configuration ---
  tileSize = 128; 
  worldSize = 50;

  // --- Player Stats ---
  tobaccoCount = 0;
  health = 100;
  money = 0;

  // --- UI States ---
  showHUD = true;
  showInventory = true;
  buildMode = true; 
  equippedTile = 'grass';

  // --- Player Animation ---
  spriteFrame = 0; 
  spritePosition = '0px 0px';
  lastDirection = 'right';

  // --- Map and Player Position ---
  map: { type: string, growthStage: number }[][] = [];
  player = { x: 20, y: 10 };
  cameraX = 0;
  cameraY = 0;

  // --- Inventory Items ---
  inventoryItems = [
    { name: 'Grass', type: 'grass', icon: '../../assets/tiles/grass.png' },
    { name: 'Dirt', type: 'dirt-3', icon: '../../assets/tiles/dirt-3.png' },
    { name: 'House', type: 'house-1', icon: '../../assets/tiles/house-1.png' },
    { name: 'Tree', type: 'tree-tile', icon: '../../assets/tiles/tree-tile.png' },
    { name: 'Homestead', type: 'homestead', icon: '../../assets/tiles/homestead.png' },
    { name: 'Road-LR', type: 'road-lr', icon: '../../assets/tiles/road-lr.png' },
    { name: 'Road-TD', type: 'road-td', icon: '../../assets/tiles/road-td.png' },
    { name: 'Ocean', type: 'ocean', icon: '../../assets/tiles/ocean.png' },
    { name: 'Bridge', type: 'bridge', icon: '../../assets/tiles/bridge.png' },
  ];

  // --- Imported Map (Paste Here) ---
  importedMap: string[][] = [["tree-tile","tree-tile","tree-tile","tree-tile","grass","tree-tile","grass","tree-tile","grass","grass","tree-tile","grass","grass","tree-tile","grass","grass","tree-tile","grass","ocean","ocean","grass","grass","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","tree-tile","grass","ocean","ocean","ocean","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["tree-tile","tree-tile","homestead","grass","tree-tile","grass","grass","tree-tile","tree-tile","grass","grass","grass","tree-tile","grass","grass","tree-tile","grass","grass","ocean","ocean","grass","grass","tree-tile","grass","grass","grass","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","ocean","ocean","ocean","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["tree-tile","tree-tile","grass","grass","tree-tile","tree-tile","tree-tile","grass","tree-tile","tree-tile","tree-tile","grass","grass","tree-tile","tree-tile","grass","grass","grass","tree-tile","ocean","ocean","grass","grass","grass","grass","grass","grass","grass","grass","grass","tree-tile","grass","grass","ocean","ocean","ocean","grass","grass","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["tree-tile","tree-tile","grass","tree-tile","tree-tile","grass","tree-tile","tree-tile","grass","tree-tile","tree-tile","grass","tree-tile","grass","grass","grass","tree-tile","tree-tile","grass","ocean","ocean","grass","grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","grass","ocean","ocean","ocean","grass","tree-tile","tree-tile","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["tree-tile","grass","tree-tile","grass","tree-tile","tree-tile","tree-tile","grass","tree-tile","grass","grass","tree-tile","tree-tile","grass","grass","tree-tile","grass","grass","grass","ocean","ocean","grass","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","ocean","ocean","ocean","ocean","ocean","ocean","tree-tile","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","tree-tile","grass","tree-tile","grass","grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","grass","tree-tile","grass","tree-tile","grass","grass","tree-tile","grass","ocean","ocean","grass","grass","grass","grass","tree-tile","grass","grass","tree-tile","grass","ocean","ocean","ocean","grass","ocean","ocean","ocean","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["tree-tile","tree-tile","grass","tree-tile","tree-tile","tree-tile","tree-tile","tree-tile","tree-tile","grass","grass","tree-tile","grass","tree-tile","grass","grass","grass","grass","tree-tile","grass","bridge","bridge","grass","grass","grass","tree-tile","grass","tree-tile","grass","grass","grass","ocean","ocean","ocean","tree-tile","grass","bridge","bridge","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","tree-tile","grass","grass","grass","tree-tile","grass","grass","tree-tile","tree-tile","grass","grass","grass","grass","tree-tile","grass","tree-tile","grass","grass","tree-tile","ocean","ocean","grass","grass","grass","grass","grass","grass","grass","grass","ocean","ocean","ocean","grass","grass","grass","tree-tile","ocean","ocean","grass","tree-tile","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","tree-tile","grass","grass","tree-tile","grass","grass","tree-tile","grass","tree-tile","grass","grass","tree-tile","tree-tile","grass","grass","grass","grass","grass","grass","ocean","ocean","grass","grass","grass","tree-tile","grass","tree-tile","grass","grass","ocean","ocean","ocean","grass","tree-tile","grass","grass","grass","ocean","ocean","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","tree-tile","grass","tree-tile","grass","grass","grass","house-1","grass","tree-tile","tree-tile","grass","grass","tree-tile","tree-tile","tree-tile","grass","grass","tree-tile","ocean","ocean","grass","tree-tile","grass","tree-tile","grass","grass","grass","grass","bridge","bridge","grass","grass","grass","grass","tree-tile","grass","ocean","ocean","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","tree-tile","grass","grass","tree-tile","grass","tree-tile","tree-tile","grass","tree-tile","grass","tree-tile","grass","grass","grass","tree-tile","tree-tile","tree-tile","grass","ocean","ocean","grass","grass","grass","grass","grass","grass","tree-tile","grass","ocean","ocean","ocean","ocean","grass","grass","tree-tile","grass","grass","tree-tile","ocean","ocean","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","tree-tile","grass","grass","tree-tile","grass","grass","grass","tree-tile","grass","grass","tree-tile","grass","tree-tile","grass","grass","grass","grass","ocean","ocean","grass","grass","tree-tile","grass","grass","tree-tile","grass","grass","ocean","ocean","grass","tree-tile","ocean","ocean","grass","grass","grass","tree-tile","grass","grass","ocean","ocean","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","house-1","grass","grass","grass","ocean","ocean","ocean","grass","grass","grass","grass","grass","grass","grass","grass","ocean","ocean","grass","grass","grass","ocean","ocean","ocean","grass","grass","tree-tile","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","tree-tile","grass","grass","house-1","grass","grass","grass","grass","grass","grass","grass","grass","ocean","ocean","ocean","ocean","grass","grass","grass","tree-tile","grass","grass","tree-tile","grass","grass","ocean","ocean","grass","tree-tile","grass","grass","ocean","ocean","grass","tree-tile","grass","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","grass","tree-tile","tree-tile","grass","house-1","tree-tile","grass","ocean","ocean","ocean","grass","tree-tile","grass","tree-tile","grass","grass","tree-tile","grass","grass","grass","grass","ocean","ocean","grass","grass","grass","grass","tree-tile","ocean","ocean","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","tree-tile","grass","grass","tree-tile","grass","grass","grass","grass","grass","ocean","ocean","grass","grass","grass","grass","grass","grass","tree-tile","grass","grass","grass","grass","ocean","ocean","grass","grass","tree-tile","grass","grass","tree-tile","grass","ocean","ocean","tree-tile","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","tree-tile","grass","tree-tile","grass","grass","grass","grass","house-1","grass","grass","ocean","ocean","grass","grass","tree-tile","grass","grass","tree-tile","grass","grass","tree-tile","grass","ocean","ocean","tree-tile","grass","grass","grass","grass","grass","grass","ocean","ocean","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","house-1","grass","grass","grass","road-td","grass","grass","grass","grass","ocean","ocean","grass","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","ocean","ocean","grass","grass","grass","grass","grass","grass","grass","ocean","ocean","grass","grass","tree-tile","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","tree-tile","grass","grass","grass","grass","grass","grass","road-td","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","tree-tile","grass","grass","grass","tree-tile","grass","grass","grass","house-1","grass","road-td","tree-tile","grass","grass","ocean","ocean","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","house-1","grass","tree-tile","grass","grass","road-td","grass","grass","grass","grass","grass","house-1","grass","grass","grass","house-1","grass","house-1","grass","grass","house-1","grass","grass","house-1","grass","grass","house-1","grass","road-td","grass","grass","tree-tile","grass","ocean","ocean","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","tree-tile","grass","grass","grass","grass","house-1","road-td","grass","house-1","grass","grass","grass","grass","house-1","dirt-3","road-lr","road-lr","road-lr","house-1","tree-tile","grass","grass","tree-tile","grass","house-1","grass","grass","grass","grass","road-td","grass","grass","grass","grass","ocean","ocean","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","tree-tile","grass","grass","grass","grass","road-td","grass","grass","grass","grass","grass","grass","house-1","road-td","grass","grass","house-1","house-1","grass","tree-tile","house-1","grass","house-1","grass","house-1","house-1","grass","grass","road-td","grass","tree-tile","grass","tree-tile","grass","ocean","ocean","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","dirt-3","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","dirt-3","road-lr","house-1","grass","tree-tile","house-1","grass","dirt-3","road-lr","road-lr","road-lr","road-lr","tree-tile","grass","grass","road-td","grass","grass","grass","grass","grass","tree-tile","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","house-1","grass","grass","grass","house-1","grass","grass","grass","grass","grass","road-td","house-1","grass","road-lr","road-lr","dirt-3","house-1","road-td","house-1","house-1","grass","house-1","grass","house-1","grass","dirt-3","road-lr","road-lr","road-lr","road-lr","dirt-3","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","house-1","grass","grass","house-1","grass","grass","grass","grass","grass","grass","grass","grass","grass","house-1","dirt-3","road-lr","road-lr","road-lr","road-lr","dirt-3","road-lr","dirt-3","road-lr","road-lr","road-lr","dirt-3","road-lr","grass","grass","grass","tree-tile","grass","grass","grass","road-td","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","house-1","grass","grass","grass","grass","grass","house-1","grass","grass","house-1","grass","grass","grass","grass","grass","road-td","house-1","grass","house-1","road-lr","dirt-3","house-1","road-td","house-1","grass","house-1","road-td","house-1","grass","tree-tile","grass","grass","grass","tree-tile","grass","road-td","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","house-1","grass","grass","grass","road-td","grass","grass","house-1","road-lr","dirt-3","grass","dirt-3","road-lr","house-1","grass","grass","grass","grass","tree-tile","grass","tree-tile","grass","grass","grass","road-td","grass","grass","tree-tile","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","house-1","house-1","grass","grass","grass","grass","grass","house-1","grass","house-1","grass","grass","road-td","grass","grass","grass","grass","house-1","grass","grass","grass","grass","grass","road-lr","dirt-3","grass","grass","grass","tree-tile","tree-tile","grass","tree-tile","road-td","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","house-1","grass","grass","grass","house-1","grass","grass","grass","grass","house-1","grass","grass","road-td","house-1","grass","grass","grass","grass","grass","house-1","house-1","grass","house-1","grass","road-td","grass","grass","tree-tile","grass","grass","tree-tile","grass","road-td","grass","tree-tile","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","house-1","grass","grass","grass","grass","grass","dirt-3","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","dirt-3","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","dirt-3","grass","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","house-1","grass","grass","grass","grass","grass","grass","grass","grass","grass","house-1","grass","road-td","grass","house-1","grass","grass","grass","grass","grass","grass","grass","grass","house-1","road-td","grass","grass","tree-tile","grass","tree-tile","grass","grass","grass","grass","tree-tile","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","dirt-3","road-lr","road-lr","grass","grass","road-td","grass","grass","grass","grass","house-1","grass","grass","house-1","grass","grass","grass","road-td","grass","tree-tile","grass","tree-tile","grass","grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","grass","house-1","grass","house-1","grass","road-td","grass","house-1","grass","grass","road-td","grass","grass","grass","grass","grass","grass","grass","grass","grass","house-1","grass","road-td","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","road-td","grass","grass","grass","grass","road-td","grass","grass","grass","house-1","grass","tree-tile","grass","tree-tile","grass","grass","grass","dirt-3","road-lr","road-lr","road-lr","road-lr","dirt-3","tree-tile","grass","grass","tree-tile","tree-tile","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","tree-tile","grass","grass","grass","tree-tile","road-lr","road-lr","road-lr","road-lr","road-lr","dirt-3","road-lr","road-lr","road-lr","road-lr","dirt-3","grass","tree-tile","grass","grass","grass","grass","grass","tree-tile","grass","grass","house-1","grass","house-1","grass","house-1","grass","road-td","grass","tree-tile","grass","grass","grass","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","road-td","grass","grass","grass","grass","grass","grass","grass","grass","grass","tree-tile","tree-tile","grass","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","road-td","tree-tile","grass","grass","tree-tile","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["tree-tile","tree-tile","grass","grass","tree-tile","grass","grass","tree-tile","grass","grass","grass","road-td","house-1","grass","grass","house-1","grass","grass","house-1","grass","grass","grass","tree-tile","grass","grass","tree-tile","grass","tree-tile","grass","grass","grass","house-1","grass","road-td","grass","grass","tree-tile","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","tree-tile","grass","tree-tile","tree-tile","tree-tile","tree-tile","tree-tile","tree-tile","grass","grass","road-td","grass","grass","house-1","grass","grass","grass","grass","tree-tile","grass","grass","grass","tree-tile","tree-tile","grass","grass","tree-tile","grass","tree-tile","tree-tile","tree-tile","grass","road-td","grass","grass","grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass"],["tree-tile","tree-tile","tree-tile","tree-tile","tree-tile","grass","tree-tile","tree-tile","tree-tile","grass","grass","road-td","grass","grass","grass","grass","tree-tile","grass","grass","grass","grass","grass","tree-tile","grass","grass","grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","tree-tile","dirt-3","road-lr","road-lr","dirt-3","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["tree-tile","grass","tree-tile","tree-tile","tree-tile","tree-tile","tree-tile","tree-tile","grass","tree-tile","tree-tile","road-td","grass","grass","grass","grass","grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","tree-tile","tree-tile","tree-tile","tree-tile","tree-tile","grass","tree-tile","grass","road-td","grass","house-1","road-td","tree-tile","tree-tile","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","tree-tile","tree-tile","grass","tree-tile","grass","grass","tree-tile","grass","tree-tile","grass","dirt-3","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","road-lr","grass","tree-tile","grass","tree-tile","tree-tile","tree-tile","grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","tree-tile","house-1","grass","tree-tile","road-td","tree-tile","grass","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","tree-tile","grass","tree-tile","tree-tile","tree-tile","tree-tile","grass","tree-tile","grass","grass","tree-tile","grass","grass","grass","grass","tree-tile","grass","grass","tree-tile","grass","grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","tree-tile","tree-tile","tree-tile","grass","grass","house-1","road-td","house-1","grass","tree-tile","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","tree-tile","grass","tree-tile","grass","tree-tile","grass","grass","grass","tree-tile","grass","tree-tile","tree-tile","grass","tree-tile","grass","tree-tile","tree-tile","tree-tile","tree-tile","grass","grass","tree-tile","grass","grass","grass","tree-tile","tree-tile","tree-tile","tree-tile","grass","grass","tree-tile","tree-tile","grass","grass","road-td","tree-tile","house-1","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["tree-tile","grass","homestead","road-lr","grass","tree-tile","grass","tree-tile","grass","tree-tile","tree-tile","tree-tile","grass","tree-tile","grass","grass","tree-tile","grass","tree-tile","grass","tree-tile","tree-tile","grass","tree-tile","tree-tile","tree-tile","tree-tile","grass","tree-tile","tree-tile","tree-tile","tree-tile","grass","tree-tile","house-1","road-lr","dirt-3","road-lr","house-1","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","tree-tile","grass","tree-tile","grass","grass","grass","tree-tile","tree-tile","grass","grass","tree-tile","grass","grass","tree-tile","tree-tile","grass","grass","grass","grass","tree-tile","grass","tree-tile","grass","tree-tile","tree-tile","grass","tree-tile","tree-tile","tree-tile","grass","tree-tile","grass","grass","grass","grass","road-td","tree-tile","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["tree-tile","grass","tree-tile","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","tree-tile","tree-tile","grass","grass","tree-tile","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"],["grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass","grass"]]; // Paste your 2D array here
  
  constructor() {}

  ngOnInit() {
    this.generateMap();
    this.updateCamera();
  }

  // --- Map Generation ---
  generateMap() {
    if (this.importedMap.length > 0) {
      // Use the imported map
      this.map = this.importedMap.map(row => row.map(tile => ({ type: tile, growthStage: 0 })));
    } else {
      // Generate default grass map
      this.map = Array.from({ length: this.worldSize }, () =>
        Array.from({ length: this.worldSize }, () => ({ type: 'grass', growthStage: 0 }))
      );
    }
  }

  // --- Handling Tile Placement ---
  onTileClick(x: number, y: number) {
    if (this.buildMode && this.equippedTile) {  
      console.log(`Placing ${this.equippedTile} at (${x}, ${y})`);
      this.map[y][x].type = this.equippedTile; 
    }
  }

  // --- Selecting Tile from Inventory ---
  selectTile(tileType: string) {
    this.equippedTile = tileType;
    console.log(`Equipped tile: ${tileType}`); 
  }

  // --- Keyboard Input Handling ---
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'w': this.movePlayer(0, -0.5); break;
      case 's': this.movePlayer(0, 0.5); break;
      case 'a': this.movePlayer(-0.5, 0); break;
      case 'd': this.movePlayer(0.5, 0); break;
      case 'e': this.exportWorld(); break;
    }
  }

  // --- Export Map Data ---
  exportWorld() {
    const exportedMap = this.map.map(row => row.map(tile => tile.type));
    console.log(JSON.stringify(exportedMap)); // ✅ Outputs a clean JSON array
  }
  
  // --- Player Movement ---
  movePlayer(dx: number, dy: number) {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    if (
      newX < 0 || newY < 0 || 
      newX >= this.map[0].length || newY >= this.map.length || 
      !this.map[Math.floor(newY)] || !this.map[Math.floor(newY)][Math.floor(newX)]
    ) {
      return; 
    }

    this.player.x = newX;
    this.player.y = newY;
    
    this.spriteFrame = (this.spriteFrame + 1) % 2; 

    if (dx > 0) {  
      this.lastDirection = 'right';
      this.spritePosition = `-${this.spriteFrame * 128}px 0px`;
    } else if (dx < 0) {  
      this.lastDirection = 'left';
      this.spritePosition = `-${this.spriteFrame * 128}px 0px`;
    } else if (dy < 0) {  
      this.lastDirection = 'up';
      this.spritePosition = `-${this.spriteFrame * 128}px -128px`;
    } else if (dy > 0) {  
      this.lastDirection = 'down';
      this.spritePosition = `-${this.spriteFrame * 128}px -128px`;
    }

    this.updateCamera();
  }

  // --- Camera Update ---
  updateCamera() {
    const visibleTilesX = Math.ceil(window.innerWidth / this.tileSize);
    const visibleTilesY = Math.ceil(window.innerHeight / this.tileSize);
    
    this.cameraX = Math.max(0, Math.min(this.worldSize - visibleTilesX, this.player.x - Math.floor(visibleTilesX / 2)));
    this.cameraY = Math.max(0, Math.min(this.worldSize - visibleTilesY, this.player.y - Math.floor(visibleTilesY / 2)));
  }

  // --- Get Player Style for Rendering ---
  getPlayerStyle() {
    return {
      position: 'absolute',
      left: `${(this.player.x - this.cameraX) * this.tileSize}px`,
      top: `${(this.player.y - this.cameraY) * this.tileSize}px`,
      backgroundImage: "url('assets/sprites/player-movement.png')",
      backgroundSize: "256px 256px",  
      backgroundPosition: this.spritePosition,
      width: "128px",
      height: "128px",
      zIndex: '100'
    };
  }

  // --- Get Tile Style for Rendering ---
  getTileStyle(x: number, y: number) {
    const tileExists = this.map[y] && this.map[y][x];
    const tileType = tileExists ? this.map[y][x].type : 'ocean'; 
  
    return {
      position: 'absolute',
      left: `${(x - this.cameraX) * this.tileSize}px`,
      top: `${(y - this.cameraY) * this.tileSize}px`,
      backgroundImage: `url('../../assets/tiles/${tileType}.png')`,
      backgroundSize: 'cover',
      width: `${this.tileSize}px`,
      height: `${this.tileSize}px`,
      zIndex: '10'
    };
  }

  // --- Crop Growth System ---
  startGrowthTimer(x: number, y: number) {
    setTimeout(() => {
      const tile = this.map[y][x];
      if (tile.growthStage > 0 && tile.growthStage < 3) {
        tile.growthStage++;
        tile.type = `tobacco-${tile.growthStage}`;
        this.startGrowthTimer(x, y);
      }
    }, 10000);
  }

}
