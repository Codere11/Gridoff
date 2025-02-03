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

  spriteFrame = 0; // Keeps track of the frame
  spritePosition = '0px 0px'; // Default starting frame position
  lastDirection = 'right'; // Track direction to determine animation


  map: { type: string, growthStage: number }[][] = [];
  player = { x: 20, y: 10 };
  cameraX = 0;
  cameraY = 0;

  constructor() {}

  inventoryItems = [
    { name: 'Tobacco Seeds', icon: '../../assets/icons/tobacco-seeds.png', count: 5 },
    { name: 'Harvested Tobacco', icon: 'assets/icons/harvested-tobacco.png', count: 0 },
    { name: 'Watering Can', icon: '../../assets/icons/watering-can.png', count: 1 },
    { name: 'Shovel', icon: '../../assets/icons/shovel.png', count: 1 },
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

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'w') this.movePlayer(0, -0.5);
    if (event.key === 's') this.movePlayer(0, 0.5);
    if (event.key === 'a') this.movePlayer(-0.5, 0);
    if (event.key === 'd') this.movePlayer(0.5, 0);
  }

  movePlayer(dx: number, dy: number) {
    this.player.x = Math.max(0, Math.min(this.worldSize - 1, this.player.x + dx));
    this.player.y = Math.max(0, Math.min(this.worldSize - 1, this.player.y + dy));
  
    this.spriteFrame = (this.spriteFrame + 1) % 2; // Toggle between two frames
  
    if (dx > 0) {  // Moving Right
      this.lastDirection = 'right';
      this.spritePosition = `-${this.spriteFrame * 128}px 0px`;
    } else if (dx < 0) {  // Moving Left
      this.lastDirection = 'left';
      this.spritePosition = `-${this.spriteFrame * 128}px 0px`;
    } else if (dy < 0) {  // Moving Up
      this.lastDirection = 'up';
      this.spritePosition = `-${this.spriteFrame * 128}px -128px`;
    } else if (dy > 0) {  // Moving Down
      this.lastDirection = 'down';
      this.spritePosition = `-${this.spriteFrame * 128}px  -128px`;
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
    return {
      position: 'absolute',
      left: `${(x - this.cameraX) * this.tileSize}px`,
      top: `${(y - this.cameraY) * this.tileSize}px`,
      backgroundImage: `url('../../assets/tiles/${this.map[y][x].type}.png')`,
      backgroundSize: 'cover',
      width: `${this.tileSize}px`,
      height: `${this.tileSize}px`,
      zIndex: '10'
    };
  }

  onTileClick(x: number, y: number) {
    const tile = this.map[y][x];
    if (tile.type === 'grass') {
      tile.type = 'tobacco-1';
      tile.growthStage = 1;
      this.startGrowthTimer(x, y);
    } else if (tile.type === 'tobacco-3') {
      this.tobaccoCount++;
      tile.type = 'grass';
      tile.growthStage = 0;
      this.showHUD = true;
      setTimeout(() => this.showHUD = true, 2000);
    }
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
