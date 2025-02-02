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
  chunkSize = 10;
  worldSize = 50;

  map: string[][] = [];
  player = { x: 5, y: 5, smoothX: 1, smoothY: 1 }; // smoothX & smoothY for interpolation
  cameraX = 0;
  cameraY = 0;

  movementSpeed = 0.1; // Adjust for smooth movement
  keysPressed: Record<string, boolean> = {};

  chunkMap: Record<string, string> = {
    '0': 'grass',
    '1': 'ocean',
    '2': 'dirt-3',
    '3': 'tobacco-2'
  };

  constructor() {}

  ngOnInit() {
    this.generateMap();
    this.updateCamera();
    this.gameLoop(); // Start the game loop for smooth movement
  }

  generateMap() {
    this.map = Array.from({ length: this.worldSize }, (_, y) =>
      Array.from({ length: this.worldSize }, (_, x) => {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkY = Math.floor(y / this.chunkSize);
        const chunkType = ((chunkX + chunkY) % 4).toString();
        return this.chunkMap[chunkType];
      })
    );
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (['w', 'a', 's', 'd'].includes(event.key)) {
      this.keysPressed[event.key] = true;
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    if (['w', 'a', 's', 'd'].includes(event.key)) {
      this.keysPressed[event.key] = false;
    }
  }

  gameLoop() {
    setInterval(() => {
      let dx = 0;
      let dy = 0;
  
      if (this.keysPressed['w']) dy = -1;
      if (this.keysPressed['s']) dy = 1;
      if (this.keysPressed['a']) dx = -1;
      if (this.keysPressed['d']) dx = 1;
  
      // ✅ Immediately change player movement direction
      if (dx !== 0 || dy !== 0) {
        this.movePlayer(dx, dy); // Pass `true` to reset smooth movement instantly
      }
  
      this.smoothMove();
      this.updateCamera();
    }, 1000 / 60); // 60 FPS
  }
  
  
  smoothMove() {
    this.player.smoothX += (this.player.x - this.player.smoothX) * this.movementSpeed;
    this.player.smoothY += (this.player.y - this.player.smoothY) * this.movementSpeed;
  }
  

  movePlayer(dx: number, dy: number) {
    const newX = Math.max(0, Math.min(this.worldSize - 1, this.player.x + dx));
    const newY = Math.max(0, Math.min(this.worldSize - 1, this.player.y + dy));

    if (newX !== this.player.x || newY !== this.player.y) {
      this.player.x = newX;
      this.player.y = newY;
      this.updateCamera();
    }
  }

  

  updateCamera() {
    const visibleTilesX = Math.floor(window.innerWidth / this.tileSize);
    const visibleTilesY = Math.floor(window.innerHeight / this.tileSize);
  
    // ✅ Smoothly move the camera to follow the player
    this.cameraX += (this.player.smoothX - this.cameraX - Math.floor(visibleTilesX / 2)) * this.movementSpeed;
    this.cameraY += (this.player.smoothY - this.cameraY - Math.floor(visibleTilesY / 2)) * this.movementSpeed;
  }
  
  
  

  getTileStyle(x: number, y: number) {
    return {
      position: 'absolute',
      left: `${(x - this.cameraX) * this.tileSize}px`,
      top: `${(y - this.cameraY) * this.tileSize}px`,
      backgroundImage: `url('../../assets/tiles/${this.map[y][x]}.png')`,
      backgroundSize: 'cover',
      width: `${this.tileSize}px`,
      height: `${this.tileSize}px`
    };
  }
  

  getPlayerStyle() {
    const visibleTilesX = Math.floor(window.innerWidth / this.tileSize);
    const visibleTilesY = Math.floor(window.innerHeight / this.tileSize);
  
    return {
      position: 'absolute',
      left: `${Math.floor(visibleTilesX / 2) * this.tileSize}px`,
      top: `${Math.floor(visibleTilesY / 2) * this.tileSize}px`,
      backgroundImage: `url('../../assets/player.png')`,
      backgroundSize: 'cover',
      width: `${this.tileSize}px`,
      height: `${this.tileSize}px`,
      zIndex: '10'
    };
  }
  
}
