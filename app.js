const timelineList = document.getElementById("timeline");
const notificationStack = document.getElementById("notification-stack");
const daySelector = document.getElementById("day-selector");
const selectedDayLabel = document.getElementById("selected-day-label");
const selectedDayRange = document.getElementById("selected-day-range");

const START_MINUTES = 8 * 60;
const END_MINUTES = 23 * 60;
const NOTIFICATION_MIN_DELAY = 2500;
const NOTIFICATION_MAX_DELAY = 2500;
const DAY_RANGE_TEXT = "08:00 – 23:00";

const unlockEvent = { type: "unlock", label: "Phone unlocked" };
const lockEvent = { type: "lock", label: "Phone locked" };

const activityPool = [
  "Started messaging",
  "Opened social media",
  "Checked notifications",
  "Replied to emails",
  "Browsed the web",
  "Watched a short clip",
  "Checked the calendar",
  "Updated a note",
  "Opened a productivity app",
  "Joined a quick call",
  "Looked at navigation",
  "Set a reminder",
  "Reviewed to-do list",
  "Captured a photo",
  "Listened to music"
];

const iconTokens = {
  unlock: "UN",
  lock: "LK",
  activity: "AP"
};

const notificationLogoSrc =
  "https://i.ibb.co/tThkkJSs/Chat-GPT-Image-15-2025-01-20-23.png";

let notificationTimer = null;
let notificationIndex = 0;
let notificationEvents = [];
let activeDayId = null;

const dayConfigs = buildDayConfigs();
const dayConfigById = new Map(dayConfigs.map((config) => [config.id, config]));
const dayButtons = new Map();
const dayEventsById = new Map();

function buildDayConfigs(count = 6) {
  const configs = [];
  const today = new Date();
  const displayCount = Math.max(count, 2);

  const dayFormatter = new Intl.DateTimeFormat("en-US", { day: "2-digit" });
  const weekdayShortFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const weekdayLongFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });
  const summaryFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

  for (let offset = displayCount - 1; offset >= 1; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    configs.push(createConfig(date, false));
  }

  configs.push(createConfig(today, true));

  return configs;

  function createConfig(date, isToday) {
    const id = date.toISOString().slice(0, 10);
    const buttonPrimary = isToday ? "Today" : dayFormatter.format(date);
    const buttonSecondary = weekdayShortFormatter.format(date);
    const summaryLabel = isToday ? "Today" : summaryFormatter.format(date);
    const weekdayLong = weekdayLongFormatter.format(date);
    const weekdayShort = weekdayShortFormatter.format(date);
    return {
      id,
      date,
      isToday,
      buttonPrimary,
      buttonSecondary,
      summaryLabel,
      weekdayLong,
      weekdayShort
    };
  }
}

function createDayButton(config) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.dayId = config.id;

  const ariaLabel = config.isToday
    ? `Today (${config.weekdayLong})`
    : config.summaryLabel;
  button.setAttribute("aria-label", ariaLabel);

  const primary = document.createElement("strong");
  primary.textContent = config.buttonPrimary;

  const secondary = document.createElement("span");
  secondary.textContent = config.buttonSecondary;

  button.append(primary, secondary);
  return button;
}

function renderDaySelector(configs) {
  if (!daySelector) {
    return;
  }

  daySelector.innerHTML = "";
  dayButtons.clear();

  configs.forEach((config) => {
    const button = createDayButton(config);
    dayButtons.set(config.id, button);
    button.addEventListener("click", () => {
      if (config.id !== activeDayId) {
        setActiveDay(config.id);
      }
    });
    daySelector.appendChild(button);
  });
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toTimeString(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function pickActivity() {
  return activityPool[randomBetween(0, activityPool.length - 1)];
}

function addEvent(events, timeMinutes, baseEvent, customLabel) {
  const minutes = Math.min(timeMinutes, END_MINUTES);
  events.push({
    timeMinutes: minutes,
    displayTime: toTimeString(minutes),
    type: baseEvent.type,
    label: customLabel ?? baseEvent.label
  });
}

function generateTimeline() {
  const events = [];
  let cursor = START_MINUTES;

  while (cursor < END_MINUTES) {
    addEvent(events, cursor, unlockEvent);
    cursor += randomBetween(1, 4);

    if (cursor >= END_MINUTES) {
      addEvent(events, END_MINUTES, lockEvent);
      break;
    }

    const activityCount = randomBetween(1, 3);
    for (let i = 0; i < activityCount && cursor < END_MINUTES; i += 1) {
      const activityLabel = pickActivity();
      addEvent(events, cursor, { type: "activity", label: activityLabel }, activityLabel);
      cursor += randomBetween(1, 5);
    }

    addEvent(events, cursor, lockEvent);
    cursor += randomBetween(6, 14);
  }

  const lastEvent = events[events.length - 1];
  if (!lastEvent || lastEvent.timeMinutes < END_MINUTES) {
    addEvent(events, END_MINUTES, lockEvent);
  } else if (lastEvent.type !== "lock") {
    addEvent(events, END_MINUTES, lockEvent);
  }

  return events
    .sort((a, b) => a.timeMinutes - b.timeMinutes)
    .filter((event, index, arr) => {
      if (index === 0) {
        return true;
      }
      const previous = arr[index - 1];
      return !(previous.timeMinutes === event.timeMinutes && previous.label === event.label);
    });
}

function ensureDayEvents(dayId) {
  if (!dayEventsById.has(dayId)) {
    dayEventsById.set(dayId, generateTimeline());
  }
  return dayEventsById.get(dayId);
}

function renderNotificationCard(event) {
  if (!notificationStack) {
    return;
  }

  const previousCard = notificationStack.querySelector(".notification-card");
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (previousCard) {
    previousCard.classList.remove("enter");
    previousCard.classList.add("leave");

    if (prefersReducedMotion) {
      previousCard.remove();
    } else {
      previousCard.addEventListener(
        "transitionend",
        () => {
          previousCard.remove();
        },
        { once: true }
      );
    }
  }

  const card = document.createElement("article");
  card.className = "notification-card";

  const left = document.createElement("div");
  left.className = "notification-left";

  const iconBox = document.createElement("div");
  iconBox.className = "notification-icon-box";

  const logo = document.createElement("img");
  logo.className = "notification-logo";
  logo.src = notificationLogoSrc;
  logo.alt = "";
  iconBox.appendChild(logo);

  const body = document.createElement("div");
  body.className = "notification-body";

  const title = document.createElement("span");
  title.className = "notification-title";
  title.textContent = "New message";

  const text = document.createElement("span");
  text.className = "notification-text";
  text.textContent = event.label;

  body.append(title, text);
  left.append(iconBox, body);

  const time = document.createElement("span");
  time.className = "notification-time";
  time.textContent = event.displayTime;

  card.append(left, time);
  notificationStack.appendChild(card);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.classList.add("enter");
    });
  });
}

function scheduleNextNotification() {
  if (!notificationEvents.length) {
    return;
  }

  const delay = randomBetween(NOTIFICATION_MIN_DELAY, NOTIFICATION_MAX_DELAY);
  notificationTimer = window.setTimeout(() => {
    const event = notificationEvents[notificationIndex % notificationEvents.length];
    renderNotificationCard(event);
    notificationIndex += 1;
    scheduleNextNotification();
  }, delay);
}

function startNotificationLoop(events, options = {}) {
  if (!notificationStack) {
    return;
  }

  const { restart = false, resetIndex = false, clearStack = false, syncIndex = false } = options;
  const safeEvents = Array.isArray(events) ? events : [];

  notificationEvents = safeEvents;

  if (!notificationEvents.length) {
    if (notificationTimer) {
      window.clearTimeout(notificationTimer);
      notificationTimer = null;
    }
    return;
  }

  if (resetIndex) {
    notificationIndex = 0;
  } else if (syncIndex) {
    notificationIndex = notificationIndex % notificationEvents.length;
  }

  if (notificationIndex < 0) {
    notificationIndex = 0;
  }

  if (clearStack) {
    notificationStack.innerHTML = "";
  }

  if (restart && notificationTimer) {
    window.clearTimeout(notificationTimer);
    notificationTimer = null;
  }

  if (restart || notificationTimer === null) {
    scheduleNextNotification();
  }
}

function setActiveDay(dayId) {
  const config = dayConfigById.get(dayId);
  if (!config) {
    return;
  }

  activeDayId = dayId;

  dayButtons.forEach((button, id) => {
    button.classList.toggle("active", id === dayId);
  });

  if (selectedDayLabel) {
    selectedDayLabel.textContent = config.summaryLabel;
  }

  if (selectedDayRange) {
    selectedDayRange.textContent = `${config.weekdayLong} · ${DAY_RANGE_TEXT}`;
  }

  const events = ensureDayEvents(dayId);
  renderTimeline(events);
  const shouldRestart = notificationTimer === null;
  startNotificationLoop(events, {
    resetIndex: shouldRestart,
    restart: shouldRestart,
    clearStack: shouldRestart,
    syncIndex: !shouldRestart
  });
}

function renderTimeline(events) {
  if (!timelineList) {
    return;
  }

  timelineList.innerHTML = "";

  const fragment = document.createDocumentFragment();

  events.forEach((event) => {
    const listItem = document.createElement("li");

    const time = document.createElement("span");
    time.className = "timeline-time";
    time.textContent = event.displayTime;

    const icon = document.createElement("span");
    icon.className = `timeline-icon ${event.type}`;
    icon.textContent = iconTokens[event.type] ?? "";

    const description = document.createElement("p");
    description.className = "timeline-description";
    description.textContent = event.label;

    listItem.append(time, icon, description);
    fragment.appendChild(listItem);
  });

  timelineList.appendChild(fragment);
  timelineList.scrollTop = 0;
}

function init() {
  renderDaySelector(dayConfigs);

  const defaultDayId = dayConfigs[dayConfigs.length - 1]?.id;
  if (defaultDayId) {
    setActiveDay(defaultDayId);
  } else {
    const fallbackEvents = generateTimeline();
    renderTimeline(fallbackEvents);
    startNotificationLoop(fallbackEvents, {
      restart: true,
      resetIndex: true,
      clearStack: true
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
