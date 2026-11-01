import { GAME_CONFIG, type GameId } from "../domain/lottery";

interface GameSwitcherProps {
  game: GameId;
  disabled: boolean;
  onChange: (game: GameId) => void;
}

const GAMES: GameId[] = ["ssq", "dlt"];

export function GameSwitcher({ game, disabled, onChange }: GameSwitcherProps) {
  return (
    <div className="game-switcher" role="group" aria-label="选择玩法">
      {GAMES.map((gameId) => (
        <button
          className="game-switcher__button"
          data-game={gameId}
          type="button"
          aria-pressed={game === gameId}
          disabled={disabled}
          onClick={() => onChange(gameId)}
          key={gameId}
        >
          {GAME_CONFIG[gameId].name}
        </button>
      ))}
    </div>
  );
}
