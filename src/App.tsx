import { useEffect } from 'react';
import { ScreenTransition } from './components/ScreenTransition';
import { Announcer } from './components/ui/Announcer';
import { LevelMap } from './screens/LevelMap';
import { LevelScreen } from './screens/LevelScreen';
import { SandboxScreen } from './screens/SandboxScreen';
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
      <div className={styles.screen}>
        <ScreenTransition id={screen.name === 'level' ? `level-${screen.levelId}` : screen.name}>
          {screen.name === 'title' && <TitleScreen />}
          {screen.name === 'map' && <LevelMap />}
          {screen.name === 'sandbox' && <SandboxScreen />}
          {screen.name === 'level' && !lockedLevel && (
            <LevelScreen key={screen.levelId} levelId={screen.levelId} />
          )}
        </ScreenTransition>
      </div>
      <Announcer />
    </>
  );
}
