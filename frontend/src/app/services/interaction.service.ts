import { Injectable } from '@angular/core';

/**
 * Represents a tile in the game world.
 */
export interface Tile {
  type: string;
  growthStage?: number;
}

/**
 * Context provided to each interaction handler.
 */
export interface InteractionContext {
  inventory?: {
    removeItem: (itemType: string, quantity: number) => boolean;
  };
}

/**
 * Interface that all interaction handlers must implement.
 */
export interface InteractionHandler {
  execute(tile: Tile, context: InteractionContext): void;
}

/**
 * ShovelHandler: Converts grass to dirt.
 */
export class ShovelHandler implements InteractionHandler {
  execute(tile: Tile, context: InteractionContext): void {
    if (tile.type === 'grass') {
      tile.type = 'dirt';
      tile.growthStage = 0;
      console.log("Shovel used: Grass converted to Dirt");
    } else {
      console.warn("Shovel can only be used on grass tiles");
    }
  }
}

/**
 * WateringCanHandler: Converts dirt to farmland.
 */
export class WateringCanHandler implements InteractionHandler {
  execute(tile: Tile, context: InteractionContext): void {
    if (tile.type === 'dirt') {
      tile.type = 'farmland';
      tile.growthStage = 0;
      console.log("Watering can used: Dirt converted to Farmland");
    } else {
      console.warn("Watering can can only be used on dirt tiles");
    }
  }
}

/**
 * TobaccoSeedsHandler:
 * - Checks for farmland.
 * - Removes one tobacco seed from inventory.
 * - Plants tobacco and schedules its growth.
 */
export class TobaccoSeedsHandler implements InteractionHandler {
  execute(tile: Tile, context: InteractionContext): void {
    if (tile.type === 'farmland') {
      if (context.inventory && context.inventory.removeItem('tobacco-seeds', 1)) {
        // Plant tobacco: set type to 'tobacco-1'
        tile.type = 'tobacco-1';
        tile.growthStage = 1;
        console.log("Tobacco planted: phase 1 (tobacco-1.png)");

        // After 10 seconds, update to phase 2 (tobacco-2.png)
        setTimeout(() => {
          tile.type = 'tobacco-2';
          tile.growthStage = 2;
          console.log("Tobacco growth: phase 2 (tobacco-2.png)");
        }, 10000);

        // After 20 seconds, update to phase 3 (tobacco-3.png)
        setTimeout(() => {
          tile.type = 'tobacco-3';
          tile.growthStage = 3;
          console.log("Tobacco growth: phase 3 (tobacco-3.png, ready for harvest)");
        }, 20000);
      } else {
        console.warn("Not enough tobacco seeds in inventory");
      }
    } else {
      console.warn("Tobacco seeds can only be used on farmland");
    }
  }
}

/**
 * The unified InteractionService.
 */
@Injectable({
  providedIn: 'root'
})
export class InteractionService {
  private handlers: { [key: string]: InteractionHandler } = {};
  private currentItem: string = '';

  constructor() {
    this.registerHandler('shovel', new ShovelHandler());
    this.registerHandler('watering-can', new WateringCanHandler());
    this.registerHandler('tobacco-seeds', new TobaccoSeedsHandler());
    // Register additional handlers as needed.
  }

  registerHandler(itemType: string, handler: InteractionHandler): void {
    this.handlers[itemType] = handler;
  }

  setEquippedItem(itemType: string): void {
    this.currentItem = itemType;
    console.log(`Equipped item set to: ${itemType}`);
  }

  handleInteraction(tile: Tile, context: InteractionContext): void {
    const handler = this.handlers[this.currentItem];
    if (handler) {
      handler.execute(tile, context);
    } else {
      console.warn(`No interaction handler registered for: ${this.currentItem}`);
    }
  }
}
