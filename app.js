const STORAGE_KEY = "mkPlannerData_v1";
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const state = {
  weeklySchedule: {},
  habits: [],
  projects: [],
};

const weekList = document.getElementById("week-list");
const habitForm = document.getElementById("habit-form");
const projectForm = document.getElementById("project-form");
const habitList = document.getElementById("habit-list");
const projectList = document.getElementById("project-list");
const scheduleBar = document.getElementById("schedule-bar");

const scheduleProgressFill = document.getElementById("schedule-progress-fill");
const scheduleProgressText = document.getElementById("schedule-progress-text");
const habitProgressFill = document.getElementById("habit-progress-fill");
const habitProgressText = document.getElementById("habit-progress-text");
const projectProgressFill = document.getElementById("project-progress-fill");
const projectProgressText = document.getElementById("project-progress-text");
const totalProgressFill = document.getElementById("total-progress-fill");
const totalProgressText = document.getElementById("total-progress-text");
const habitTemplate = document.getElementById("habit-item-template");
const projectTemplate = document.getElementById("project-item-template");
const tiles = Array.from(document.querySelectorAll(".tile"));
const tileOpenButtons = Array.from(document.querySelectorAll(".js-open-tile"));
const tileCloseButtons = Array.from(document.querySelectorAll(".js-close-tile"));
const mobileLayoutQuery = window.matchMedia("(max-width: 760px)");

function emptyWeeklySchedule() {
  return DAYS.reduce((acc, day) => {
    acc[day] = "";
    return acc;
  }, {});
}

function ensureWeeklyScheduleShape() {
  const normalized = emptyWeeklySchedule();
  if (state.weeklySchedule && typeof state.weeklySchedule === "object") {
    for (const day of DAYS) {
      const value = state.weeklySchedule[day];
      normalized[day] = typeof value === "string" ? value : "";
    }
  }
  state.weeklySchedule = normalized;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.weeklySchedule =
      parsed.weeklySchedule && typeof parsed.weeklySchedule === "object"
        ? parsed.weeklySchedule
        : {};
    state.habits = Array.isArray(parsed.habits) ? parsed.habits : [];
    state.projects = Array.isArray(parsed.projects) ? parsed.projects : [];
  } catch {
    state.weeklySchedule = {};
    state.habits = [];
    state.projects = [];
  }

  ensureWeeklyScheduleShape();
}

function percent(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function renderWeeklySchedule() {
  weekList.innerHTML = "";

  for (const day of DAYS) {
    const row = document.createElement("label");
    row.className = "week-row";

    const dayLabel = document.createElement("span");
    dayLabel.className = "week-day";
    dayLabel.textContent = day;

    const input = document.createElement("input");
    input.className = "week-input";
    input.type = "text";
    input.placeholder = "Clique ici pour écrire";
    input.value = state.weeklySchedule[day] || "";

    input.addEventListener("input", () => {
      state.weeklySchedule[day] = input.value;
      save();
      renderScheduleBar();
      renderProgress();
    });

    row.append(dayLabel, input);
    weekList.appendChild(row);
  }
}

function renderHabits() {
  habitList.innerHTML = "";

  for (const habit of state.habits) {
    const node = habitTemplate.content.firstElementChild.cloneNode(true);
    const check = node.querySelector(".js-habit-check");
    const label = node.querySelector(".js-habit-label");
    const del = node.querySelector(".js-delete-habit");

    check.checked = Boolean(habit.done);
    label.textContent = habit.name;
    label.classList.toggle("done", Boolean(habit.done));

    check.addEventListener("change", () => {
      habit.done = check.checked;
      label.classList.toggle("done", Boolean(habit.done));
      save();
      renderProgress();
    });

    del.addEventListener("click", () => {
      state.habits = state.habits.filter((h) => h.id !== habit.id);
      save();
      renderAll();
    });

    habitList.appendChild(node);
  }
}

function renderProjects() {
  projectList.innerHTML = "";

  for (const project of state.projects) {
    const node = projectTemplate.content.firstElementChild.cloneNode(true);
    const check = node.querySelector(".js-project-check");
    const label = node.querySelector(".js-project-label");
    const del = node.querySelector(".js-delete-project");

    check.checked = Boolean(project.done);
    label.textContent = project.name;
    label.classList.toggle("done", Boolean(project.done));

    check.addEventListener("change", () => {
      project.done = check.checked;
      label.classList.toggle("done", Boolean(project.done));
      save();
      renderProgress();
    });

    del.addEventListener("click", () => {
      state.projects = state.projects.filter((item) => item.id !== project.id);
      save();
      renderAll();
    });

    projectList.appendChild(node);
  }
}

function renderScheduleBar() {
  scheduleBar.innerHTML = "";
  for (const day of DAYS) {
    const segment = document.createElement("div");
    segment.className = "bar-segment";
    const value = (state.weeklySchedule[day] || "").trim();
    const shortDay = day.slice(0, 3);
    segment.textContent = shortDay;
    segment.title = value ? `${day}: ${value}` : `${day}: vide`;
    segment.classList.toggle("filled", Boolean(value));
    scheduleBar.appendChild(segment);
  }
}

function setProgress(fillEl, textEl, value) {
  fillEl.style.width = `${value}%`;
  textEl.textContent = `${value}%`;
}

function renderProgress() {
  const scheduleDone = DAYS.filter((day) => (state.weeklySchedule[day] || "").trim().length > 0).length;
  const schedulePct = percent(scheduleDone, DAYS.length);

  const habitsDone = state.habits.filter((x) => x.done).length;
  const habitsPct = percent(habitsDone, state.habits.length);

  const projectsDone = state.projects.filter((x) => x.done).length;
  const projectsPct = percent(projectsDone, state.projects.length);

  const totalSources = [schedulePct];
  if (state.habits.length > 0) totalSources.push(habitsPct);
  if (state.projects.length > 0) totalSources.push(projectsPct);

  const totalPct = totalSources.length
    ? Math.round(totalSources.reduce((sum, value) => sum + value, 0) / totalSources.length)
    : 0;

  setProgress(scheduleProgressFill, scheduleProgressText, schedulePct);
  setProgress(habitProgressFill, habitProgressText, habitsPct);
  setProgress(projectProgressFill, projectProgressText, projectsPct);
  setProgress(totalProgressFill, totalProgressText, totalPct);
}

function renderAll() {
  renderWeeklySchedule();
  renderHabits();
  renderProjects();
  renderScheduleBar();
  renderProgress();
}

function closeAllTiles() {
  for (const tile of tiles) {
    tile.classList.remove("active");
  }

  for (const button of tileOpenButtons) {
    button.setAttribute("aria-expanded", "false");
  }

  document.body.classList.remove("mobile-tile-open");
}

function openTile(tile) {
  if (!mobileLayoutQuery.matches) return;

  closeAllTiles();
  tile.classList.add("active");
  const openButton = tile.querySelector(".js-open-tile");
  if (openButton) {
    openButton.setAttribute("aria-expanded", "true");
  }

  document.body.classList.add("mobile-tile-open");
}

function setupMobileTileMode() {
  for (const tile of tiles) {
    tile.addEventListener("click", (event) => {
      if (!mobileLayoutQuery.matches) return;
      if (tile.classList.contains("active")) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest("button, input, label, form, ul, li")) return;
      openTile(tile);
    });
  }

  for (const button of tileOpenButtons) {
    button.addEventListener("click", () => {
      const tile = button.closest(".tile");
      if (!tile) return;

      if (tile.classList.contains("active")) {
        closeAllTiles();
        return;
      }

      openTile(tile);
    });
  }

  for (const button of tileCloseButtons) {
    button.addEventListener("click", () => {
      closeAllTiles();
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllTiles();
    }
  });

  window.addEventListener("resize", () => {
    if (!mobileLayoutQuery.matches) {
      closeAllTiles();
    }
  });
}

habitForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const habitInput = document.getElementById("habit-name");
  const name = habitInput.value.trim();
  if (!name) return;

  state.habits.push({
    id: crypto.randomUUID(),
    name,
    done: false,
  });

  save();
  renderAll();
  habitForm.reset();
});

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const projectInput = document.getElementById("project-name");
  const name = projectInput.value.trim();
  if (!name) return;

  state.projects.push({
    id: crypto.randomUUID(),
    name,
    done: false,
  });

  save();
  renderAll();
  projectForm.reset();
});

load();
renderAll();
setupMobileTileMode();
