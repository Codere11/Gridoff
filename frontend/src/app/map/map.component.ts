import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';

@Component({
  selector: 'app-map',
  imports: [ CommonModule ],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  tileSize = 128; 
  worldSize = 50;
  tobaccoCount = 0;
  health = 100;
  money = 0;
  showHUD = true;
  buildMode = true; // ✅ Enables/disables build mode
  equippedTile = 'grass'; // ✅ Default selected tile


  spriteFrame = 0; // Keeps track of the frame
  spritePosition = '0px 0px'; // Default starting frame position
  lastDirection = 'right'; // Track direction to determine animation


  map: { type: string, growthStage: number }[][] = [];
  player = { x: 20, y: 10 };
  cameraX = 0;
  cameraY = 0;

  constructor() {}

  inventoryItems = [
    { name: 'Grass', type: 'grass', icon: '../../assets/tiles/grass.png' },
    { name: 'Dirt', type: 'dirt-3', icon: '../../assets/tiles/dirt-3.png' },
    { name: 'House', type: 'house-1', icon: '../../assets/icons/house-1.png' },
    { name: 'Tree', type: 'tree-tile', icon: '../../assets/tiles/tree-tile.png' },
    { name: 'Homestead', type: 'homestead', icon: '../../assets/tiles/homestead.png' },
    { name: 'Road-LR', type: 'road-lr', icon: '../../assets/tiles/road-lr.png' },
    { name: 'Road-TD', type: 'road-td', icon: '../../assets/tiles/road-td.png' },
    { name: 'Ocean', type: 'ocean', icon: '../../assets/tiles/ocean.png' },
  ];
  
  
  showInventory = true;
  

  ngOnInit() {
    this.generateMap();
    this.updateCamera();
  }

  generateMap() {
    this.map = Array.from({ length: this.worldSize }, () =>
      Array.from({ length: this.worldSize }, () => ({ type: 'grass', growthStage: 0 }))
    );
  }

  onTileClick(x: number, y: number) {
    if (this.buildMode && this.equippedTile) {  // ✅ Ensure build mode is on and a tile is equipped
      console.log(`Placing ${this.equippedTile} at (${x}, ${y})`);
      this.map[y][x].type = this.equippedTile; // ✅ Update tile type
    }
  }
  
  
  
  selectTile(tileType: string) {
    this.equippedTile = tileType;
    console.log(`Equipped tile: ${tileType}`); // ✅ Debugging to check if it updates
  }
  
  

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'w') this.movePlayer(0, -0.5);
    if (event.key === 's') this.movePlayer(0, 0.5);
    if (event.key === 'a') this.movePlayer(-0.5, 0);
    if (event.key === 'd') this.movePlayer(0.5, 0);

    if (event.key === 'e') this.exportWorld(); // ✅ Press 'E' to export map
  }


  exportWorld() {
    const exportedMap = this.map.map(row => row.map(tile => `"${tile.type}"`));
    console.log(`[ \n ${exportedMap.map(row => `[${row.join(', ')}]`).join(',\n')} \n]`);
  }
  


  movePlayer(dx: number, dy: number) {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;
  
    // ✅ Prevent movement if the target tile doesn't exist or is out of bounds
    if (
      newX < 0 || newY < 0 || 
      newX >= this.map[0].length || newY >= this.map.length || 
      !this.map[Math.floor(newY)] || !this.map[Math.floor(newY)][Math.floor(newX)]
    ) {
      return; // Prevent movement if out of bounds
    }
  
    this.player.x = newX;
    this.player.y = newY;
    
    this.spriteFrame = (this.spriteFrame + 1) % 2; // Toggle between two frames
  
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
  
  

  updateCamera() {
    const visibleTilesX = Math.ceil(window.innerWidth / this.tileSize);
    const visibleTilesY = Math.ceil(window.innerHeight / this.tileSize);
    
    this.cameraX = Math.max(0, Math.min(this.worldSize - visibleTilesX, this.player.x - Math.floor(visibleTilesX / 2)));
    this.cameraY = Math.max(0, Math.min(this.worldSize - visibleTilesY, this.player.y - Math.floor(visibleTilesY / 2)));
  }

  getPlayerStyle() {
    return {
      position: 'absolute',
      left: `${(this.player.x - this.cameraX) * this.tileSize}px`,
      top: `${(this.player.y - this.cameraY) * this.tileSize}px`,
      backgroundImage: "url('assets/sprites/player-movement.png')",
      backgroundSize: "256px 256px",  // Ensure full size
      backgroundPosition: this.spritePosition,
      width: "128px",
      height: "128px",
      zIndex: '100'
    };
  }
  
  
  
  

  getTileStyle(x: number, y: number) {
    const tileExists = this.map[y] && this.map[y][x];
    const tileType = tileExists ? this.map[y][x].type : 'ocean'; // ✅ Default to ocean
  
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
