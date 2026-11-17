import { UserFacingError } from "@/lib/utils/action-result";

export class GameNotFoundError extends UserFacingError {
  constructor(boardGameId: string) {
    super(`Spiel ${boardGameId} wurde nicht gefunden.`);
    this.name = "GameNotFoundError";
  }
}

export class GameDeinventarisedError extends UserFacingError {
  constructor(boardGameId: string) {
    super(`Spiel ${boardGameId} ist deinventarisiert.`);
    this.name = "GameDeinventarisedError";
  }
}

/** The requested transition does not follow from the game's current holding. */
export class HoldingConflictError extends UserFacingError {
  constructor(message: string) {
    super(message);
    this.name = "HoldingConflictError";
  }
}

export class UnitRetiredError extends UserFacingError {
  constructor(unitId: string) {
    super(`Aufbewahrungseinheit ${unitId} ist stillgelegt.`);
    this.name = "UnitRetiredError";
  }
}

export class UnitNotFoundError extends UserFacingError {
  constructor(unitId: string) {
    super(`Aufbewahrungseinheit ${unitId} wurde nicht gefunden.`);
    this.name = "UnitNotFoundError";
  }
}
