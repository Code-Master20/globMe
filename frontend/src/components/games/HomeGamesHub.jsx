import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { DEFAULT_GAMES, getGameRoute } from "./gameCatalog";
import styles from "./HomeGamesHub.module.css";

const HOME_GAMES_CACHE_TTL_MS = 60 * 1000;
const homeGamesCache = {
  games: [],
  updatedAt: 0,
  hydrated: false,
};

const hasFreshHomeGamesCache = () =>
  homeGamesCache.hydrated && Date.now() - homeGamesCache.updatedAt <= HOME_GAMES_CACHE_TTL_MS;

export const HomeGamesHub = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState(() => homeGamesCache.games);
  const [loading, setLoading] = useState(() => !homeGamesCache.hydrated);

  useEffect(() => {
    let ignore = false;

    if (homeGamesCache.hydrated) {
      setGames(homeGamesCache.games);
      setLoading(false);
    } else {
      setGames([]);
      setLoading(true);
    }

    if (hasFreshHomeGamesCache()) {
      return () => {
        ignore = true;
      };
    }

    const loadGames = async () => {
      try {
        if (!homeGamesCache.hydrated) {
          setLoading(true);
        }

        const response = await api.get("/public/games");
        const nextGames = Array.isArray(response.data?.data) && response.data.data.length
          ? response.data.data
          : DEFAULT_GAMES;

        if (!ignore) {
          homeGamesCache.games = nextGames;
          homeGamesCache.updatedAt = Date.now();
          homeGamesCache.hydrated = true;
          setGames(nextGames);
        }
      } catch (_error) {
        if (!ignore && !homeGamesCache.hydrated) {
          homeGamesCache.games = DEFAULT_GAMES;
          homeGamesCache.updatedAt = Date.now();
          homeGamesCache.hydrated = true;
          setGames(DEFAULT_GAMES);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadGames();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className={`${styles.shell} ${styles.homeShell}`}>
      <div className={styles.hubCard}>
        <p className={styles.sectionTitle}>Choose a game and start playing</p>

        <div className={styles.catalogGrid}>
          {loading
            ? Array.from({ length: 3 }, (_, index) => (
                <div
                  key={`game-skeleton-${index}`}
                  className={`${styles.catalogCard} ${styles.catalogCardSkeleton}`}
                  aria-hidden="true"
                >
                  <div className={`${styles.catalogImageFrame} ${styles.skeletonBlock}`} />
                  <div className={`${styles.skeletonBlock} ${styles.catalogTitleSkeleton}`} />
                  <div className={`${styles.skeletonBlock} ${styles.catalogTitleSkeletonShort}`} />
                </div>
              ))
            : games.map((game) => (
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
                  <h2>{game.cardTitle || game.name}</h2>
                </button>
              ))}
        </div>
      </div>
    </section>
  );
};
