import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../services/game-state.service';
import { CombatService } from '../services/combat.service';
import { InventoryService } from '../services/inventory.service';
import { InteractionService, Tile, InteractionContext } from '../services/interaction.service';

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

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  // Injected services
  gameState = inject(GameStateService);
  combatService = inject(CombatService);
  inventoryService = inject(InventoryService);
  interactionService = inject(InteractionService);

  // Map and camera properties
  tileSize = 128;
  cameraX = 0;
  cameraY = 0;
  visibleTilesX = 0;
  visibleTilesY = 0;
  inventoryOpen: boolean = false;

  // Drag & Drop state
  draggedStack: DraggedStack | null = null;
  dragSourceIndex: number = -1; // Use -1 when no valid index
  dragButton: number | null = null;
  dragGhostStyle: { [key: string]: string } = {};
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;

  // New properties for distinguishing click vs. drag:
  initialMouseX: number = 0;
  initialMouseY: number = 0;
  isDragging: boolean = false;
  readonly dragThreshold: number = 5; // pixels threshold

  // Exposed getters for template use.
  get money() { return this.gameState.player.money; }
  get showHUD() { return this.gameState.showHUD; }
  get inventoryItems() { return this.inventoryService.inventorySlots; }

  // For equipment selection.
  selectedSlotIndex: number | null = null;

  // ---------------
  // Lifecycle Methods
  // ---------------
  ngOnInit() {
    this.updateCamera();
    this.setVisibleTiles();
    this.updateGameLoop();
  }

  @HostListener('window:resize')
  setVisibleTiles() {
    this.visibleTilesX = Math.ceil(window.innerWidth / this.tileSize);
    this.visibleTilesY = Math.ceil(window.innerHeight / this.tileSize);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    let dx = 0, dy = 0;
    switch (event.key) {
      case 'w': dx = 0; dy = -0.5; break;
      case 's': dx = 0; dy = 0.5; break;
      case 'a': dx = -0.5; dy = 0; break;
      case 'd': dx = 0.5; dy = 0; break;
      case 'f':
        this.combatService.fireBullet();
        this.gameState.updatePlayerAnimation(0, 0, true);
        return;
      case 'e':
        this.toggleInventory();
        break;
    }
    if (dx !== 0 || dy !== 0) {
      this.gameState.movePlayer(dx, dy);
    }
    this.updateCamera();
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
  // Calculate tile coordinates based on camera position.
  const tileX = Math.floor((event.clientX / this.tileSize) + this.cameraX);
  const tileY = Math.floor((event.clientY / this.tileSize) + this.cameraY);

  // Ensure the clicked tile is within the bounds of the map.
  if (
    tileY < 0 ||
    tileY >= this.gameState.map.length ||
    tileX < 0 ||
    tileX >= this.gameState.map[0].length
  ) {
    console.warn('Clicked tile is out of bounds:', tileX, tileY);
    return;
  }

  // Retrieve the tile.
  const tile: Tile = this.gameState.map[tileY][tileX];

  // If the tile is a fully grown tobacco plant, harvest it.
  if (tile.type === 'tobacco-3') {
    this.harvestTobacco(tile);
    return;
  }

  // If using a weapon, fire bullet.
  if (this.gameState.currentItem === 'ak47') {
    this.combatService.fireBullet();
  } else {
    // Build the interaction context.
    const context: InteractionContext = {
      inventory: {
        removeItem: (itemType: string, quantity: number) => {
          return this.inventoryService.removeItem(itemType, quantity);
        }
      }
    };
    // Delegate the tile interaction to the InteractionService.
    this.interactionService.handleInteraction(tile, context);
  }
}

harvestTobacco(tile: Tile): void {
  // Generate random drops: random integer from 3 to 5.
  const seedsDrop = Math.floor(Math.random() * 3) + 3;    // 3, 4, or 5 seeds.
  const tobaccoDrop = Math.floor(Math.random() * 3) + 3;    // 3, 4, or 5 tobacco items.

  console.log(`Harvesting tobacco: dropping ${seedsDrop} seeds and ${tobaccoDrop} tobacco items`);

  // Add the drops to the inventory.
  // Ensure that the items you add match your InventoryService definitions.
  for (let i = 0; i < seedsDrop; i++) {
    this.inventoryService.addItemToInventory({
      id: 4,  // Ensure this id doesn't conflict with other items.
      name: 'Tobacco Seeds',
      type: 'tobacco-seeds',
      icon: '../../assets/icons/tobacco-seeds.png',
      stackable: true
    });
  }
  for (let i = 0; i < tobaccoDrop; i++) {
    this.inventoryService.addItemToInventory({
      id: 5,  // New id for the harvested tobacco item.
      name: 'Tobacco',
      type: 'tobacco',
      icon: '../../assets/icons/tobacco.png',
      stackable: true
    });
  }

  // Reset the tile after harvest. For example, revert it to farmland.
  tile.type = 'farmland';
  tile.growthStage = 0;
  console.log('Tobacco harvested. Tile reset to farmland.');
}



  // Equip tool method, used from onMouseUp if no drag occurred.
  equipTool(slot: InventorySlot): void {
    if (slot && slot.item) {
      console.log('EquipTool called with item:', slot.item);
      const toolTypes = ['shovel', 'watering-can', 'tobacco-seeds'];
      if (toolTypes.includes(slot.item.type)) {
        this.gameState.equipItem(slot.item.type);
        this.interactionService.setEquippedItem(slot.item.type);
        console.log(`Equipped tool: ${slot.item.name} (type: ${slot.item.type})`);
      } else {
        console.log(`${slot.item.name} is not recognized as a tool!`);
      }
    }
  }

  // ---------------
  // Update Methods
  // ---------------
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

  updateGameLoop() {
    this.combatService.updateBullets();
    this.combatService.updateEnemies();
    requestAnimationFrame(() => this.updateGameLoop());
  }

  // ---------------
  // Style Getter Methods
  // ---------------
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

  getEnemyStyle(enemy: any) {
    return {
      position: 'absolute',
      left: `${(enemy.x - this.cameraX) * this.tileSize}px`,
      top: `${(enemy.y - this.cameraY) * this.tileSize}px`,
      width: "128px",
      height: "128px",
      backgroundImage: "url('assets/sprites/enemy.png')",
      backgroundSize: "cover",
      zIndex: '99'
    };
  }

  // ---------------
  // Inventory & Equipment Methods (including drag & drop)
  // ---------------
  // Note: Removed (click)="equipTool(slot)" from template so we handle equipping in onMouseUp if no drag occurred.

  onMouseDown(event: MouseEvent, index: number): void {
    event.preventDefault();
    if (event.which !== 1) return;
    // Record initial mouse position.
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
    // Remove item from inventory.
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
    // Check if movement exceeds threshold.
    const dx = event.clientX - this.initialMouseX;
    const dy = event.clientY - this.initialMouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (!this.isDragging && distance > this.dragThreshold) {
      this.isDragging = true;
    }
    // Update ghost element position.
    this.dragGhostStyle['left'] = `${event.clientX - this.dragOffsetX}px`;
    this.dragGhostStyle['top'] = `${event.clientY - this.dragOffsetY}px`;
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (!this.draggedStack || event.which !== 1) return;
    // If no drag occurred, treat as a click and equip.
    if (!this.isDragging) {
      const slot = this.inventoryService.inventorySlots[this.dragSourceIndex];
      if (slot) {
        // Place the item back into the slot.
        slot.item = { ...this.draggedStack.item };
        slot.quantity = this.draggedStack.quantity;
        // Equip the tool.
        this.equipTool(slot);
      }
      this.clearDragState();
      return;
    }
    // Otherwise, proceed with existing drag/drop logic.
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

  // ---------------
  // Existing Inventory & Equipment Methods
  // ---------------
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
      this.inventoryService.expandInventory(30); // Adds 30 slots.
    } else {
      this.inventoryService.resetInventory(); // Resets to base slots.
    }
  }
}
