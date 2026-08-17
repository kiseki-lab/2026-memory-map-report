const timelineLayout = document.querySelector(".timeline-layout");
const connector = document.querySelector(".timeline-connector");
const connectorPath = connector?.querySelector("path");
const entries = [...document.querySelectorAll(".timeline-list--madebymoriumi .timeline-entry")];
const dateButtons = [...document.querySelectorAll(".date-rail [data-target], .calendar-panel [data-target]")];
const monthSections = [...document.querySelectorAll(".mini-month[data-month]")];
const timelineList = document.querySelector(".timeline-list--madebymoriumi");
const calendarMonths = document.querySelector(".calendar-months");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const outputsToggle = document.querySelector(".outputs-toggle");
const outputsPanel = document.querySelector("#outputs-panel");

const ENTRY_MARKER_OFFSET = 34;
const ENTRY_MARKER_SIZE = 10;

let activeEntry = null;
let frameRequested = false;
let selectionLockUntil = 0;
let calendarScrollTarget = null;
let timelineLoopRunning = false;
const CALENDAR_SCROLL_EASE = 0.14;

function buttonsFor(entry) {
  if (!entry) return [];

  return dateButtons.filter((button) => {
    if (button.dataset.target === entry.id) return true;
    const targetEntry = document.getElementById(button.dataset.target);
    return targetEntry?.dataset.date === entry.dataset.date;
  });
}

function calendarButtonFor(entry) {
  if (!entry) return null;

  return [...document.querySelectorAll(".calendar-panel [data-target]")].find((button) => {
    if (button.dataset.target === entry.id) return true;
    const targetEntry = document.getElementById(button.dataset.target);
    return targetEntry?.dataset.date === entry.dataset.date;
  }) ?? null;
}

function setActiveMonth(entry) {
  const month = Number(entry?.dataset.date?.split(".")[0]);
  const visibleMonth = Math.max(3, Math.min(8, month || 3));

  monthSections.forEach((section) => {
    section.classList.toggle("active", Number(section.dataset.month) === visibleMonth);
  });
}

function resetVideoToPoster(video) {
  video.pause();
  video.currentTime = 0;
  video.load();
  video.dataset.timelineStarted = "false";
}

function playVideosForEntry(entry) {
  entry.querySelectorAll("video").forEach((video) => {
    if (video.dataset.timelineBound !== "true") {
      video.dataset.timelineBound = "true";
      video.addEventListener("ended", () => resetVideoToPoster(video));
    }

    if (video.dataset.timelineStarted === "true") return;

    video.muted = true;
    video.dataset.timelineStarted = "true";
    const playRequest = video.play();
    playRequest?.catch(() => {
      video.dataset.timelineStarted = "false";
    });
  });
}

function entryMarkerCenter(entry) {
  const entryRect = entry.getBoundingClientRect();
  const listRect = timelineList.getBoundingClientRect();
  return {
    x: listRect.left,
    y: entryRect.top + ENTRY_MARKER_OFFSET + ENTRY_MARKER_SIZE / 2,
  };
}

function calendarScrollTargetFor(entry) {
  if (!calendarMonths) return null;

  const calendarButton = calendarButtonFor(entry);
  if (!calendarButton) return null;

  const monthsRect = calendarMonths.getBoundingClientRect();
  const buttonRect = calendarButton.getBoundingClientRect();
  const buttonCenter = buttonRect.top - monthsRect.top + calendarMonths.scrollTop + buttonRect.height / 2;
  const maxScrollTop = calendarMonths.scrollHeight - calendarMonths.clientHeight;
  return Math.max(0, Math.min(buttonCenter - calendarMonths.clientHeight / 2, maxScrollTop));
}

function setCalendarTargetForEntry(entry, { immediate = false } = {}) {
  if (window.innerWidth <= 760) return;

  const target = calendarScrollTargetFor(entry);
  if (target === null) return;

  calendarScrollTarget = target;
  if (immediate && calendarMonths) {
    calendarMonths.scrollTop = target;
  }
  startTimelineLoop();
}

function startTimelineLoop() {
  if (timelineLoopRunning) return;
  timelineLoopRunning = true;
  requestAnimationFrame(timelineLoopTick);
}

function timelineLoopTick() {
  const layoutRect = timelineLayout?.getBoundingClientRect();
  const inView = layoutRect && layoutRect.bottom > 0 && layoutRect.top < window.innerHeight;
  const desktop = window.innerWidth > 760;

  if (desktop && inView) {
    if (calendarMonths && calendarScrollTarget !== null) {
      const diff = calendarScrollTarget - calendarMonths.scrollTop;
      if (Math.abs(diff) < 0.5) {
        calendarMonths.scrollTop = calendarScrollTarget;
      } else if (reducedMotion.matches) {
        calendarMonths.scrollTop = calendarScrollTarget;
      } else {
        calendarMonths.scrollTop += diff * CALENDAR_SCROLL_EASE;
      }
    }

    updateConnector();
    requestAnimationFrame(timelineLoopTick);
    return;
  }

  timelineLoopRunning = false;
  connectorPath?.setAttribute("d", "");
}

function setActiveEntry(entry) {
  if (!entry) return;

  const entryChanged = entry !== activeEntry;

  if (entryChanged) {
    activeEntry?.classList.remove("active");
    buttonsFor(activeEntry).forEach((button) => {
      button.classList.remove("active");
      button.removeAttribute("aria-current");
    });

    activeEntry = entry;
    activeEntry.classList.add("active");
    setActiveMonth(activeEntry);
    playVideosForEntry(activeEntry);

    buttonsFor(activeEntry).forEach((button) => {
      button.classList.add("active");
      button.setAttribute("aria-current", "date");
    });
  }

  if (window.innerWidth <= 760) {
    const railButton = buttonsFor(activeEntry).find((button) => button.closest(".date-rail"));
    const rail = railButton?.closest(".date-rail");

    if (rail && railButton) {
      const railRect = rail.getBoundingClientRect();
      const buttonRect = railButton.getBoundingClientRect();
      const targetLeft = rail.scrollLeft + buttonRect.left - railRect.left - (railRect.width - buttonRect.width) / 2;

      rail.scrollTo({
        left: Math.max(0, Math.min(targetLeft, rail.scrollWidth - rail.clientWidth)),
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });
    }
  } else if (entryChanged) {
    setCalendarTargetForEntry(activeEntry);
  }
}

function updateConnector() {
  if (!timelineLayout || !connector || !connectorPath || !timelineList || !activeEntry || window.innerWidth <= 760) {
    return;
  }

  const layoutRect = timelineLayout.getBoundingClientRect();
  if (layoutRect.bottom <= 0 || layoutRect.top >= window.innerHeight) {
    connectorPath.setAttribute("d", "");
    return;
  }

  const calendarButton = calendarButtonFor(activeEntry);
  if (!calendarButton) {
    connectorPath.setAttribute("d", "");
    return;
  }

  const buttonRect = calendarButton.getBoundingClientRect();
  const marker = entryMarkerCenter(activeEntry);
  const width = window.innerWidth;
  const height = window.innerHeight;

  connector.setAttribute("width", String(width));
  connector.setAttribute("height", String(height));
  connector.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const startX = buttonRect.left + buttonRect.width / 2;
  const startY = buttonRect.top + buttonRect.height / 2;
  const endX = marker.x;
  const endY = marker.y;

  connectorPath.setAttribute(
    "d",
    `M ${startX} ${startY} L ${endX} ${endY}`,
  );
}

function updateActiveEntryFromViewport() {
  if (Date.now() < selectionLockUntil || !timelineLayout || !entries.length) return;

  const layoutRect = timelineLayout.getBoundingClientRect();
  if (layoutRect.bottom <= 0 || layoutRect.top >= window.innerHeight) return;

  const viewportCenter = window.innerHeight / 2;
  const entryAtCenter = entries.find((entry) => {
    const rect = entry.getBoundingClientRect();
    return rect.top <= viewportCenter && rect.bottom >= viewportCenter;
  });

  const nearestEntry = entryAtCenter ?? entries.reduce((nearest, entry) => {
    const rect = entry.getBoundingClientRect();
    const entryCenter = rect.top + rect.height / 2;
    const nearestRect = nearest.getBoundingClientRect();
    const nearestCenter = nearestRect.top + nearestRect.height / 2;
    return Math.abs(entryCenter - viewportCenter) < Math.abs(nearestCenter - viewportCenter)
      ? entry
      : nearest;
  });

  setActiveEntry(nearestEntry);
}

function requestTimelineUpdate() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(() => {
    frameRequested = false;
    updateActiveEntryFromViewport();
    startTimelineLoop();
  });
}

dateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const entry = document.getElementById(button.dataset.target);
    if (!entry) return;
    selectionLockUntil = Date.now() + 900;
    setActiveEntry(entry);
    setCalendarTargetForEntry(entry);
    entry.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  });
});

if (entries[0]) {
  setActiveEntry(entries[0]);
  setCalendarTargetForEntry(entries[0], { immediate: true });
}

window.addEventListener("scroll", requestTimelineUpdate, { passive: true });
window.addEventListener("resize", requestTimelineUpdate);
if (timelineLayout) {
  new ResizeObserver(requestTimelineUpdate).observe(timelineLayout);
}
requestTimelineUpdate();
startTimelineLoop();

outputsToggle?.addEventListener("click", () => {
  const isOpen = outputsToggle.getAttribute("aria-expanded") === "true";
  outputsToggle.setAttribute("aria-expanded", String(!isOpen));
  outputsToggle.classList.toggle("is-open", !isOpen);
  outputsPanel.hidden = isOpen;
  outputsToggle.querySelector("span:first-child").textContent = isOpen ? "表示する" : "閉じる";
});

document.querySelectorAll(".mini-month[data-month]").forEach((month) => {
  const monthNumber = Number(month.dataset.month);
  month.querySelectorAll("button[data-target]").forEach((button) => {
    button.type = "button";
    button.setAttribute("aria-label", `2026年${monthNumber}月${button.textContent.trim()}日の活動を見る`);
  });
});

const carouselRows = [...document.querySelectorAll("[data-carousel]")];

carouselRows.forEach((row, index) => {
  const prepareVideos = (scope) => {
    scope.querySelectorAll("video").forEach((video) => {
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      const playRequest = video.play();
      if (playRequest && typeof playRequest.catch === "function") {
        playRequest.catch(() => {});
      }
    });
  };

  prepareVideos(row);
  const originals = [...row.children];
  originals.forEach((item) => {
    const copy = item.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("img").forEach((image) => image.setAttribute("alt", ""));
    row.append(copy);
  });
  prepareVideos(row);

  let animationFrame;
  let lastTimestamp;
  let scrollPosition = 0;
  // Row 1 (development) scrolls right; row 2 (production) scrolls left — opposite directions.
  const direction = index === 0 ? -1 : 1;
  const speed = index === 0 ? 42 : 34;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function animate(timestamp) {
    if (!reducedMotion.matches && !document.hidden) {
      const elapsed = lastTimestamp ? timestamp - lastTimestamp : 0;
      const halfWidth = row.scrollWidth / 2;
      if (halfWidth > 0) {
        scrollPosition += direction * (speed * elapsed) / 1000;
        if (scrollPosition >= halfWidth) scrollPosition -= halfWidth;
        if (scrollPosition < 0) scrollPosition += halfWidth;
        row.scrollLeft = scrollPosition;
      }
    }
    lastTimestamp = timestamp;
    animationFrame = requestAnimationFrame(animate);
  }

  reducedMotion.addEventListener("change", () => {
    scrollPosition = 0;
    row.scrollLeft = 0;
  });
  animationFrame = requestAnimationFrame(animate);
});
