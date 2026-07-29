export class GameNotFoundError extends Error {
  constructor(boardGameId: string) {
    super(`Spiel ${boardGameId} wurde nicht gefunden.`);
    this.name = "GameNotFoundError";
  }
}

export class GameDeinventarisedError extends Error {
  constructor(boardGameId: string) {
    super(`Spiel ${boardGameId} ist deinventarisiert.`);
    this.name = "GameDeinventarisedError";
  }
}

/** The requested transition does not follow from the game's current holding. */
export class HoldingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HoldingConflictError";
  }
}

export class UnitRetiredError extends Error {
  constructor(unitId: string) {
    super(`Aufbewahrungseinheit ${unitId} ist stillgelegt.`);
    this.name = "UnitRetiredError";
  }
}

export class UnitNotFoundError extends Error {
  constructor(unitId: string) {
    super(`Aufbewahrungseinheit ${unitId} wurde nicht gefunden.`);
    this.name = "UnitNotFoundError";
  }
}
