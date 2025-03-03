import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../services/game-state.service';
import { CombatService } from '../services/combat.service';
import { InventoryService } from '../services/inventory.service';
import { InteractionService, Tile, InteractionContext } from '../services/interaction.service';
import { CombatState } from '../services/npc.service';
import { NpcService, NPC } from '../services/npc.service';
import { FormsModule } from '@angular/forms'
import { HttpClientModule } from '@angular/common/http'; // Add this
import { HttpClient } from '@angular/common/http'; // Add this

// Interfaces for items, inventory slots, and the dragged stack.
interface Item {
  id: number;
  name: string;
  type: string;
  icon: string;
  stackable: boolean;
}

interface InventorySlot {
  id: number;
  item: Item | null;
  quantity: number;
}

interface DraggedStack {
  item: Item;
  quantity: number;
}

export interface Territory {
  type: string;
  factionName?: string;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  // Injected services
  gameState = inject(GameStateService);
  combatService = inject(CombatService);
  inventoryService = inject(InventoryService);
  interactionService = inject(InteractionService);
  npcService = inject(NpcService);

  // Map and camera properties
  tileSize = 128;
  cameraX = 0;
  cameraY = 0;
  visibleTilesX = 0;
  visibleTilesY = 0;
  inventoryOpen: boolean = false;

  // Drag & Drop state
  draggedStack: DraggedStack | null = null;
  dragSourceIndex: number = -1;
  dragButton: number | null = null;
  dragGhostStyle: { [key: string]: string } = {};
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;

  // For distinguishing click vs. drag:
  initialMouseX: number = 0;
  initialMouseY: number = 0;
  isDragging: boolean = false;
  readonly dragThreshold: number = 5; // pixels

  lastPlayerZone: number = -1;
  zoneMessage: string = "";
  zoneMessageTimeout: any;

  // Map of faction IDs to names (adjust names as desired)
  factionNames = ["AK Faction", "Coin Faction", "Sword Faction", "Tobacco Faction", "Wolf Faction"];

  chatInput: string = "";
  chatMessages: { sender: string; text: string }[] = [];

  // Exposed getters
  get money() { return this.gameState.player.money; }
  get showHUD() { return this.gameState.showHUD; }
  get inventoryItems() { return this.inventoryService.inventorySlots; }
  get playerCoordinates(): string {
    return `(${this.gameState.player.x.toFixed(2)}, ${this.gameState.player.y.toFixed(2)})`;
  }
  gameStateService = inject(GameStateService)
  
  // For equipment selection.
  selectedSlotIndex: number | null = null;

  // At the top of your MapComponent class, add:
  currentTradeMode: 'sellTobacco' | 'buyAmmo' = 'sellTobacco';
  showTradeHUD: boolean = false;
  currentTrader: NPC | null = null;

  private http = inject(HttpClient)

  // A tradeSlot to hold the item dropped for trade
  tradeSlot: InventorySlot = { id: -1, item: null, quantity: 0 };

  chatFocused: boolean = false;

  onChatFocus(): void {
    this.chatFocused = true;
  }

  onChatBlur(): void {
    this.chatFocused = false;
  }

  // ---------------
  // Lifecycle Methods
  // ---------------
  ngOnInit() {
    this.updateCamera();
    this.setVisibleTiles();
    this.updateGameLoop();
    this.gameStateService.territoryChanged.subscribe((territory: Territory) => {
      console.log('Territory received in component:', territory);
      let message = '';
      if (territory.type === 'wilderness') {
        message = 'Entering wilderness';
      } else if (territory.factionName) {
        message = `Entering ${territory.factionName}'s territory`;
      }
      this.showZoneMessage(message);
    });
    this.npcService.spawnWarlords();
    this.npcService.spawnSoldiersAtTents();
  }

  showZoneMessage(message: string) {
    this.zoneMessage = message;
    setTimeout(() => {
      this.zoneMessage = '';
    }, 3000);
  }

  @HostListener('window:resize')
  setVisibleTiles() {
    this.visibleTilesX = Math.ceil(window.innerWidth / this.tileSize);
    this.visibleTilesY = Math.ceil(window.innerHeight / this.tileSize);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // If the chat input is focused, do nothing.
    if (this.chatFocused) return;

    let dx = 0, dy = 0;
    const moveSpeed = 0.2;
    switch (event.key) {
      case 'w': dy = -moveSpeed; break;
      case 's': dy = moveSpeed; break;
      case 'a': dx = -moveSpeed; break;
      case 'd': dx = moveSpeed; break;
      case 'f':
        this.combatService.fireBullet();
        this.gameState.updatePlayerAnimation(0, 0, true);
        return;
      case 'e':
        this.toggleInventory();
        break;
      case 'y':
        console.log('Player coordinates:', this.playerCoordinates);
        break;
    }
    if (dx !== 0 || dy !== 0) {
      this.gameState.movePlayer(dx, dy);
    }
    this.updateCamera();
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    // FIRST: Check for a nearby trader (villager)
    const trader = this.getNearbyTrader();
    if (trader) {
      this.showTradeHUD = true;
      this.currentTrader = trader;
      console.log("Trading with trader:", trader);
      return;  // Exit immediately to open trade HUD
    }
    
    // Otherwise, process tile interactions:
    const tileX = Math.floor((event.clientX / this.tileSize) + this.cameraX);
    const tileY = Math.floor((event.clientY / this.tileSize) + this.cameraY);
  
    if (
      tileY < 0 ||
      tileY >= this.gameState.map.length ||
      tileX < 0 ||
      tileX >= this.gameState.map[0].length
    ) {
      console.warn('Clicked tile is out of bounds:', tileX, tileY);
      return;
    }
  
    const tile: Tile = this.gameState.map[tileY][tileX];
  
    if (tile.type === 'tobacco-3') {
      this.harvestTobacco(tile);
      return;
    }
  
    if (this.gameState.currentItem === 'ak47') {
      this.combatService.fireBullet();
    } else {
      const context: InteractionContext = {
        inventory: {
          removeItem: (itemType: string, quantity: number) => this.inventoryService.removeItem(itemType, quantity)
        }
      };
      this.interactionService.handleInteraction(tile, context);
    }
  }

  // Checks for a nearby trader NPC (of type "villager")
  harvestTobacco(tile: Tile): void {
    const seedsDrop = Math.floor(Math.random() * 3) + 3;
    const tobaccoDrop = Math.floor(Math.random() * 3) + 3;
    console.log(`Harvesting tobacco: dropping ${seedsDrop} seeds and ${tobaccoDrop} tobacco items`);
    for (let i = 0; i < seedsDrop; i++) {
      this.inventoryService.addItemToInventory({
        id: 4,
        name: 'Tobacco Seeds',
        type: 'tobacco-seeds',
        icon: '../../assets/icons/tobacco-seeds.png',
        stackable: true
      });
    }
    for (let i = 0; i < tobaccoDrop; i++) {
      this.inventoryService.addItemToInventory({
        id: 5,
        name: 'Tobacco',
        type: 'tobacco',
        icon: '../../assets/icons/tobacco.png',
        stackable: true
      });
    }
    tile.type = 'farmland';
    tile.growthStage = 0;
    console.log('Tobacco harvested. Tile reset to farmland.');
  }

  equipTool(slot: InventorySlot): void {
    if (slot && slot.item) {
      console.log('EquipTool called with item:', slot.item);
      const equippableTypes = ['shovel', 'watering-can', 'tobacco-seeds', 'ak47'];
      if (equippableTypes.includes(slot.item.type)) {
        this.gameState.equipItem(slot.item.type);
        this.interactionService.setEquippedItem(slot.item.type);
        console.log(`Equipped item: ${slot.item.name} (type: ${slot.item.type})`);
      } else {
        console.log(`${slot.item.name} is not recognized as equippable!`);
      }
    }
  }

  updateCamera() {
    this.cameraX = Math.max(0, Math.min(
      this.gameState.worldSize - this.visibleTilesX,
      Math.round(this.gameState.player.x - this.visibleTilesX / 2)
    ));
    this.cameraY = Math.max(0, Math.min(
      this.gameState.worldSize - this.visibleTilesY,
      Math.round(this.gameState.player.y - this.visibleTilesY / 2)
    ));
  }

  updateGameLoop(): void {
    // --- Calculate the player's current "claim" ---
    const px = Math.floor(this.gameState.player.x);
    const py = Math.floor(this.gameState.player.y);
    const influenceRadiusSq = 100 * 100; // 100 tiles radius
    let currentClaim: number | null = null;
    
    // Loop over all tent positions
    for (const tent of this.gameState.tentPositions) {
      const dx = px - tent.x;
      const dy = py - tent.y;
      if (dx * dx + dy * dy <= influenceRadiusSq) {
        if (currentClaim === null) {
          currentClaim = tent.faction;
        } else if (currentClaim !== tent.faction) {
          // More than one faction influences this tile
          currentClaim = -2; // Use -2 to denote a border area
          break;
        }
      }
    }
    // If no tent influences the area, mark it as wilderness (-1)
    if (currentClaim === null) {
      currentClaim = -1;
    }
  
    // Only update the zone message if the claim has changed
    if (currentClaim !== this.lastPlayerZone) {
      this.lastPlayerZone = currentClaim;
      let zoneText: string;
      if (currentClaim === -1) {
        zoneText = "Wilderness";
      } else if (currentClaim === -2) {
        zoneText = "Border";
      } else {
        zoneText = this.factionNames[currentClaim] || "Unknown";
      }
      this.zoneMessage = `Entering ${zoneText}'s zone`;
  
      // Clear previous timeout and remove the message after 3 seconds
      if (this.zoneMessageTimeout) clearTimeout(this.zoneMessageTimeout);
      this.zoneMessageTimeout = setTimeout(() => {
        this.zoneMessage = "";
      }, 3000);
    }
  
    // ... (continue with your existing update logic)
    this.combatService.setNpcs(this.npcService.npcs);
    this.combatService.updateBullets();
    this.npcService.updateNpcs();
    this.npcService.updateVisibleNPCs();
    this.npcService.updateVisibleGunsellerTables();
    this.npcService.spawnSmugglersAtTobaccoTables();
    this.npcService.npcs.forEach(npc => {
      if (npc.type === 'smuggler' && npc.smugglerState instanceof CombatState) {
        this.combatService.spawnBulletFromNpc(npc);
      }
    });
    this.npcService.spawnSoldiersAtTents();
    requestAnimationFrame(() => this.updateGameLoop());
  }  

  getBulletStyle(bullet: any) {
    return {
      position: 'absolute',
      left: `${(bullet.x - this.cameraX) * this.tileSize + this.tileSize / 2}px`,
      top: `${(bullet.y - this.cameraY) * this.tileSize + this.tileSize / 2}px`,
      width: "8px",
      height: "8px",
      backgroundColor: "black",
      borderRadius: "50%",
      zIndex: "110"
    };
  }

  getTileStyle(x: number, y: number) {
    return this.gameState.getTileStyle(x, y, this.cameraX, this.cameraY);
  }

  getPlayerStyle() {
    return this.gameState.getPlayerStyle(this.cameraX, this.cameraY);
  }
  

  onMouseDown(event: MouseEvent, index: number): void {
    event.preventDefault();
    if (event.which !== 1) return;
    this.initialMouseX = event.clientX;
    this.initialMouseY = event.clientY;
    this.isDragging = false;
    this.dragSourceIndex = index;
    const slot = this.inventoryService.inventorySlots[index];
    if (!slot.item) return;
    const targetElem = event.currentTarget as HTMLElement;
    const rect = targetElem.getBoundingClientRect();
    this.dragOffsetX = event.clientX - rect.left;
    this.dragOffsetY = event.clientY - rect.top;
    this.draggedStack = { item: slot.item, quantity: slot.quantity };
    // In your onMouseDown handler, after setting this.draggedStack:
    slot.item = null;
    slot.quantity = 0;
    this.dragGhostStyle = {
      position: 'fixed',
      left: `${event.clientX - this.dragOffsetX}px`,
      top: `${event.clientY - this.dragOffsetY}px`,
      pointerEvents: 'none',
      opacity: '1',
      zIndex: '10000',
      width: '64px',
      height: '64px',
      border: '2px dashed red',
      backgroundColor: 'rgba(255, 255, 255, 0.5)'
    };
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.draggedStack) return;
    const dx = event.clientX - this.initialMouseX;
    const dy = event.clientY - this.initialMouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (!this.isDragging && distance > this.dragThreshold) {
      this.isDragging = true;
    }
    this.dragGhostStyle['left'] = `${event.clientX - this.dragOffsetX}px`;
    this.dragGhostStyle['top'] = `${event.clientY - this.dragOffsetY}px`;
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {

    if (!this.draggedStack || event.which !== 1) return;

    // In your onMouseUp handler in map.component.ts, replace all duplicate trade-slot code with this:
if (this.showTradeHUD && (event.target as HTMLElement).closest('.trade-slot')) {
  console.log("Trade slot drop detected. Current mode:", this.currentTradeMode, "Dragged item type:", this.draggedStack.item.type);
  if (this.currentTradeMode === 'sellTobacco' && this.draggedStack.item.type !== 'tobacco') {
    console.log("Only tobacco can be placed in the trade slot for selling.");
    this.returnDraggedItem();
    return;
  }
  if (this.currentTradeMode === 'buyAmmo' && this.draggedStack.item.type !== 'coin') {
    console.log("Only coins can be placed in the trade slot for buying ammo.");
    this.returnDraggedItem();
    return;
  }
  if (!this.tradeSlot.item) {
    this.tradeSlot.item = { ...this.draggedStack.item };
    this.tradeSlot.quantity = this.draggedStack.quantity;
  } else if (this.tradeSlot.item.id === this.draggedStack.item.id) {
    this.tradeSlot.quantity += this.draggedStack.quantity;
  }
  console.log(`Dropped ${this.draggedStack.quantity} ${this.draggedStack.item.type} into the trade slot.`);
  this.clearDragState();
  return;
}


    if (!this.draggedStack || event.which !== 1) return;
    if (!this.isDragging) {
      const slot = this.inventoryService.inventorySlots[this.dragSourceIndex];
      if (slot) {
        slot.item = { ...this.draggedStack.item };
        slot.quantity = this.draggedStack.quantity;
        this.equipTool(slot);
      }
      this.clearDragState();
      return;
    }
    const dropElem = document.elementFromPoint(event.clientX, event.clientY);
    let targetIndex: number | null = null;
    if (dropElem) {
      const slotElem = (dropElem as HTMLElement).closest('.inventory-slot');
      if (slotElem && slotElem.hasAttribute('data-index')) {
        targetIndex = parseInt(slotElem.getAttribute('data-index')!, 10);
      }
    }
    if (targetIndex === this.dragSourceIndex) {
      const sourceSlot = this.inventoryService.inventorySlots[this.dragSourceIndex];
      if (!sourceSlot.item) {
        sourceSlot.item = { ...this.draggedStack.item };
        sourceSlot.quantity = this.draggedStack.quantity;
      } else if (sourceSlot.item.id === this.draggedStack.item.id && sourceSlot.item.stackable) {
        sourceSlot.quantity += this.draggedStack.quantity;
      }
      this.clearDragState();
      this.inventoryService.inventorySlots = [...this.inventoryService.inventorySlots];
      return;
    }
    if (targetIndex !== null) {
      const targetSlot = this.inventoryService.inventorySlots[targetIndex];
      if (!targetSlot.item) {
        targetSlot.item = { ...this.draggedStack.item };
        targetSlot.quantity = this.draggedStack.quantity;
      } else if (targetSlot.item.id === this.draggedStack.item.id && targetSlot.item.stackable) {
        targetSlot.quantity += this.draggedStack.quantity;
      } else {
        const sourceSlot = this.inventoryService.inventorySlots[this.dragSourceIndex];
        const tempItem = targetSlot.item;
        const tempQty = targetSlot.quantity;
        targetSlot.item = { ...this.draggedStack.item };
        targetSlot.quantity = this.draggedStack.quantity;
        sourceSlot.item = tempItem;
        sourceSlot.quantity = tempQty;
      }
      this.clearDragState();
    } else {
      const sourceSlot = this.inventoryService.inventorySlots[this.dragSourceIndex];
      if (!sourceSlot.item) {
        sourceSlot.item = { ...this.draggedStack.item };
        sourceSlot.quantity = this.draggedStack.quantity;
      } else if (sourceSlot.item.id === this.draggedStack.item.id && sourceSlot.item.stackable) {
        sourceSlot.quantity += this.draggedStack.quantity;
      } else {
        const emptySlot = this.inventoryService.inventorySlots.find(slot => slot.item === null);
        if (emptySlot) {
          emptySlot.item = { ...this.draggedStack.item };
          emptySlot.quantity = this.draggedStack.quantity;
        }
      }
      this.clearDragState();
    }
    this.inventoryService.inventorySlots = [...this.inventoryService.inventorySlots];
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.draggedStack) return;
    if (event.which === 3) {
      const dropElem = document.elementFromPoint(event.clientX, event.clientY);
      let targetIndex: number | null = null;
      if (dropElem) {
        const slotElem = (dropElem as HTMLElement).closest('.inventory-slot');
        if (slotElem && slotElem.hasAttribute('data-index')) {
          targetIndex = parseInt(slotElem.getAttribute('data-index')!, 10);
        }
      }
      if (targetIndex !== null) {
        const targetSlot = this.inventoryService.inventorySlots[targetIndex];
        if (!targetSlot.item) {
          targetSlot.item = { ...this.draggedStack.item };
          targetSlot.quantity = 1;
        } else if (targetSlot.item.id === this.draggedStack.item.id && targetSlot.item.stackable) {
          targetSlot.quantity += 1;
        }
        this.draggedStack.quantity -= 1;
        if (this.draggedStack.quantity <= 0) {
          this.clearDragState();
        }
        this.inventoryService.inventorySlots = [...this.inventoryService.inventorySlots];
      }
      event.preventDefault();
      event.stopPropagation();
    }
  }

  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  private clearDragState(): void {
    this.draggedStack = null;
    this.dragSourceIndex = -1;
    this.dragButton = null;
    this.isDragging = false;
  }

  trackBySlot(index: number, slot: any): number {
    return slot.id;
  }

  handleItemClick(index: number) {
    console.log(`Clicked slot: ${index}, Selected slot: ${this.selectedSlotIndex}`);
    const clickedSlot = this.inventoryService.inventorySlots[index];
    if (this.selectedSlotIndex === null && clickedSlot.item) {
      this.selectedSlotIndex = index;
      console.log(`Selected item at slot: ${index}`);
      return;
    }
    if (this.selectedSlotIndex === index) {
      this.selectedSlotIndex = null;
      console.log("Deselected item.");
      return;
    }
    if (this.selectedSlotIndex !== null) {
      const selectedSlot = this.inventoryService.inventorySlots[this.selectedSlotIndex];
      if (!clickedSlot.item) {
        clickedSlot.item = selectedSlot.item;
        clickedSlot.quantity = selectedSlot.quantity;
        selectedSlot.item = null;
        selectedSlot.quantity = 0;
      } else {
        [selectedSlot.item, clickedSlot.item] = [clickedSlot.item, selectedSlot.item];
        [selectedSlot.quantity, clickedSlot.quantity] = [clickedSlot.quantity, selectedSlot.quantity];
      }
      this.selectedSlotIndex = null;
      this.inventoryService.inventorySlots = [...this.inventoryService.inventorySlots];
      console.log("Swap successful!");
    }
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    if (this.inventoryOpen) {
      this.inventoryService.expandInventory(30);
    } else {
      this.inventoryService.resetInventory();
    }
  }

  getNpcStyle(npc: NPC): any {
    // --- SOLDIER STYLE ---
    if (npc.type === 'soldier') {
      const soldierScale = 1.3;         // Soldier-specific scale factor
      const baseSize = 128;             // Base tile size in your assets
      const displaySize = baseSize * soldierScale;  // Size of one quadrant (e.g. ~166px)
      const sheetSize = displaySize * 2;            // Full spritesheet size (e.g. ~332px)
      let backgroundPosition = '';
      
      // Map directions to quadrants:
      switch (npc.direction) {
        case 'left':
          backgroundPosition = `-${displaySize}px 0px`;                          // Top-left quadrant (moving left)
          break;
        case 'right':
          backgroundPosition = `0px 0px`;            // Top-right quadrant (moving right)
          break;
        case 'up':
          backgroundPosition = `0px -${displaySize}px`;            // Bottom-left quadrant (moving up)
          break;
        case 'down':
          backgroundPosition = `-${displaySize}px -${displaySize}px`; // Bottom-right quadrant (moving down)
          break;
        default:
          backgroundPosition = '0px 0px';
      }
      
      // Determine soldier sprite based on faction.
      const factionNames = ['ak', 'coin', 'sword', 'tobacco', 'wolf'];
      let factionName = 'default';
      if (npc.faction !== undefined && npc.faction < factionNames.length) {
        factionName = factionNames[npc.faction];
      }
      const spriteUrl = `url('../../assets/sprites/soldier-${factionName}-spritesheet.png')`;
      
      return {
        width: '100%',
        height: '100%',
        backgroundImage: spriteUrl,
        backgroundSize: `${sheetSize}px ${sheetSize}px`,
        backgroundPosition,
        pointerEvents: 'none'
      };
    }
    
    // --- WARLORD STYLE ---
    if (npc.type === 'warlord') {
      const warlordScale = 2;
      const baseSize = 128;
      const displaySize = baseSize * warlordScale;
      let backgroundPosition = '';
      switch (npc.direction) {
        case 'right':
          backgroundPosition = '0px 0px';
          break;
        case 'up':
          backgroundPosition = `0px -${displaySize}px`;
          break;
        case 'down':
          backgroundPosition = `-${displaySize}px -${displaySize}px`;
          break;
        case 'left':
          backgroundPosition = `-${displaySize}px 0px`;
          break;
        default:
          backgroundPosition = '0px 0px';
      }
      return {
        width: '100%',
        height: '100%',
        backgroundImage: `url(${npc.sprite})`,
        backgroundSize: `${displaySize * 2}px ${displaySize * 2}px`,
        backgroundPosition,
        pointerEvents: 'none'
      };
    }
    
    // --- OTHER NPCs (smuggler, gunSeller, villager, etc.) ---
    const scale = 1.5;
    const cellSize = 128 * scale;
    let backgroundPosition = '';
    switch (npc.direction) {
      case 'left': backgroundPosition = '0px 0px'; break;
      case 'right': backgroundPosition = `-${cellSize}px 0px`; break;
      case 'up':
        backgroundPosition = npc.animationFrame === 0 
          ? `0px -${cellSize}px` 
          : `-${cellSize}px -${cellSize}px`;
        break;
      case 'down': backgroundPosition = '0px 0px'; break;
      default: backgroundPosition = '0px 0px';
    }
    
    let spriteUrl = "";
    if (npc.type === 'smuggler') {
      spriteUrl = (npc.smugglerState instanceof CombatState)
        ? "url('../../assets/sprites/smuggler-gun-spritesheet.png')"
        : "url('../../assets/sprites/smuggler-spritesheet.png')";
    } else if (npc.type === 'gunSeller') {
      spriteUrl = "url('../../assets/sprites/gun-seller-spritesheet.png')";
    } else if (npc.type === 'villager') {
      spriteUrl = "url('../../assets/sprites/villager-spritesheet.png')";
    } else {
      spriteUrl = "url('../../assets/sprites/default-npc.png')";
    }
    
    return {
      width: '100%',
      height: '100%',
      backgroundImage: spriteUrl,
      backgroundSize: `${256 * scale}px ${256 * scale}px`,
      backgroundPosition,
      pointerEvents: 'none'
    };
  }  
    
  getNpcContainerStyle(npc: NPC) {
    // --- SOLDIER CONTAINER STYLE ---
    if (npc.type === 'soldier') {
      const soldierScale = 1.3; // Same as above
      const npcSize = this.tileSize * soldierScale; // e.g. 128 * 1.3 ≈ 166px
      // For soldiers, we assume their feet are at the bottom of the quadrant,
      // so we set the container size exactly to npcSize.
      return {
        position: 'absolute',
        left: `${(npc.x - this.cameraX) * this.tileSize}px`,
        top: `${(npc.y - this.cameraY) * this.tileSize}px`,
        width: `${npcSize}px`,
        height: `${npcSize}px`,
        zIndex: 50
      };
    }
    
    // --- WARLORD CONTAINER STYLE ---
    if (npc.type === 'warlord') {
      const warlordScale = 2;
      const npcWidth = this.tileSize * warlordScale;  // e.g. 256px if tileSize=128
      const npcHeight = this.tileSize * warlordScale;
      const offsetY = npcHeight - this.tileSize; // align soldier's feet with the tile bottom
      return {
        position: 'absolute',
        left: `${(npc.x - this.cameraX) * this.tileSize}px`,
        top: `${(npc.y - this.cameraY) * this.tileSize - offsetY}px`,
        width: `${npcWidth}px`,
        height: `${npcHeight}px`,
        zIndex: 50
      };
    }
    
    // --- OTHER NPCs (default) ---
    const scaleWidth = 1.5;
    const scaleHeight = 1.8;
    const npcWidth = this.tileSize * scaleWidth;
    const npcHeight = this.tileSize * scaleHeight;
    const offsetX = (npcWidth - this.tileSize) / 2;
    const offsetY = npcHeight - this.tileSize;
    return {
      position: 'absolute',
      left: `${(npc.x - this.cameraX) * this.tileSize - offsetX}px`,
      top: `${(npc.y - this.cameraY) * this.tileSize - offsetY}px`,
      width: `${npcWidth}px`,
      height: `${npcHeight}px`,
      zIndex: 50
    };
  }  
    
  getNpcHealthStyle(npc: NPC) {
    const healthPercent = npc.health ?? 100;
    return {
      width: `${healthPercent}%`
    };
  }
  
// Getter for trade value (each tobacco unit gives 10 coins)
get tradeValue(): number {
  return (this.tradeSlot.item && this.tradeSlot.item.type === 'tobacco') 
         ? this.tradeSlot.quantity * 10 
         : 0;
}

doTrade(): void {
  if (this.currentTradeMode === 'sellTobacco') {
    this.sellTobacco();
  } else if (this.currentTradeMode === 'buyAmmo') {
    this.doTradeAmmo();
  }
}

// Example: You can use the following if you prefer native events:
onTradeDragOver(event: DragEvent): void {
  event.preventDefault();
}

// In your onTradeDrop method (map.component.ts), ensure it's defined as follows:
onTradeDrop(event: DragEvent): void {
  event.preventDefault();
  if (!this.draggedStack) return;
  console.log("onTradeDrop - Current mode:", this.currentTradeMode, "Dragged item:", this.draggedStack.item);
  if (this.currentTradeMode === 'sellTobacco' && this.draggedStack.item.type !== 'tobacco') {
    console.log("Only tobacco can be placed in the trade slot for selling.");
    this.returnDraggedItem();
    return;
  }
  if (this.currentTradeMode === 'buyAmmo' && this.draggedStack.item.type !== 'coin') {
    console.log("Only coins can be placed in the trade slot for buying ammo.");
    this.returnDraggedItem();
    return;
  }
  if (!this.tradeSlot.item) {
    this.tradeSlot.item = { ...this.draggedStack.item };
    this.tradeSlot.quantity = this.draggedStack.quantity;
  } else if (this.tradeSlot.item.id === this.draggedStack.item.id) {
    this.tradeSlot.quantity += this.draggedStack.quantity;
  }
  console.log(`Dropped ${this.draggedStack.quantity} ${this.draggedStack.item.type} into the trade slot.`);
  this.clearDragState();
}


// For testing, modify getNearbyTrader() if needed (unchanged otherwise)
getNearbyTrader(): NPC | null {
  const range = 1.5; // increase for testing
  const playerX = this.gameState.player.x;
  const playerY = this.gameState.player.y;
  console.log(`Checking for trader near (${playerX}, ${playerY}) with range ${range}`);
  
  const trader = this.npcService.npcs.find(npc => {
    console.log(`NPC: ${npc.name || npc.type} at (${npc.x}, ${npc.y})`);
    return npc.type === 'villager' &&
      Math.abs(npc.x - playerX) <= range &&
      Math.abs(npc.y - playerY) <= range;
  });
  if (trader) {
    console.log("Found trader:", trader);
  } else {
    console.log("No trader found nearby.");
  }
  return trader || null;
}

sellTobacco(): void {
  // Sum up tobacco from the tradeSlot
  const totalTobacco = this.tradeSlot.quantity;
  const coinsEarned = totalTobacco * 10; // example rate
  // For each unit of tobacco, add a coin item to inventory.
  for (let i = 0; i < coinsEarned; i++) {
    this.inventoryService.addItemToInventory({
      id: 100, // ensure a unique ID for coins
      name: 'Coin',
      type: 'coin',
      icon: '../../assets/icons/coin.png',
      stackable: true
    });
  }
  console.log(`Sold ${totalTobacco} tobacco for ${coinsEarned} coins.`);
  this.clearTradeSlot();
  this.closeTrade();
}

doTradeAmmo(): void {
  // Sum up coins from the tradeSlot
  const totalCoins = this.tradeSlot.quantity;
  const ammoReceived = totalCoins * 3; // example: each coin buys 15 ammo
  // Clear the trade slot
  this.clearTradeSlot();
  // Add ammo to the inventory; here we loop for simplicity.
  for (let i = 0; i < ammoReceived; i++) {
    this.inventoryService.addItemToInventory({
      id: 7, // ensure a unique ID for ammo
      name: 'Ammo',
      type: 'ammo',
      icon: '../../assets/icons/ammo.png',
      stackable: true
    });
  }
  console.log(`Traded ${totalCoins} coins for ${ammoReceived} ammo.`);
  this.closeTrade();
}

returnDraggedItem(): void {
  const sourceSlot = this.inventoryService.inventorySlots[this.dragSourceIndex];
  if (sourceSlot) {
    sourceSlot.item = { ...this.draggedStack!.item };
    sourceSlot.quantity = this.draggedStack!.quantity;
  }
  this.clearDragState();
}

clearTradeSlot(): void {
  // Simply reset the trade slot so that no tobacco remains.
  this.tradeSlot.item = null;
  this.tradeSlot.quantity = 0;
}

closeTrade(): void {
  // When closing after a trade, we do not return leftover items.
  this.showTradeHUD = false;
  this.currentTrader = null;
  // (If you want a cancel action to return items, you could add a separate cancelTrade() method.)
}

onNpcClick(npc: NPC, event: MouseEvent): void {
  event.stopPropagation();
  // Set trade mode based on NPC type
  if (npc.type === 'villager') {
    this.currentTradeMode = 'sellTobacco';
  } else if (npc.type === 'gunSeller') {
    this.currentTradeMode = 'buyAmmo';
  }
  this.showTradeHUD = true;
  this.currentTrader = npc;
  console.log(`Opened trade HUD with ${npc.name || npc.type} in mode ${this.currentTradeMode}`);
}

getPlayerHealthStyle(): any {
  const healthPercent = this.gameState.player.health || 100;
  return {
    width: `${healthPercent}%`,
    height: '5px',
    backgroundColor: 'green',
    position: 'absolute',
    bottom: '0',
    left: '0'
  };
}

  // For example, we simulate an NPC reply.
  sendChatMessage(): void {
    if (this.chatInput.trim().length > 0) {
      this.chatMessages.push({ sender: 'Player', text: this.chatInput });
      if (this.npcService.npcs.length > 0) {
        const randomNPC = this.npcService.npcs[Math.floor(Math.random() * this.npcService.npcs.length)];
        const npcType = randomNPC.type;
        const npcName = randomNPC.name || (npcType.charAt(0).toUpperCase() + npcType.slice(1));
        const npcTypeFormatted = npcType.charAt(0).toUpperCase() + npcType.slice(1);
        this.http.post('http://localhost:5000/chat', {
          npcType: npcTypeFormatted,
          userInput: this.chatInput
        }).subscribe({
          next: (response: any) => {
            this.chatMessages.push({ sender: npcName, text: response.reply });
          },
          error: (err) => {
            console.error(`Error: ${err.message}`);
            this.chatMessages.push({ sender: npcName, text: "I’m malfunctioning—sorry!" });
          }
        });
      }
      this.chatInput = "";
    }
  }
}

