import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { DEFAULT_GAMES, getGameRoute } from "./gameCatalog";
import styles from "./HomeGamesHub.module.css";

export const HomeGamesHub = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState(DEFAULT_GAMES);

  useEffect(() => {
    let ignore = false;

    const loadGames = async () => {
      try {
        const response = await api.get("/public/games");
        const nextGames = Array.isArray(response.data?.data) && response.data.data.length
          ? response.data.data
          : DEFAULT_GAMES;

        if (!ignore) {
          setGames(nextGames);
        }
      } catch (_error) {
        if (!ignore) {
          setGames(DEFAULT_GAMES);
        }
      }
    };

    loadGames();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className={styles.shell}>
      <div className={styles.hubCard}>
        <p className={styles.sectionTitle}>Choose a game and start playing</p>

        <div className={styles.catalogGrid}>
          {games.map((game) => (
            <button
              key={game.key}
              type="button"
              className={styles.catalogCard}
              onClick={() => navigate(getGameRoute(game.key))}
            >
              {game.imageSrc ? (
                <div className={styles.catalogImageFrame}>
                  <img
                    src={game.imageSrc}
                    alt={game.imageAlt || game.name}
                    className={styles.catalogImage}
                  />
                </div>
              ) : null}
              <div className={styles.catalogHeader}>
                <span>{game.badge || "Game"}</span>
                <strong>{game.category || "Mini game"}</strong>
              </div>
              <h2>{game.name}</h2>
              <p>{game.description}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
