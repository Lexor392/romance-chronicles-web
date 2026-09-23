import { useEffect, useMemo, useState } from 'react';
import { story } from './data/stories';
import { applyChoice, defaultState, emptySave, getStoryState, loadSave, percentComplete, resolveEnding, saveGame } from './lib/game';
import { playChoiceSound, playMusic, stopMusic } from './lib/audio';

const speakerMap = {
  'Ира': 'ira',
  'Артем': 'artem',
  'Никита': 'nikita',
  'Илья': 'ilya',
  'Алина': 'alina',
  'Директор': 'director',
  'Рассказчик': 'ira'
};

function App() {
  const [save, setSave] = useState(() => loadSave());
  const [view, setView] = useState('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [conversationDone, setConversationDone] = useState(false);
  const [pendingChoice, setPendingChoice] = useState(null);
  const state = getStoryState(save, story.id);
  const chapter = story.chapters[state.chapterIndex] || story.chapters[story.chapters.length - 1];
  const activeLine = chapter.lines[lineIndex] || chapter.lines[chapter.lines.length - 1];
  const activeEnding = state.completed ? resolveEnding(story, state) : null;

  const updateSave = (updater) => {
    setSave((current) => {
      const next = updater(current);
      saveGame(next);
      return next;
    });
  };

  useEffect(() => {
    if (view !== 'reader' || !save.settings.music) stopMusic();
    return () => { if (view !== 'reader') stopMusic(); };
  }, [view, save.settings.music]);

  const start = (restart = false) => {
    const nextState = restart ? defaultState(story.id) : state;
    updateSave((current) => ({ ...current, stories: { ...current.stories, [story.id]: nextState }, lastStoryId: story.id }));
    setLineIndex(0);
    setConversationDone(false);
    setPendingChoice(null);
    setView('reader');
    if (save.settings.music) playMusic(story.audio.theme);
  };

  const advanceLine = () => {
    if (pendingChoice) return;
    if (lineIndex < chapter.lines.length - 1) setLineIndex((value) => value + 1);
    else setConversationDone(true);
  };

  const choose = (choice) => {
    if (pendingChoice) return;
    if (save.settings.sound) playChoiceSound();
    const staged = applyChoice(state, choice, story);
    updateSave((current) => ({
      ...current,
      stories: {
        ...current.stories,
        [story.id]: { ...staged, chapterIndex: state.chapterIndex, completed: false, endingId: null, pendingChoiceId: choice.id }
      },
      lastStoryId: story.id
    }));
    setPendingChoice(choice);
  };

  const continueAfterChoice = () => {
    if (!pendingChoice) return;
    const finalChapter = state.chapterIndex >= story.chapters.length - 1;
    if (finalChapter) {
      const staged = applyChoice(state, pendingChoice, story);
      const finalState = { ...staged, completed: true, endingId: pendingChoice.route, pendingChoiceId: null };
      updateSave((current) => ({ ...current, stories: { ...current.stories, [story.id]: finalState } }));
      setPendingChoice(null);
      setView('ending');
      return;
    }
    updateSave((current) => ({
      ...current,
      stories: {
        ...current.stories,
        [story.id]: {
          ...getStoryState(current, story.id),
          chapterIndex: state.chapterIndex + 1,
          pendingChoiceId: null,
          updatedAt: Date.now()
        }
      }
    }));
    setLineIndex(0);
    setConversationDone(false);
    setPendingChoice(null);
  };

  const toggleSetting = (key) => {
    const enabled = !save.settings[key];
    updateSave((current) => ({ ...current, settings: { ...current.settings, [key]: enabled } }));
    if (key === 'music') {
      if (enabled && view === 'reader') playMusic(story.audio.theme);
      if (!enabled) stopMusic();
    }
  };

  const resetProgress = () => {
    const next = emptySave();
    saveGame(next);
    setSave(next);
    setView('home');
    setLineIndex(0);
    setConversationDone(false);
    setPendingChoice(null);
  };

  return (
    <div className="app-shell">
      <Topbar view={view} onHome={() => { setView('home'); setPendingChoice(null); }} onSettings={() => setSettingsOpen(true)} />
      {view === 'home' && <Home state={state} onStart={start} onSettings={() => setSettingsOpen(true)} />}
      {view === 'reader' && <Reader story={story} state={state} chapter={chapter} line={activeLine} lineIndex={lineIndex} conversationDone={conversationDone} pendingChoice={pendingChoice} onAdvance={advanceLine} onChoice={choose} onContinue={continueAfterChoice} onQuit={() => setView('home')} />}
      {view === 'ending' && activeEnding && <Ending ending={activeEnding} onRestart={() => start(true)} onEpilogue={() => setView('epilogue')} />}
      {view === 'epilogue' && <Epilogue onHome={() => setView('home')} />}
      {settingsOpen && <Settings settings={save.settings} onToggle={toggleSetting} onReset={resetProgress} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function Topbar({ view, onHome, onSettings }) {
  return <header className="topbar">
    <button className="brand" onClick={onHome}><span className="brand-mark">✦</span><span><strong>LUMEN</strong><small>визуальная новелла</small></span></button>
    <div className="top-actions"><span className="top-story">ПОСЛЕ ПОСЛЕДНЕГО ЗВОНКА</span>{view !== 'home' && <button className="quiet-button" onClick={onHome}>главное меню</button>}<button className="icon-button" onClick={onSettings} aria-label="Настройки">⚙</button></div>
  </header>;
}

function Home({ state, onStart }) {
  const progress = percentComplete(state, story);
  return <main className="home-page" style={{ "--hero-scene": `url(${story.cover})` }}>
    <section className="novel-hero">
      <div className="hero-glow" />
      <div className="hero-kicker">ОРИГИНАЛЬНАЯ РОМАНТИЧЕСКАЯ ДРАМА <span>·</span> 18+</div>
      <h1>После последнего<br /><em>звонка</em></h1>
      <p>Один последний учебный год. Три чувства, одна тайна академии и выбор, который нельзя сделать за тебя.</p>
      <div className="hero-actions"><button className="primary-button large" onClick={() => onStart(state.completed)}>{state.completed ? 'Пройти заново' : state.chapterIndex > 0 ? 'Продолжить историю' : 'Начать историю'} <span>→</span></button>{state.chapterIndex > 0 && !state.completed && <span className="home-progress">Глава {state.chapterIndex + 1} из {story.chapters.length}<b><i style={{ width: `${progress}%` }} /></b></span>}</div>
      <div className="hero-note"><span>«</span><i>Любовь, предательство, дружба<br />и выбор, который изменит всё.</i><span>»</span></div>
    </section>
    <section className="novel-info">
      <div className="chapter-map"><span className="section-label">ТВОЯ ИСТОРИЯ</span><h2>11 глав.<br /><em>4 пути.</em></h2><p>Каждая реплика меняет отношение персонажей. В финале решающим станет не один выбор, а то, кем ты была весь этот год.</p><div className="route-legend"><span><i className="route-dot artem" /> Артем</span><span><i className="route-dot nikita" /> Никита</span><span><i className="route-dot ilya" /> Илья</span><span><i className="route-dot self" /> Ира</span></div></div>
      <div className="cast-preview"><span className="section-label">ГЛАВНЫЕ ГЕРОИ</span><div className="cast-home-grid">{story.characters.slice(0, 4).map((person) => <div className="cast-home-card" key={person.id}><img src={person.portrait} alt="" /><span style={{ color: person.color }}>{person.name}</span><small>{person.role}</small></div>)}</div></div>
    </section>
    <footer className="home-footer"><span>Автосохранение включено</span><span>Сделано для тех, кто выбирает сердцем <i>♡</i></span></footer>
  </main>;
}

function Reader({ story, state, chapter, line, lineIndex, conversationDone, pendingChoice, onAdvance, onChoice, onContinue, onQuit }) {
  const speaker = story.characters.find((person) => person.id === speakerMap[line.speaker]);
  const progress = Math.round(((state.chapterIndex + (pendingChoice ? 1 : 0)) / story.chapters.length) * 100);
  const lineProgress = Math.round(((lineIndex + 1) / chapter.lines.length) * 100);
  return <main className="vn-reader" style={{ '--scene': `url(${pendingChoice ? chapter.background : chapter.background})` }}>
    <div className="scene-background" />
    <div className="scene-color" />
    <div className="reader-hud"><button className="reader-exit" onClick={onQuit}>← меню</button><div className="chapter-progress"><span>ГЛАВА {chapter.number} / 11</span><b>{chapter.title}</b></div><div className="hud-right"><span>{progress}%</span><button onClick={onQuit}>×</button></div></div>
    <div className="location-chip"><span className="location-pin">✦</span>{chapter.location}<small>{chapter.subtitle}</small></div>
    {speaker && <div className={speaker.id === 'ira' ? 'character-stage protagonist' : 'character-stage'}><img src={speaker.portrait} alt={speaker.name} /><div className="character-nameplate" style={{ '--character': speaker.color }}><small>{speaker.role}</small><strong>{speaker.name}</strong></div></div>}
    <section className="dialogue-panel" onClick={conversationDone || pendingChoice ? undefined : onAdvance}>
      <div className="dialogue-top"><span className="dialogue-mode">{line.speaker === 'Рассказчик' ? 'РАССКАЗ' : 'ДИАЛОГ'}</span><span className="line-progress"><i style={{ width: `${lineProgress}%` }} /></span><span className="tap-hint">{conversationDone || pendingChoice ? '' : 'нажми, чтобы продолжить'} <b>⌄</b></span></div>
      <div className="dialogue-text"><h2>{line.speaker}</h2><p>{pendingChoice ? pendingChoice.result || `Выбор «${pendingChoice.label}» принят. Эта история запомнит его.` : line.text}</p></div>
      {!pendingChoice && conversationDone && <ChoiceList choices={chapter.choices} onChoice={onChoice} />}
      {pendingChoice && <button className="continue-button" onClick={onContinue}>{state.chapterIndex >= story.chapters.length - 1 ? 'Открыть финал' : 'Следующая глава'} <span>→</span></button>}
    </section>
    <div className="reader-bottom"><div className="route-score"><span className="route-pill artem">А {state.routeCounts.artem}</span><span className="route-pill nikita">Н {state.routeCounts.nikita}</span><span className="route-pill ilya">И {state.routeCounts.ilya}</span></div><div className="full-progress"><i style={{ width: `${Math.max(3, progress)}%` }} /></div><span className="save-label">сохранено автоматически</span></div>
  </main>;
}

function ChoiceList({ choices, onChoice }) {
  return <div className="choice-list"><span className="choice-question">Как ты поступишь?</span>{choices.map((choice) => <button className={`vn-choice route-${choice.route}`} key={choice.id} onClick={(event) => { event.stopPropagation(); onChoice(choice); }}><span className="choice-route">{choice.route === 'artem' ? 'А' : choice.route === 'nikita' ? 'Н' : choice.route === 'ilya' ? 'И' : 'Я'}</span><span>{choice.label}</span><b>→</b></button>)}</div>;
}

function Ending({ ending, onRestart, onEpilogue }) {
  const character = story.characters.find((person) => person.id === ending.character);
  return <main className="ending-screen" style={{ '--scene': `url(${ending.background})` }}><div className="ending-bg" /><div className="ending-shade" /><div className="ending-content"><span className="ending-kicker">ИСТОРИЯ ЗАВЕРШЕНА</span><span className="ending-mark">{ending.character === 'ira' ? '✦' : '♡'}</span><h1>{ending.title}</h1><p className="ending-subtitle">{ending.subtitle}</p><div className="ending-dialogue">{ending.lines.map((item, index) => <p key={index}><strong>{item.speaker}</strong>{item.text}</p>)}</div><div className="ending-actions"><button className="primary-button" onClick={onEpilogue}>Сцена через год <span>→</span></button><button className="quiet-button" onClick={onRestart}>Начать заново</button></div>{character && <img className="ending-character" src={character.portrait} alt="" />}</div></main>;
}

function Epilogue({ onHome }) {
  return <main className="epilogue-screen" style={{ '--scene': `url(${story.epilogue.background})` }}><div className="epilogue-bg" /><div className="epilogue-content"><span className="ending-kicker">ПОСЛЕДНЯЯ СЦЕНА</span><h1>{story.epilogue.title}</h1><p>{story.epilogue.text}</p><button className="primary-button" onClick={onHome}>Вернуться в меню <span>→</span></button></div></main>;
}

function Settings({ settings, onToggle, onReset, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="settings-modal" role="dialog" aria-modal="true" aria-label="Настройки"><button className="modal-close" onClick={onClose}>×</button><span className="section-label">НАСТРОЙКИ</span><h2>Настрой игру<br /><em>под себя</em></h2><div className="setting-list"><SettingRow label="Музыкальное сопровождение" icon="♫" checked={settings.music} onClick={() => onToggle('music')} /><SettingRow label="Звуки выборов" icon="◌" checked={settings.sound} onClick={() => onToggle('sound')} /></div><button className="reset-button" onClick={onReset}>Сбросить весь прогресс</button><p className="settings-note">История сохраняется только в этом браузере.</p></section></div>;
}

function SettingRow({ label, icon, checked, onClick }) {
  return <button className="setting-row" onClick={onClick}><span className="setting-icon">{icon}</span><span>{label}</span><i className={checked ? 'toggle on' : 'toggle'}><b /></i></button>;
}

export default App;






