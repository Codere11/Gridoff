import { Injectable } from '@angular/core';

export interface Item {
  id: number;
  name: string;
  type: string;
  icon: string;
  stackable: boolean;
}

export interface InventorySlot {
  id: number;
  item: Item | null;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  baseInventorySlots: InventorySlot[] = new Array(10).fill({});
  extraInventorySlots: InventorySlot[] = []; // Starts empty


  inventorySlots: InventorySlot[] = [
    { id: 0, item: { id: 1, name: 'AK-47', type: 'ak47', icon: '../../assets/weapons/ak.png', stackable: false }, quantity: 1 },
    { id: 1, item: { id: 2, name: 'Shovel', type: 'shovel', icon: '../../assets/icons/shovel.png', stackable: false }, quantity: 1 },
    { id: 2, item: { id: 3, name: 'Watering Can', type: 'watering-can', icon: '../../assets/icons/watering-can.png', stackable: false }, quantity: 1 },
    { id: 3, item: { id: 4, name: 'Tobacco Seeds', type: 'tobacco-seeds', icon: '../../assets/icons/tobacco-seeds.png', stackable: true }, quantity: 10 },
    { id: 4, item: null, quantity: 0 },
    { id: 5, item: null, quantity: 0 },
    { id: 6, item: null, quantity: 0 },
    { id: 7, item: null, quantity: 0 },
    { id: 8, item: null, quantity: 0 },
    { id: 9, item: null, quantity: 0 }
  ];

  expandInventory(extraSlots: number) {
    const currentTotalSlots = this.inventorySlots.length + this.extraInventorySlots.length;
    
    if (currentTotalSlots < this.inventorySlots.length + extraSlots) {
        const missingSlots = (this.inventorySlots.length + extraSlots) - currentTotalSlots;
        
        this.extraInventorySlots = [
            ...this.extraInventorySlots,
            ...Array.from({ length: missingSlots }, (_, i) => ({
                id: currentTotalSlots + i,
                item: null,
                quantity: 0
            }))
        ];
    }

    this.inventorySlots = [...this.inventorySlots, ...this.extraInventorySlots];
}




resetInventory() {
  // ✅ Preserve existing items in base inventory slots
  this.baseInventorySlots = this.inventorySlots.slice(0, 10); 

  // ✅ Remove only extra slots
  this.extraInventorySlots = [];

  // ✅ Update `inventorySlots` to reflect only the base inventory
  this.inventorySlots = [...this.baseInventorySlots];
}

addItemToInventory(newItem: Item) {
  // Check if the item is stackable
  if (newItem.stackable) {
    const existingSlot = this.inventorySlots.find(slot => slot.item?.id === newItem.id);

    if (existingSlot) {
      existingSlot.quantity += 1;  // ✅ Increase stack
    } else {
      // Find an empty slot
      const emptySlot = this.inventorySlots.find(slot => slot.item === null);
      if (emptySlot) {
        emptySlot.item = { ...newItem };
        emptySlot.quantity = 1;  // ✅ Initialize quantity
      } else {
        console.log("Inventory full!");
      }
    }
  } else {
    // Normal (non-stackable) item handling
    const emptySlot = this.inventorySlots.find(slot => slot.item === null);
    if (emptySlot) {
      emptySlot.item = { ...newItem };
      emptySlot.quantity = 1;  // ✅ Even non-stackable items should have quantity
    } else {
      console.log("Inventory full!");
    }
  }
}


}