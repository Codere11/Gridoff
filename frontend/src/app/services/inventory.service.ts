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
  baseInventorySlots: InventorySlot[] = new Array(10).fill({}).map((_, i) => ({ id: i, item: null, quantity: 0 }));
  extraInventorySlots: InventorySlot[] = [];

  inventorySlots: InventorySlot[] = [
    { id: 0, item: { id: 1, name: 'AK-47', type: 'ak47', icon: '../../assets/weapons/ak.png', stackable: false }, quantity: 1 },
    { id: 1, item: { id: 2, name: 'shovel', type: 'shovel', icon: '../../assets/icons/shovel.png', stackable: false }, quantity: 1 },
    { id: 2, item: { id: 3, name: 'watering-an', type: 'watering-can', icon: '../../assets/icons/watering-can.png', stackable: false }, quantity: 1 },
    { id: 3, item: { id: 4, name: 'tobacco-seeds', type: 'tobacco-seeds', icon: '../../assets/icons/tobacco-seeds.png', stackable: true }, quantity: 10 },
    { id: 5, item: null, quantity: 0 },
    { id: 6, item: null, quantity: 0 },
    { id: 7, item: null, quantity: 0 },
    { id: 8, item: null, quantity: 0 },
    { id: 9, item: null, quantity: 0 }
  ];

  expandInventory(extraSlots: number) {
    const currentTotal = this.inventorySlots.length + this.extraInventorySlots.length;
    if (currentTotal < this.inventorySlots.length + extraSlots) {
      const missing = (this.inventorySlots.length + extraSlots) - currentTotal;
      this.extraInventorySlots = [
        ...this.extraInventorySlots,
        ...Array.from({ length: missing }, (_, i) => ({
          id: currentTotal + i,
          item: null,
          quantity: 0
        }))
      ];
    }
    this.inventorySlots = [...this.inventorySlots, ...this.extraInventorySlots];
  }

  resetInventory() {
    this.baseInventorySlots = this.inventorySlots.slice(0, 10);
    this.inventorySlots = [...this.baseInventorySlots];
  }

  addItemToInventory(newItem: Item) {
    if (newItem.stackable) {
      const existing = this.inventorySlots.find(slot => slot.item?.id === newItem.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        const empty = this.inventorySlots.find(slot => slot.item === null);
        if (empty) {
          empty.item = { ...newItem };
          empty.quantity = 1;
        } else {
          console.log("Inventory full!");
        }
      }
    } else {
      const empty = this.inventorySlots.find(slot => slot.item === null);
      if (empty) {
        empty.item = { ...newItem };
        empty.quantity = 1;
      } else {
        console.log("Inventory full!");
      }
    }
  }

  // New method for removing items
  removeItem(itemType: string, quantity: number): boolean {
    const slot = this.inventorySlots.find(slot => slot.item && slot.item.type === itemType);
    if (slot && slot.quantity >= quantity) {
      slot.quantity -= quantity;
      if (slot.quantity === 0) {
        slot.item = null;
      }
      this.inventorySlots = [...this.inventorySlots]; // trigger change detection if needed
      return true;
    }
    return false;
  }
}