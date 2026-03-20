import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "mkPlannerData_v2";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TRACKER_DOTS_PER_ITEM = 7;
const APP_DOWNLOAD_URL = "https://github.com/anne-gaelle-bernard/MK-app/archive/refs/heads/main.zip";

function emptyDaySchedules() {
  return DAYS.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {});
}

function emptyTileTitles() {
  return {
    midnight: "",
    pearl: "Tracker",
    noir: "",
    ocean: ""
  };
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function minutesBetween(start, end) {
  if (!start || !end) return 0;
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

function percent(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function safeParseStorage() {
  const defaults = {
    daySchedules: emptyDaySchedules(),
    tileTitles: emptyTileTitles(),
    trackerItems: [],
    projects: []
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw);

    const daySchedules = emptyDaySchedules();
    const tileTitles = emptyTileTitles();

    if (parsed.daySchedules && typeof parsed.daySchedules === "object") {
      for (const day of DAYS) {
        const entries = parsed.daySchedules[day];
        if (!Array.isArray(entries)) {
          daySchedules[day] = [];
          continue;
        }

        daySchedules[day] = entries.map((entry, index) => ({
          id: typeof entry.id === "string" ? entry.id : `${day}-${index}-${createId()}`,
          title: typeof entry.title === "string" ? entry.title : "",
          start: typeof entry.start === "string" ? entry.start : "",
          end: typeof entry.end === "string" ? entry.end : "",
          done: Boolean(entry.done)
        }));
      }
    } else if (parsed.weeklySchedule && typeof parsed.weeklySchedule === "object") {
      for (const day of DAYS) {
        const legacyText = typeof parsed.weeklySchedule[day] === "string" ? parsed.weeklySchedule[day].trim() : "";
        daySchedules[day] = legacyText
          ? [
              {
                id: `${day}-legacy-${createId()}`,
                title: legacyText,
                start: "",
                end: "",
                done: false
              }
            ]
          : [];
      }
    }

    if (parsed.tileTitles && typeof parsed.tileTitles === "object") {
      for (const key of Object.keys(tileTitles)) {
        const fallback = key === "pearl" ? "Tracker" : "";
        tileTitles[key] =
          typeof parsed.tileTitles[key] === "string" && parsed.tileTitles[key].trim().length > 0
            ? parsed.tileTitles[key]
            : fallback;
      }
    }

    return {
      daySchedules,
      tileTitles,
      trackerItems: Array.isArray(parsed.trackerItems)
        ? parsed.trackerItems
            .map((item, index) => {
              const name = typeof item?.name === "string" ? item.name.trim() : "";
              if (!name) return null;

              const dots = Array.from({ length: TRACKER_DOTS_PER_ITEM }, (_, dotIndex) =>
                Boolean(Array.isArray(item?.dots) ? item.dots[dotIndex] : false)
              );

              return {
                id: typeof item?.id === "string" ? item.id : `tracker-${index}-${createId()}`,
                name,
                dots
              };
            })
            .filter(Boolean)
        : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : []
    };
  } catch {
    return defaults;
  }
}

export default function App() {
  const initialState = useMemo(() => safeParseStorage(), []);

  const [daySchedules, setDaySchedules] = useState(initialState.daySchedules);
  const [tileTitles, setTileTitles] = useState(initialState.tileTitles);
  const [trackerItems, setTrackerItems] = useState(initialState.trackerItems);
  const [projects, setProjects] = useState(initialState.projects);

  const [scheduleInput, setScheduleInput] = useState({ title: "", start: "", end: "" });
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editingScheduleInput, setEditingScheduleInput] = useState({ title: "", start: "", end: "" });
  const [selectedDay, setSelectedDay] = useState(null);
  const [trackerInput, setTrackerInput] = useState("");
  const [projectInput, setProjectInput] = useState("");

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 760);
  const [activeTile, setActiveTile] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        daySchedules,
        tileTitles,
        trackerItems,
        projects
      })
    );
  }, [daySchedules, tileTitles, trackerItems, projects]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 760);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setActiveTile(null);
    }
  }, [isMobile]);

  useEffect(() => {
    document.body.classList.toggle("mobile-tile-open", Boolean(activeTile));
    return () => document.body.classList.remove("mobile-tile-open");
  }, [activeTile]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("splash-open", showSplash);
    return () => document.body.classList.remove("splash-open");
  }, [showSplash]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveTile(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const allScheduleItems = DAYS.flatMap((day) => daySchedules[day] || []);
  const scheduleDone = allScheduleItems.filter((item) => item.done).length;
  const schedulePct = percent(scheduleDone, allScheduleItems.length);

  const trackerFilledCount = trackerItems.reduce((sum, item) => sum + item.dots.filter(Boolean).length, 0);
  const trackerTotalCount = trackerItems.length * TRACKER_DOTS_PER_ITEM;
  const trackerPct = percent(trackerFilledCount, trackerTotalCount);

  const projectsDone = projects.filter((item) => item.done).length;
  const projectsPct = percent(projectsDone, projects.length);

  const totalSources = [schedulePct];
  totalSources.push(trackerPct);
  if (projects.length > 0) totalSources.push(projectsPct);
  const totalPct = Math.round(totalSources.reduce((sum, value) => sum + value, 0) / totalSources.length);

  const openTile = (key) => {
    if (!isMobile) return;
    setActiveTile(key);
  };

  const closeTile = () => {
    setActiveTile(null);
  };

  const handleTileClick = (key, event) => {
    if (!isMobile || activeTile === key) return;

    const target = event.target;
    if (target instanceof Element && target.closest("button, input, form, label, ul, li")) {
      return;
    }

    openTile(key);
  };

  const updateTileTitle = (key, value) => {
    setTileTitles((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const addScheduleItem = (event) => {
    event.preventDefault();

    if (!selectedDay) return;

    const title = scheduleInput.title.trim();
    const { start, end } = scheduleInput;
    if (!title || !start || !end) return;

    if (minutesBetween(start, end) <= 0) {
      return;
    }

    setDaySchedules((prev) => ({
      ...prev,
      [selectedDay]: [
        ...(prev[selectedDay] || []),
        {
          id: createId(),
          title,
          start,
          end,
          done: false
        }
      ]
    }));

    setScheduleInput({ title: "", start: "", end: "" });
  };

  const toggleScheduleItem = (day, id, checked) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: (prev[day] || []).map((item) => (item.id === id ? { ...item, done: checked } : item))
    }));
  };

  const removeScheduleItem = (day, id) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((item) => item.id !== id)
    }));

    if (editingScheduleId === id) {
      setEditingScheduleId(null);
      setEditingScheduleInput({ title: "", start: "", end: "" });
    }
  };

  const startEditScheduleItem = (item) => {
    setEditingScheduleId(item.id);
    setEditingScheduleInput({
      title: item.title,
      start: item.start,
      end: item.end
    });
  };

  const cancelEditScheduleItem = () => {
    setEditingScheduleId(null);
    setEditingScheduleInput({ title: "", start: "", end: "" });
  };

  const saveEditScheduleItem = (day, id) => {
    const title = editingScheduleInput.title.trim();
    const { start, end } = editingScheduleInput;
    if (!title || !start || !end) return;

    if (minutesBetween(start, end) <= 0) {
      return;
    }

    setDaySchedules((prev) => ({
      ...prev,
      [day]: (prev[day] || []).map((item) =>
        item.id === id
          ? {
              ...item,
              title,
              start,
              end
            }
          : item
      )
    }));

    setEditingScheduleId(null);
    setEditingScheduleInput({ title: "", start: "", end: "" });
  };

  const addTrackerItem = (event) => {
    event.preventDefault();
    const name = trackerInput.trim();
    if (!name) return;

    setTrackerItems((prev) => [
      ...prev,
      {
        id: createId(),
        name,
        dots: Array(TRACKER_DOTS_PER_ITEM).fill(false)
      }
    ]);
    setTrackerInput("");
  };

  const toggleTrackerDot = (itemId, dotIndex) => {
    setTrackerItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              dots: item.dots.map((value, index) => (index === dotIndex ? !value : value))
            }
          : item
      )
    );
  };

  const removeTrackerItem = (itemId) => {
    setTrackerItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const addProject = (event) => {
    event.preventDefault();
    const name = projectInput.trim();
    if (!name) return;

    setProjects((prev) => [
      ...prev,
      {
        id: createId(),
        name,
        done: false
      }
    ]);
    setProjectInput("");
  };

  const toggleProject = (id, checked) => {
    setProjects((prev) => prev.map((item) => (item.id === id ? { ...item, done: checked } : item)));
  };

  const removeProject = (id) => {
    setProjects((prev) => prev.filter((item) => item.id !== id));
  };

  const tileClass = (key, baseClass) => {
    const activeClass = activeTile === key ? " active" : "";
    return `tile ${baseClass}${activeClass}`;
  };

  const selectedDayItems = selectedDay ? daySchedules[selectedDay] || [] : [];

  return (
    <>
      {showSplash && (
        <section className="splash-screen" role="dialog" aria-label="Welcome screen" onClick={() => setShowSplash(false)}>
          <div className="splash-content">
            <h1>MK App</h1>
          </div>
        </section>
      )}

      <main className="app">
        <header className="intro">
          <h1>MK App</h1>
          <a className="download-app-btn" href={APP_DOWNLOAD_URL} target="_blank" rel="noreferrer">
            Download App
          </a>
        </header>

        <section className="palette-grid">
          <article className={tileClass("midnight", "tile-midnight")} onClick={(event) => handleTileClick("midnight", event)}>
            <header className="tile-head">
              <input
                className="tile-title-input"
                type="text"
                value={tileTitles.midnight}
                onChange={(event) => updateTileTitle("midnight", event.target.value)}
                placeholder=""
                aria-label="Midnight title"
              />
              <p>Schedule</p>
              <button type="button" className="tile-open" aria-expanded={activeTile === "midnight"} onClick={() => openTile("midnight")}>
                Open
              </button>
            </header>
            <div className="tile-body">
              <button type="button" className="tile-close" onClick={closeTile}>
                ← Back
              </button>

              {!selectedDay ? (
                <div className="day-tabs day-picker">
                  {DAYS.map((day) => (
                    <button key={day} type="button" className="day-tab day-picker-button" onClick={() => setSelectedDay(day)}>
                      {day}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div className="day-schedule-head">
                    <button
                      type="button"
                      className="day-back"
                      onClick={() => {
                        setSelectedDay(null);
                        setScheduleInput({ title: "", start: "", end: "" });
                        cancelEditScheduleItem();
                      }}
                    >
                      ← Days
                    </button>
                    <strong>{selectedDay}</strong>
                  </div>

                  <form className="schedule-form" onSubmit={addScheduleItem}>
                    <input
                      type="text"
                      placeholder={`Task for ${selectedDay}`}
                      value={scheduleInput.title}
                      onChange={(event) => setScheduleInput((prev) => ({ ...prev, title: event.target.value }))}
                      required
                    />
                    <input
                      type="time"
                      value={scheduleInput.start}
                      onChange={(event) => setScheduleInput((prev) => ({ ...prev, start: event.target.value }))}
                      required
                    />
                    <input
                      type="time"
                      value={scheduleInput.end}
                      onChange={(event) => setScheduleInput((prev) => ({ ...prev, end: event.target.value }))}
                      required
                    />
                    <button type="submit">Add</button>
                  </form>

                  <ul className="tile-list">
                    {selectedDayItems.map((item) => (
                      <li key={item.id} className="item-row">
                        {editingScheduleId === item.id ? (
                          <>
                            <div className="schedule-edit-grid">
                              <input
                                type="text"
                                value={editingScheduleInput.title}
                                onChange={(event) =>
                                  setEditingScheduleInput((prev) => ({
                                    ...prev,
                                    title: event.target.value
                                  }))
                                }
                              />
                              <input
                                type="time"
                                value={editingScheduleInput.start}
                                onChange={(event) =>
                                  setEditingScheduleInput((prev) => ({
                                    ...prev,
                                    start: event.target.value
                                  }))
                                }
                              />
                              <input
                                type="time"
                                value={editingScheduleInput.end}
                                onChange={(event) =>
                                  setEditingScheduleInput((prev) => ({
                                    ...prev,
                                    end: event.target.value
                                  }))
                                }
                              />
                            </div>
                            <div className="row-actions">
                              <button type="button" className="row-action" onClick={() => saveEditScheduleItem(selectedDay, item.id)}>
                                Save
                              </button>
                              <button type="button" className="row-action" onClick={cancelEditScheduleItem}>
                                Cancel
                              </button>
                              <button className="danger row-action" type="button" onClick={() => removeScheduleItem(selectedDay, item.id)}>
                                ×
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <label className="item-main">
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={(event) => toggleScheduleItem(selectedDay, item.id, event.target.checked)}
                              />
                              <span className={item.done ? "done" : ""}>
                                {item.start && item.end ? `${item.start} - ${item.end} • ${item.title}` : item.title}
                              </span>
                            </label>
                            <div className="row-actions">
                              <button type="button" className="row-action" onClick={() => startEditScheduleItem(item)}>
                                Edit
                              </button>
                              <button className="danger row-action" type="button" onClick={() => removeScheduleItem(selectedDay, item.id)}>
                                ×
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </article>

          <article className={tileClass("pearl", "tile-pearl")} onClick={(event) => handleTileClick("pearl", event)}>
            <header className="tile-head">
              <input
                className="tile-title-input"
                type="text"
                value={tileTitles.pearl}
                onChange={(event) => updateTileTitle("pearl", event.target.value)}
                placeholder="Tracker"
                aria-label="Pearl title"
              />
              <p>Tracker</p>
              <button type="button" className="tile-open" aria-expanded={activeTile === "pearl"} onClick={() => openTile("pearl")}>
                Open
              </button>
            </header>
            <div className="tile-body">
              <button type="button" className="tile-close" onClick={closeTile}>
                ← Back
              </button>

              <form className="mini-form" onSubmit={addTrackerItem}>
                <input
                  type="text"
                  placeholder="Add tracker"
                  value={trackerInput}
                  onChange={(event) => setTrackerInput(event.target.value)}
                  required
                />
                <button type="submit">Add</button>
              </form>

              <ul className="tile-list tracker-list">
                {trackerItems.map((item) => (
                  <li key={item.id} className="item-row tracker-row">
                    <span className="tracker-name">{item.name}</span>
                    <div className="tracker-actions">
                      <div className="tracker-dots" role="group" aria-label={`${item.name} tracker dots`}>
                        {item.dots.map((isFilled, index) => (
                          <button
                            key={`${item.id}-${index}`}
                            type="button"
                            className={`tracker-dot${isFilled ? " filled" : ""}`}
                            onClick={() => toggleTrackerDot(item.id, index)}
                            aria-label={`${item.name} dot ${index + 1}`}
                            aria-pressed={isFilled}
                          />
                        ))}
                      </div>
                      <button className="danger tracker-remove" type="button" onClick={() => removeTrackerItem(item.id)}>
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className={tileClass("noir", "tile-noir")} onClick={(event) => handleTileClick("noir", event)}>
            <header className="tile-head">
              <input
                className="tile-title-input"
                type="text"
                value={tileTitles.noir}
                onChange={(event) => updateTileTitle("noir", event.target.value)}
                placeholder=""
                aria-label="Noir title"
              />
              <p>Projects</p>
              <button type="button" className="tile-open" aria-expanded={activeTile === "noir"} onClick={() => openTile("noir")}>
                Open
              </button>
            </header>
            <div className="tile-body">
              <button type="button" className="tile-close" onClick={closeTile}>
                ← Back
              </button>
              <form className="mini-form" onSubmit={addProject}>
                <input
                  type="text"
                  placeholder="Add a project"
                  value={projectInput}
                  onChange={(event) => setProjectInput(event.target.value)}
                  required
                />
                <button type="submit">Add</button>
              </form>
              <ul className="tile-list">
                {projects.map((project) => (
                  <li key={project.id} className="item-row">
                    <label className="item-main">
                      <input
                        type="checkbox"
                        checked={project.done}
                        onChange={(event) => toggleProject(project.id, event.target.checked)}
                      />
                      <span className={project.done ? "done" : ""}>{project.name}</span>
                    </label>
                    <button className="danger" type="button" onClick={() => removeProject(project.id)}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className={tileClass("ocean", "tile-ocean")} onClick={(event) => handleTileClick("ocean", event)}>
            <header className="tile-head">
              <input
                className="tile-title-input"
                type="text"
                value={tileTitles.ocean}
                onChange={(event) => updateTileTitle("ocean", event.target.value)}
                placeholder=""
                aria-label="Ocean title"
              />
              <p>Progress</p>
              <button type="button" className="tile-open" aria-expanded={activeTile === "ocean"} onClick={() => openTile("ocean")}>
                Open
              </button>
            </header>
            <div className="tile-body">
              <button type="button" className="tile-close" onClick={closeTile}>
                ← Back
              </button>

              <div className="progress-group">
                <div className="progress-head">
                  <span>Schedule</span>
                  <strong>{schedulePct}%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${schedulePct}%` }}></div>
                </div>
              </div>

              <div className="progress-group">
                <div className="progress-head">
                  <span>Tracker</span>
                  <strong>{trackerPct}%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill habit" style={{ width: `${trackerPct}%` }}></div>
                </div>
              </div>

              <div className="progress-group">
                <div className="progress-head">
                  <span>Projects</span>
                  <strong>{projectsPct}%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill project" style={{ width: `${projectsPct}%` }}></div>
                </div>
              </div>

              <div className="progress-group">
                <div className="progress-head">
                  <span>Total progress</span>
                  <strong>{totalPct}%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill total" style={{ width: `${totalPct}%` }}></div>
                </div>
              </div>

              <div className="progress-group">
                <div className="progress-head">
                  <span>Schedule bar</span>
                </div>
                <div className="schedule-bar">
                  {DAYS.map((day) => {
                    const entries = daySchedules[day] || [];
                    const filled = entries.length > 0;
                    const dayDuration = entries.reduce((sum, item) => sum + Math.max(0, minutesBetween(item.start, item.end)), 0);
                    const subtitle = entries.length
                      ? `${entries.length} task${entries.length > 1 ? "s" : ""}${dayDuration ? ` • ${dayDuration} min` : ""}`
                      : "empty";

                    return (
                      <div key={day} className={`bar-segment${filled ? " filled" : ""}`} title={`${day}: ${subtitle}`}>
                        {day.slice(0, 3)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}
