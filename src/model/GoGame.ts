import Immutable from 'immutable';

export type GoPlayer = 'black' | 'white';
export type CellState = GoPlayer | 'empty';

export class InvalidMove extends Error {
  constructor(public readonly reason: MoveValidationReason) {
    super('Invalid move');
  }
}

export enum MoveValidationReason {
  OutOfTurn,
  SpaceOccupied,
  OffBoard,
  Suicidal,
}

export type BoardPosition = readonly [number, number];

export interface GoMove {
  player: GoPlayer;
  position: BoardPosition | 'pass';
}

const nextPlayer = { white: 'black', black: 'white' } as const;

export class GoGame {
  static create(boardSize: number) {
    return new GoGame(boardSize);
  }

  private constructor(
    public readonly boardSize: number,
    public readonly ended = false,
    private readonly lastMove: GoMove | null = null,
    private readonly groupCollection = GroupCollection.create(boardSize),
  ) {}

  playMoves(moves: GoMove[]) {
    return moves.reduce<GoGame>((game, move) => game.playMove(move), this);
  }

  playMove(move: GoMove): GoGame {
    const validationReason = this.validateMove(move);

    if (validationReason != null) {
      throw new InvalidMove(validationReason);
    }

    const ended =
      move.position === 'pass' &&
      this.lastMove != null &&
      this.lastMove.position === 'pass';

    let groupCollection = this.groupCollection;
    if (move.position !== 'pass') {
      groupCollection = groupCollection.addStone(
        move.player,
        this.getIndex(move.position),
      );
    }

    return new GoGame(this.boardSize, ended, move, groupCollection);
  }

  validateMove(move: GoMove): MoveValidationReason | null {
    if (this.currentPlayer !== move.player) {
      return MoveValidationReason.OutOfTurn;
    }

    if (move.position != 'pass') {
      if (
        move.position[0] < 0 ||
        move.position[1] < 0 ||
        move.position[0] >= this.boardSize ||
        move.position[1] >= this.boardSize
      ) {
        return MoveValidationReason.OffBoard;
      }

      if (this.getCell(move.position) !== 'empty') {
        return MoveValidationReason.SpaceOccupied;
      }

      const moveIndex = this.getIndex(move.position);
      const newGroupCollection = this.groupCollection.addStone(
        move.player,
        moveIndex,
      );
      if (newGroupCollection.getLibertiesOfGroup(moveIndex) === 0) {
        return MoveValidationReason.Suicidal;
      }
    }

    return null;
  }

  get currentPlayer() {
    return nextPlayer[this.lastMove ? this.lastMove.player : 'white'];
  }

  getCell(position: readonly [number, number]): CellState {
    const group = this.groupCollection.get(this.getIndex(position));
    if (!group) return 'empty';

    return group.player;
  }

  private getIndex(position: readonly [number, number]) {
    return this.boardSize * position[0] + position[1];
  }
}

interface Group {
  player: GoPlayer;
  indicies: number[];
}

class GroupCollection {
  static create(boardSize: number) {
    return new GroupCollection(boardSize);
  }

  constructor(
    private readonly boardSize: number,
    private readonly groupsByIndex = Immutable.Map<number, Group>(),
  ) {}

  private up(index: number) {
    return index < this.boardSize ? null : index - this.boardSize;
  }

  private down(index: number) {
    return index + this.boardSize >= this.boardSize ** 2
      ? null
      : index + this.boardSize;
  }

  private left(index: number) {
    return index % this.boardSize === 0 ? null : index - 1;
  }

  private right(index: number) {
    return index % this.boardSize === this.boardSize - 1 ? null : index + 1;
  }

  private getAdjacentIndexes(index: number) {
    return [
      this.up(index),
      this.left(index),
      this.right(index),
      this.down(index),
    ].filter(
      (adjacentIndex): adjacentIndex is NonNullable<typeof adjacentIndex> =>
        adjacentIndex != null,
    );
  }

  private getAdjacentGroups(index: number) {
    return uniq(
      this.getAdjacentIndexes(index)
        .map(position => this.groupsByIndex.get(position))
        .filter((group): group is NonNullable<typeof group> => group != null),
    );
  }

  addStone(player: GoPlayer, index: number): GroupCollection {
    const theirAdjacentGroups = this.getAdjacentGroups(index).filter(
      group => group.player === player,
    );

    const newGroup: Group = {
      player,
      indicies: [index].concat(
        ...theirAdjacentGroups.map(group => group.indicies),
      ),
    };

    const newGroupsByIndex = newGroup.indicies.reduce(
      (groups, index) => groups.set(index, newGroup),
      this.groupsByIndex,
    );

    return new GroupCollection(this.boardSize, newGroupsByIndex);
  }

  /**
   * @returns the number of liberties or null if the group does not exist
   */
  getLibertiesOfGroup(index: number): number | null {
    const thisGroup = this.groupsByIndex.get(index);

    if (!thisGroup) return null;

    return thisGroup.indicies.reduce(
      (liberties, groupIndex) =>
        liberties + this.getLibertiesOfStone(groupIndex),
      0,
    );
  }

  private getLibertiesOfStone(index: number) {
    return countWhere(
      this.getAdjacentIndexes(index),
      adjacentIndex => !this.groupsByIndex.has(adjacentIndex),
    );
  }

  get(index: number) {
    return this.groupsByIndex.get(index);
  }
}

const uniq = <T>(arr: T[]) => Array.from(new Set(arr));

const countWhere = <T>(arr: T[], predicate: (elem: T) => boolean) =>
  arr.reduce((count, elem) => (predicate(elem) ? count + 1 : count), 0);
