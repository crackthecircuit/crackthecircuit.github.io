import { useEffect } from 'react';
import { ScreenTransition } from './components/ScreenTransition';
import { LevelMap } from './screens/LevelMap';
import { LevelScreen } from './screens/LevelScreen';
import { TitleScreen } from './screens/TitleScreen';
import { useAppStore } from './store/appStore';
import { useProgressStore } from './store/progressStore';
import styles from './App.module.css';

export function App() {
  const screen = useAppStore((s) => s.screen);
  const go = useAppStore((s) => s.go);
  const lockedLevel = useProgressStore((s) => screen.name === 'level' && !s.isUnlocked(screen.levelId));

  // A locked level opened by URL goes back to the map.
  useEffect(() => {
    if (lockedLevel) go({ name: 'map' });
  }, [lockedLevel, go]);

  return (
    <>
      <p className={styles.smallScreen} role="note">
        Crack the Circuit is built for a laptop or desktop screen. Some things won’t fit here.
      </p>
      <div className={styles.screen}>
        <ScreenTransition id={screen.name === 'level' ? `level-${screen.levelId}` : screen.name}>
          {screen.name === 'title' && <TitleScreen />}
          {screen.name === 'map' && <LevelMap />}
          {screen.name === 'level' && !lockedLevel && (
            <LevelScreen key={screen.levelId} levelId={screen.levelId} />
          )}
        </ScreenTransition>
      </div>
    </>
  );
}
