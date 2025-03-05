import { InteractionHandler, InteractionContext, Tile } from '../services/interaction.service';

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

export class TobaccoSeedsHandler implements InteractionHandler {
  execute(tile: Tile, context: InteractionContext): void {
    if (tile.type === 'farmland') {
      if (context.inventory && context.inventory.removeItem('tobacco-seeds', 1)) {
        tile.type = 'tobacco-1';
        tile.growthStage = 1;
        console.log("Tobacco planted: phase 1 (tobacco-1.png)");

        setTimeout(() => {
          if (tile.type === 'tobacco-1') {
            tile.type = 'tobacco-2';
            tile.growthStage = 2;
            console.log("Tobacco growth: phase 2 (tobacco-2.png)");
          }
        }, 10000);

        setTimeout(() => {
          if (tile.type === 'tobacco-2') {
            tile.type = 'tobacco-3';
            tile.growthStage = 3;
            console.log("Tobacco growth: phase 3 (tobacco-3.png, ready for harvest)");
          }
        }, 20000);
      } else {
        console.warn("Not enough tobacco seeds in inventory");
      }
    } else {
      console.warn("Tobacco seeds can only be used on farmland");
    }
  }
}