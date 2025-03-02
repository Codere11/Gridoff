import { Injectable, IterableDiffers, inject } from '@angular/core';
import { InventoryService } from './inventory.service';
import { CommonModule } from '@angular/common';
import { NpcService } from './npc.service';
import { Subject } from 'rxjs';

interface Item {
  id: number;
  name: string;
  type: string;
  icon: string;
}

export interface Tent {
  x: number;
  y: number;
  faction: number;
  type: 'hq' | 'regular';
}

interface InventorySlot {
  id: number;
  item: Item | null;
}

export interface Territory {
  type: string;
  factionName?: string;
}

@Injectable({
  providedIn: 'root'
  
})
export class GameStateService {
  tileSize = 128;
  worldSize = 3000;

  // --- Player State ---
  player = { x: 500, y: 350, health: 100, money: 0, ammo: 10 };
  currentItem: string | null = null;
  spriteFrame = 0;
  spritePosition = '0px 0px';
  lastDirection = 'right';
  itemIdCounter = 0;
  
  public houseCoordinates: { x: number, y: number }[] = [];
  public tobaccoTableCoordinates: { x: number, y: number }[] = [];
  public tentPositions: { faction: number; x: number; y: number }[] = [];

  // --- Map Data ---
  map: { type: string, growthStage: number }[][] = [];
  nonWalkableTiles = ['tree-tile', 'house-1'];
  showHUD = true;

  tents: Tent[] = [];

  territoryChanged = new Subject<Territory>();

  public gunsellerTableCoordinates: { x: number, y: number }[] = [];
  constructor() {
    this.generateMap();
  }

  // --- Player Actions ---
  equipItem(item: string) {
    this.currentItem = item;
    console.log(this.currentItem)
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
    if (!isShooting) { // Only update direction when moving
      if (dx > 0) this.lastDirection = 'right';
      else if (dx < 0) this.lastDirection = 'left';
      else if (dy < 0) this.lastDirection = 'up';
      else if (dy > 0) this.lastDirection = 'down';
    }
  
    // Player animation changes ONLY when moving
    if (!isShooting) {
      this.spriteFrame = (this.spriteFrame + 1) % 2; // Toggle frames
      this.spritePosition = `-${this.spriteFrame * 128}px 0px`;
    }
  
    // If holding AK, use last movement direction for animation
    if (this.currentItem === 'ak47') {
      if (this.lastDirection === 'right') this.spritePosition = "0px 0px";
      if (this.lastDirection === 'left') this.spritePosition = "-128px 0px";
      if (this.lastDirection === 'up') this.spritePosition = "-128px -128px";
      if (this.lastDirection === 'down') this.spritePosition = "0px -128px";
    }
  }

  updateTerritory(newTerritory: Territory) {
    console.log('Emitting territory change:', newTerritory);
    this.territoryChanged.next(newTerritory);
  }
  
  
  // --- Map Generation ---
  generateMap() {
    this.map = Array.from({ length: this.worldSize }, () =>
      Array.from({ length: this.worldSize }, () => ({ type: 'grass', growthStage: 0 }))
    );
    this.generateForests();
    this.generateRivers();
    this.generateGunsellerTables();
    this.generateTobaccoTables();
    this.assignFactionZones();
    this.assignTentPositions();
    this.connectFactionRoadsSimple();
    this.generateVillageClusters();
  }

  drawLine(x0: number, y0: number, x1: number, y1: number): void {
    let currentX = x0;
    let currentY = y0;
    let prevX = x0;
    let prevY = y0;
    let dx = Math.abs(x1 - x0);
    let sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0);
    let sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    
    while (true) {
      const deltaX = Math.abs(currentX - prevX);
      const deltaY = Math.abs(currentY - prevY);
      const roadType = (deltaX >= deltaY) ? 'road-lr' : 'road-td';
  
      const tile = this.map[currentY][currentX];
      // Only draw if not an HQ or tent, and prefer grass
      if (tile.type !== 'hq-ak' && tile.type !== 'hq-coin' && tile.type !== 'hq-sword' && 
          tile.type !== 'hq-tobacco' && tile.type !== 'hq-wolf' && tile.type !== 'tent') {
        if (tile.type === 'grass' || tile.type === 'dirt' || tile.type === 'farmland') {
          tile.type = roadType;
        }
      }
      
      if (currentX === x1 && currentY === y1) break;
      const e2 = 2 * err;
      prevX = currentX;
      prevY = currentY;
      if (e2 >= dy) { err += dy; currentX += sx; }
      if (e2 <= dx) { err += dx; currentY += sy; }
    }
  }

// Connects each tent to its faction's HQ by drawing a straight road between them.
// It scans the map for tiles with type starting with 'hq-' (HQ) or 'tent' and, per faction,
// draws a road (using drawLine) from the HQ to every tent.
connectFactionRoadsSimple(): void {
  // Gather all faction buildings (HQs and tents) into arrays (assumes 5 factions: 0–4).
  const factionBuildings: { faction: number; x: number; y: number }[][] = [[], [], [], [], []];
  for (let y = 0; y < this.worldSize; y++) {
    for (let x = 0; x < this.worldSize; x++) {
      const tile = this.map[y][x] as any;
      if (typeof tile.type === 'string' && (tile.type.startsWith('hq-') || tile.type === 'tent')) {
        factionBuildings[tile.faction].push({ faction: tile.faction, x, y });
      }
    }
  }
  
  // For each faction, find the HQ and then connect it to every other building in that faction.
  for (let f = 0; f < factionBuildings.length; f++) {
    if (factionBuildings[f].length === 0) continue;
    const hq = factionBuildings[f].find(b => {
      const t = this.map[b.y][b.x].type;
      return typeof t === 'string' && t.startsWith('hq-');
    });
    if (!hq) continue;
    for (const building of factionBuildings[f]) {
      if (building.x === hq.x && building.y === hq.y) continue;
      this.drawLine(hq.x, hq.y, building.x, building.y);
    }
  }
  console.log("Faction connecting roads drawn.");
}

generateVillageClusters(): void {
  const villageCount = 440;
  const minHouses = 3;
  const maxHouses = 15;
  let villagesPlaced = 0;
  let globalAttempts = 0;
  
  // We'll try until we've placed the required number of clusters or run out of attempts.
  while (villagesPlaced < villageCount && globalAttempts < 10000000) {
    globalAttempts++;
    // Randomly pick a candidate tile.
    const x = Math.floor(Math.random() * this.worldSize);
    const y = Math.floor(Math.random() * this.worldSize);
    const tile = this.map[y][x];
    
    // Check if the tile is a road tile (assume roads start with "road")
    if (typeof tile.type === 'string' && tile.type.startsWith('road')) {
      // Found a candidate road tile; now try to form a cluster around it.
      const clusterSize = minHouses + Math.floor(Math.random() * (maxHouses - minHouses + 1));
      let housesPlacedInCluster = 0;
      let clusterAttempts = 0;
      
      // We'll try up to 1000 attempts to place houses for this cluster.
      while (housesPlacedInCluster < clusterSize && clusterAttempts < 1000) {
        clusterAttempts++;
        // Choose a random offset; here we use a radius of 10 tiles.
        const offsetX = Math.floor((Math.random() - 0.5) * 20); // roughly -10 to +10
        const offsetY = Math.floor((Math.random() - 0.5) * 20);
        const nx = x + offsetX;
        const ny = y + offsetY;
        if (nx < 0 || ny < 0 || nx >= this.worldSize || ny >= this.worldSize) continue;
        const neighborTile = this.map[ny][nx];
        // Only place a house if the tile is still grass.
        if (neighborTile.type === 'grass') {
          neighborTile.type = 'house-1';
          this.houseCoordinates.push({ x: nx, y: ny });
          housesPlacedInCluster++;
        }
      }
      // If we placed at least one house, count this as a village cluster.
      if (housesPlacedInCluster > 0) {
        villagesPlaced++;
      }
    }
  }
  console.log(`Placed ${villagesPlaced} village clusters of houses.`);
}
  
assignFactionZones(): void {
  const seeds = [
    { faction: 0, x: 500, y: 350, hqType: 'hq-ak' },
    { faction: 1, x: 1300, y: 800, hqType: 'hq-coin' },
    { faction: 2, x: 1500, y: 2500, hqType: 'hq-sword' },
    { faction: 3, x: 800, y: 1500, hqType: 'hq-tobacco' },
    { faction: 4, x: 2200, y: 1500, hqType: 'hq-wolf' }
  ];

  // Coarse zone logic to assign factions
  const coarseScale = 10;
  const coarseWidth = Math.floor(this.worldSize / coarseScale);
  const coarseHeight = Math.floor(this.worldSize / coarseScale);
  const coarseZones: number[][] = Array.from({ length: coarseHeight }, () =>
    Array(coarseWidth).fill(-1)
  );
  for (let cy = 0; cy < coarseHeight; cy++) {
    for (let cx = 0; cx < coarseWidth; cx++) {
      let fullX = cx * coarseScale + coarseScale / 2 + (Math.random() - 0.5) * coarseScale * 0.4;
      let fullY = cy * coarseScale + coarseScale / 2 + (Math.random() - 0.5) * coarseScale * 0.4;
      let bestFaction = -1;
      let bestDist = Infinity;
      for (const seed of seeds) {
        const dx = fullX - seed.x;
        const dy = fullY - seed.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestFaction = seed.faction;
        }
      }
      coarseZones[cy][cx] = bestFaction;
    }
  }
  for (let y = 0; y < this.worldSize; y++) {
    const cy = Math.floor(y / coarseScale);
    for (let x = 0; x < this.worldSize; x++) {
      const cx = Math.floor(x / coarseScale);
      (this.map[y][x] as any).faction = coarseZones[cy][cx];
    }
  }

  // Single HQ loop
  this.tentPositions = []; // Reset to avoid carryover
  for (const seed of seeds) {
    if (seed.x >= 0 && seed.x < this.worldSize && seed.y >= 0 && seed.y < this.worldSize) {
      this.map[seed.y][seed.x].type = seed.hqType;
      (this.map[seed.y][seed.x] as any).faction = seed.faction;
      this.tentPositions.push({ faction: seed.faction, x: seed.x, y: seed.y });
      console.log(`Set HQ at (${seed.x}, ${seed.y}) to ${seed.hqType}, faction ${seed.faction}`);
    }
  }
  console.log("Faction zones and HQs assigned. tentPositions:", this.tentPositions.length);
}

assignTentPositions(): void {
  const numFactions = 5;
  const tentsPerFaction = 10;
  const allowedTypes = ['grass', 'dirt', 'farmland'];
  
  for (let faction = 0; faction < numFactions; faction++) {
    let tentsPlaced = 0;
    let attempts = 0;
    while (tentsPlaced < tentsPerFaction && attempts < 100000) {
      const x = Math.floor(Math.random() * this.worldSize);
      const y = Math.floor(Math.random() * this.worldSize);
      const tile = this.map[y][x];
      if (allowedTypes.includes(tile.type) && !tile.type.startsWith('hq-') && tile.type !== 'tent' && (tile as any).faction === faction) {
        tile.type = 'tent';
        this.tentPositions.push({ faction, x, y });
        tentsPlaced++;
        console.log(`Placed tent for faction ${faction} at (${x}, ${y})`);
      }
      attempts++;
    }
    console.log(`Faction ${faction}: placed ${tentsPlaced} tents`);
  }
  console.log("Tent positions assigned:", this.tentPositions.length);
}

  /**
 * Finds a path between (startX, startY) and (endX, endY) using A*.
 * Only tiles of type 'grass', 'dirt', or 'farmland' are considered traversable.
 * Non-traversable tiles (trees, houses, etc.) get a very high cost.
 */
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

  // Add this new method to your GameStateService class:
  generateGunsellerTables(): void {
    this.gunsellerTableCoordinates = []; // Clear any existing coordinates
    const numberOfAttempts = Math.floor(Math.random() * 2200) + 100; // Number of attempts
    for (let i = 0; i < numberOfAttempts; i++) {
      const x = Math.floor(Math.random() * this.worldSize);
      const y = Math.floor(Math.random() * this.worldSize);
      const currentType = this.map[y][x].type;
      // Relax condition: allow table if tile is not a house or ocean
      if (currentType !== 'house-1' && currentType !== 'ocean') {
        this.map[y][x].type = 'gunseller-table1';
        this.gunsellerTableCoordinates.push({ x, y });
      }
    }
    console.log('Generated gunseller tables:', this.gunsellerTableCoordinates.length);
  }  

  generateTobaccoTables(): void {
    // Clear any previous tobacco table coordinates.
    this.tobaccoTableCoordinates = [];
    // For example, try a fixed number of placements (adjust as needed)
    const numberOfAttempts = Math.floor(Math.random() * 1600) + 50;
    for (let i = 0; i < numberOfAttempts; i++) {
      const x = Math.floor(Math.random() * this.worldSize);
      const y = Math.floor(Math.random() * this.worldSize);
      const currentType = this.map[y][x].type;
      // Only allow placement on tiles that are not houses, oceans, or already other special tiles.
      if (currentType !== 'house-1' &&
          currentType !== 'ocean' &&
          currentType !== 'gunseller-table1' &&
          currentType !== 'tobacco-table') {
        // With a given chance (e.g. 20%), convert this tile into a tobacco-table.
        if (Math.random() < 0.2) {
          this.map[y][x].type = 'tobacco-table';
          this.tobaccoTableCoordinates.push({ x, y });
        }
      }
    }
    console.log('Generated tobacco table tiles:', this.tobaccoTableCoordinates.length);
  }


  // --- HUD & Rendering ---
  toggleHUD() {
    this.showHUD = !this.showHUD;
  }

  getPlayerStyle(cameraX: number, cameraY: number) {
    let sprite = this.currentItem === 'ak47'
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

  getTileStyle(x: number, y: number, cameraX: number, cameraY: number): { [key: string]: string } {
    if (y >= this.worldSize || x >= this.worldSize) return {};
    const tile = this.map[y][x];
    const tileType = tile?.type || 'ocean';
    
    // Calculate the "claim" for this tile.
    // Influence radius is 150 tiles.
    const radiusSq = 150 * 150;
    let claim: number | null = null;
    
    // Loop over all tent positions (each with properties { faction: number, x: number, y: number }).
    for (const tent of this.tentPositions) {
      const dx = x - tent.x;
      const dy = y - tent.y;
      if (dx * dx + dy * dy <= radiusSq) {
        if (claim === null) {
          claim = tent.faction;
        } else if (claim !== tent.faction) {
          // If more than one faction influences this tile, mark as border.
          claim = -2;
          break;
        }
      }
    }
    // If no tent influences the tile, mark as wilderness.
    if (claim === null) {
      claim = -1;
    }
    
    // Build the base style.
    let style: { [key: string]: string } = {
      position: 'absolute',
      left: `${(x - cameraX) * this.tileSize}px`,
      top: `${(y - cameraY) * this.tileSize}px`,
      backgroundImage: `url('../../assets/tiles/${tileType}.png')`,
      backgroundSize: 'cover',
      width: `${this.tileSize}px`,
      height: `${this.tileSize}px`,
      zIndex: '10'
    };
    
    // Now, for each of the four neighboring tiles, calculate their claim.
    const directions = [
      { dx: 0, dy: -1, border: 'borderTop' },
      { dx: 0, dy: 1, border: 'borderBottom' },
      { dx: -1, dy: 0, border: 'borderLeft' },
      { dx: 1, dy: 0, border: 'borderRight' }
    ];
    
    for (const d of directions) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (nx >= 0 && ny >= 0 && nx < this.worldSize && ny < this.worldSize) {
        let neighborClaim: number | null = null;
        for (const tent of this.tentPositions) {
          const dxn = nx - tent.x;
          const dyn = ny - tent.y;
          if (dxn * dxn + dyn * dyn <= radiusSq) {
            if (neighborClaim === null) {
              neighborClaim = tent.faction;
            } else if (neighborClaim !== tent.faction) {
              neighborClaim = -2;
              break;
            }
          }
        }
        if (neighborClaim === null) {
          neighborClaim = -1;
        }
        // If the neighbor's claim differs from the current tile's claim, add a dotted border.
        if (neighborClaim !== claim) {
          style[d.border] = '2px dotted black';
        }
      }
    }
    
    return style;
  }  
  

  interactWithTile(x: number, y: number) {
    if (!this.map[y] || !this.map[y][x]) return;
  
    const tile = this.map[y][x];
  
    if (this.currentItem === 'shovel' && tile.type === 'grass') {
      this.map[y][x] = { type: 'dirt', growthStage: 0 };
    }
    else  if (this.currentItem === 'watering-can' && tile.type === 'dirt') {
      this.map[y][x] = { type: 'farmland', growthStage: 0 };
    }
    else if (this.currentItem === 'tobacco-seeds' && tile.type === 'farmland') {
      this.map[y][x] = { type: 'tobacco-1', growthStage: 1};

      if(this.map[y][x].type === 'tobacco-1')
      setTimeout(() => {
        this.map[y][x] = { type:'tobacco-2', growthStage:2};
      }, 30000);
        setTimeout(() => {
          this.map[y][x] = { type: 'tobacco-3', growthStage: 3}
        }, 60000)
    }
  }

  harvestTile(x:number, y:number) {
    if (!this.map[y] || this.map[x]) return;

    const tile = this.map[y][x]
  }
}