import { useEffect, useMemo, useState } from 'react';
import { stories } from './data/stories';
import {
  applyChoice,
  canChoose,
  emptySave,
  getStoryState,
  loadSave,
  percentComplete,
  resolveEnding,
  saveGame,
  defaultStoryState
} from './lib/game';
import { playChoiceSound, playMusic, stopMusic } from './lib/audio';

const icons = { bond: '♡', courage: '✦', insight: '◈' };

function App() {
  const [save, setSave] = useState(() => loadSave());
  const [view, setView] = useState('library');
  const [selectedId, setSelectedId] = useState(null);
  const [readerChoice, setReaderChoice] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedStory = stories.find((story) => story.id === selectedId) || null;

  const updateSave = (updater) => {
    setSave((current) => {
      const next = updater(current);
      saveGame(next);
      return next;
    });
  };

  useEffect(() => {
    if (save.settings.music && view === 'reader' && selectedStory) {
      playMusic(selectedStory.track);
    } else if (!save.settings.music || view !== 'reader') {
      stopMusic();
    }
    return () => stopMusic();
  }, [save.settings.music, selectedStory, view]);

  const openStory = (storyId) => {
    setSelectedId(storyId);
    setView('story');
    setReaderChoice(null);
  };

  const beginStory = (storyId, restart = false) => {
    const story = stories.find((item) => item.id === storyId);
    if (!story) return;
    const existing = getStoryState(save, storyId);
    const state = restart ? defaultStoryState(storyId) : existing;
    updateSave((current) => ({
      ...current,
      lastStoryId: storyId,
      stories: { ...current.stories, [storyId]: state }
    }));
    setSelectedId(storyId);
    setReaderChoice(null);
    setView('reader');
  };

  const currentState = selectedStory ? getStoryState(save, selectedStory.id) : null;
  const currentChapter = selectedStory && currentState
    ? selectedStory.chapters[currentState.chapterIndex]
    : null;

  const choose = (choice) => {
    if (!selectedStory || !currentState || readerChoice || !canChoose(choice, currentState.metrics)) return;
    if (save.settings.sound) playChoiceSound();
    const nextState = applyChoice(currentState, choice);
    updateSave((current) => ({
      ...current,
      lastStoryId: selectedStory.id,
      stories: { ...current.stories, [selectedStory.id]: nextState }
    }));
    setReaderChoice(choice);
  };

  const continueChapter = () => {
    if (!selectedStory || !currentState || !readerChoice) return;
    const atFinalChapter = currentState.chapterIndex >= selectedStory.chapters.length - 1;
    if (atFinalChapter) {
      const ending = resolveEnding(selectedStory, currentState.metrics);
      updateSave((current) => ({
        ...current,
        lastStoryId: selectedStory.id,
        stories: {
          ...current.stories,
          [selectedStory.id]: { ...currentState, completed: true, endingId: ending.id }
        }
      }));
    } else {
      updateSave((current) => ({
        ...current,
        stories: {
          ...current.stories,
          [selectedStory.id]: { ...currentState, chapterIndex: currentState.chapterIndex + 1 }
        }
      }));
      setReaderChoice(null);
    }
  };

  const resetAll = () => {
    const next = emptySave();
    saveGame(next);
    setSave(next);
    setSelectedId(null);
    setReaderChoice(null);
    setView('library');
  };

  const toggleSetting = (key) => {
    updateSave((current) => ({
      ...current,
      settings: { ...current.settings, [key]: !current.settings[key] }
    }));
  };

  return (
    <div className="app-shell">
      <Header view={view} onHome={() => { setView('library'); setSelectedId(null); }} onSettings={() => setSettingsOpen(true)} />
      <main>
        {view === 'library' && <Library save={save} onOpen={openStory} onResume={(id) => beginStory(id)} />}
        {view === 'story' && selectedStory && (
          <StoryDetail
            story={selectedStory}
            state={getStoryState(save, selectedStory.id)}
            onBack={() => setView('library')}
            onStart={() => beginStory(selectedStory.id)}
            onRestart={() => beginStory(selectedStory.id, true)}
          />
        )}
        {view === 'reader' && selectedStory && currentChapter && (
          <Reader
            story={selectedStory}
            state={currentState}
            chapter={currentChapter}
            selectedChoice={readerChoice}
            onChoice={choose}
            onContinue={continueChapter}
            onBack={() => setView('story')}
          />
        )}
      </main>
      {settingsOpen && (
        <Settings
          settings={save.settings}
          onToggle={toggleSetting}
          onReset={resetAll}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function Header({ view, onHome, onSettings }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onHome} aria-label="На главную">
        <span className="brand-mark">✦</span>
        <span><strong>LUMEN</strong><small>истории на выбор</small></span>
      </button>
      <nav className="topnav" aria-label="Основная навигация">
        <button className={view === 'library' ? 'nav-link active' : 'nav-link'} onClick={onHome}>Библиотека</button>
        <button className="icon-button" onClick={onSettings} aria-label="Настройки">⚙</button>
      </nav>
    </header>
  );
}

function Library({ save, onOpen, onResume }) {
  const resumeStory = save.lastStoryId ? stories.find((story) => story.id === save.lastStoryId) : null;
  return (
    <div className="page library-page">
      <section className="hero-intro">
        <div className="eyebrow"><span className="eyebrow-line" /> КОЛЛЕКЦИЯ 01</div>
        <h1>Твои решения.<br /><em>Твоя история.</em></h1>
        <p>Три мира, где одна встреча может изменить всё. Выбирай осторожно — некоторые тайны запоминают тебя.</p>
        {resumeStory && !getStoryState(save, resumeStory.id).completed && (
          <button className="resume-banner" onClick={() => onResume(resumeStory.id)}>
            <span className="resume-icon">↗</span><span><small>ПРОДОЛЖИТЬ</small><strong>{resumeStory.title}</strong></span><span className="arrow">→</span>
          </button>
        )}
      </section>
      <section className="story-grid" aria-label="Истории">
        {stories.map((story, index) => <StoryCard key={story.id} story={story} state={getStoryState(save, story.id)} index={index} onOpen={onOpen} />)}
      </section>
      <footer className="library-footer"><span>ОРИГИНАЛЬНЫЕ ИСТОРИИ · 2026</span><span>Сделано для тех, кто выбирает сердцем <i>♡</i></span></footer>
    </div>
  );
}

function StoryCard({ story, state, index, onOpen }) {
  const progress = percentComplete(state, story);
  return (
    <article className={`story-card ${story.gradient}`} style={{ '--accent': story.accent, '--delay': `${index * 100}ms` }}>
      <button className="card-art" onClick={() => onOpen(story.id)} aria-label={`Открыть ${story.title}`}>
        <img src={story.cover} alt="" />
        <span className="card-number">0{index + 1}</span>
        <span className="card-status">{state.completed ? 'ЗАВЕРШЕНО' : state.chapterIndex > 0 ? `${progress}% ПРОЙДЕНО` : 'НОВАЯ ИСТОРИЯ'}</span>
      </button>
      <div className="card-body">
        <span className="card-subtitle">{story.subtitle}</span>
        <h2>{story.title}</h2>
        <p>{story.description}</p>
        <div className="tag-row">{story.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <button className="text-button" onClick={() => onOpen(story.id)}>Открыть историю <span>↗</span></button>
      </div>
    </article>
  );
}

function StoryDetail({ story, state, onBack, onStart, onRestart }) {
  const ending = state.completed ? story.endings.find((item) => item.id === state.endingId) : null;
  return (
    <div className={`page detail-page ${story.gradient}`} style={{ '--accent': story.accent }}>
      <button className="back-button" onClick={onBack}>← Все истории</button>
      <div className="detail-layout">
        <div className="detail-visual"><img src={story.cover} alt="" /><div className="visual-stamp">{story.hook}</div></div>
        <div className="detail-copy">
          <span className="card-subtitle">{story.subtitle}</span>
          <h1>{story.title}</h1>
          <p className="detail-description">{story.description}</p>
          <div className="detail-rule" />
          <div className="detail-meta"><span>6 глав</span><span>3 концовки</span><span>♡ выборы</span></div>
          {ending && <div className={`ending-note ${ending.tone}`}><small>ТВОЯ КОНЦОВКА</small><strong>{ending.icon} {ending.title}</strong></div>}
          <div className="detail-actions">
            <button className="primary-button" onClick={state.completed ? onRestart : onStart}>{state.completed ? 'Пройти заново' : state.chapterIndex > 0 ? 'Продолжить' : 'Начать историю'} <span>→</span></button>
            {state.chapterIndex > 0 && !state.completed && <span className="progress-caption">Глава {state.chapterIndex + 1} из {story.chapters.length}</span>}
          </div>
        </div>
      </div>
      <section className="cast-section"><div><span className="eyebrow"><span className="eyebrow-line" /> ПЕРСОНАЖИ</span><h2>Те, кто войдёт<br /><em>в твою историю</em></h2></div><div className="cast-grid">{story.characters.map((person) => <div className="cast-card" key={person.id}><img src={person.portrait} alt="" /><span>{person.role}</span><strong>{person.name}</strong></div>)}</div></section>
    </div>
  );
}

function Reader({ story, state, chapter, selectedChoice, onChoice, onContinue, onBack }) {
  const ending = state.completed ? story.endings.find((item) => item.id === state.endingId) : null;
  const progress = Math.round(((state.chapterIndex + (selectedChoice ? 1 : 0)) / story.chapters.length) * 100);
  return (
    <div className={`reader ${story.gradient}`} style={{ '--accent': story.accent, '--scene': `url(${chapter.art})` }}>
      <div className="reader-top"><button className="reader-back" onClick={onBack}>← выйти</button><span>{story.title}</span><span className="reader-chapter">ГЛАВА {chapter.number} / 06</span></div>
      <div className="reader-stage">
        <div className="scene-layer" />
        <div className="scene-vignette" />
        <div className="chapter-label"><small>{chapter.eyebrow}</small><strong>{chapter.title}</strong><span>{chapter.number.toString().padStart(2, '0')}</span></div>
        <div className="metrics-bar"><Metric icon="♡" label="связь" value={state.metrics.bond} /><Metric icon="✦" label="смелость" value={state.metrics.courage} /><Metric icon="◈" label="интуиция" value={state.metrics.insight} /></div>
        <div className="dialogue-wrap">
          <div className="speaker-card"><span className="speaker-dot" /><span>{chapter.speaker}</span><small>{chapter.location.includes('assets') ? 'Повествование' : 'Сцена'}</small></div>
          <div className="dialogue-card"><p>{chapter.text}</p>{selectedChoice ? <div className="choice-result"><span>ТВОЙ ВЫБОР</span><strong>{selectedChoice.label}</strong><p>{selectedChoice.result}</p><button className="continue-button" onClick={onContinue}>{state.chapterIndex >= story.chapters.length - 1 ? 'Узнать финал' : 'Продолжить'} <span>→</span></button></div> : <div className="choices"><span className="choices-label">Как ты поступишь?</span>{chapter.choices.map((choice) => <ChoiceButton key={choice.id} choice={choice} metrics={state.metrics} onClick={() => onChoice(choice)} />)}</div>}</div>
        </div>
      </div>
      <div className="reader-bottom"><span>Сохранение включено автоматически</span><div className="reader-progress"><i style={{ width: `${Math.max(4, progress)}%` }} /></div><span>{Math.max(1, progress)}%</span></div>
      {ending && <div className="ending-overlay"><div className={`ending-card ${ending.tone}`}><span className="ending-icon">{ending.icon}</span><small>ИСТОРИЯ ЗАВЕРШЕНА</small><h2>{ending.title}</h2><p>{ending.text}</p><button className="primary-button" onClick={onBack}>Вернуться к истории <span>→</span></button></div></div>}
    </div>
  );
}

function ChoiceButton({ choice, metrics, onClick }) {
  const available = canChoose(choice, metrics);
  const effect = Object.entries(choice.effects || {})[0];
  const requirement = Object.entries(choice.requires || {})[0];
  const requirementLabel = requirement ? ({ bond: 'связь', courage: 'смелость', insight: 'интуиция' }[requirement[0]] || requirement[0]) : 'нужен ресурс';
  return <button className={`choice-button ${!available ? 'locked' : ''}`} onClick={onClick} disabled={!available}><span className="choice-symbol">{available ? '↳' : '◇'}</span><span>{choice.label}</span>{effect && available && <small>{icons[effect[0]]} {effect[1] > 0 ? '+' : ''}{effect[1]}</small>}{!available && <small>нужна {requirementLabel} {requirement?.[1]}</small>}</button>;
}

function Metric({ icon, label, value }) { return <div className="metric"><span>{icon}</span><div><small>{label}</small><strong>{Math.max(0, value)}</strong></div></div>; }

function Settings({ settings, onToggle, onReset, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="settings-modal" role="dialog" aria-modal="true" aria-label="Настройки"><button className="modal-close" onClick={onClose}>×</button><span className="eyebrow"><span className="eyebrow-line" /> НАСТРОЙКИ</span><h2>Настрой игру<br /><em>под себя</em></h2><div className="setting-list"><SettingRow label="Атмосферная музыка" icon="♫" checked={settings.music} onClick={() => onToggle('music')} /><SettingRow label="Звуки выборов" icon="◌" checked={settings.sound} onClick={() => onToggle('sound')} /></div><button className="reset-button" onClick={onReset}>Сбросить весь прогресс</button><p className="settings-note">Прогресс хранится только в этом браузере.</p></section></div>;
}

function SettingRow({ label, icon, checked, onClick }) { return <button className="setting-row" onClick={onClick}><span className="setting-icon">{icon}</span><span>{label}</span><i className={checked ? 'toggle on' : 'toggle'}><b /></i></button>; }

export default App;
