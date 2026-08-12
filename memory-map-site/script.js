const timelineLayout = document.querySelector(".timeline-layout");
const connector = document.querySelector(".timeline-connector");
const connectorPath = connector?.querySelector("path");
const entries = [...document.querySelectorAll(".timeline-entry")];
const dateButtons = [...document.querySelectorAll(".date-rail [data-target], .calendar-panel [data-target]")];
const monthSections = [...document.querySelectorAll(".mini-month[data-month]")];
const timelineList = document.querySelector(".timeline-list");

let activeEntry = entries[0] ?? null;
let frameRequested = false;
let selectionLockUntil = 0;

function buttonsFor(entry) {
  return dateButtons.filter((button) => button.dataset.target === entry?.id);
}

function setActiveMonth(entry) {
  const month = Number(entry?.dataset.date?.split(".")[0]);
  const visibleMonth = Math.max(4, Math.min(8, month || 4));

  monthSections.forEach((section) => {
    section.classList.toggle("active", Number(section.dataset.month) === visibleMonth);
  });
}

function setActiveEntry(entry) {
  if (!entry || entry === activeEntry) {
    updateConnector();
    return;
  }

  activeEntry?.classList.remove("active");
  buttonsFor(activeEntry).forEach((button) => {
    button.classList.remove("active");
    button.removeAttribute("aria-current");
  });

  activeEntry = entry;
  activeEntry.classList.add("active");
  setActiveMonth(activeEntry);

  buttonsFor(activeEntry).forEach((button) => {
    button.classList.add("active");
    button.setAttribute("aria-current", "date");
  });

  if (window.innerWidth <= 760) {
    const railButton = document.querySelector(`.date-rail [data-target="${activeEntry.id}"]`);
    railButton?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }
  updateConnector();
}

function updateConnector() {
  if (!timelineLayout || !connector || !connectorPath || !timelineList || !activeEntry || window.innerWidth <= 760) {
    return;
  }

  const calendarButton = document.querySelector(`.calendar-panel [data-target="${activeEntry.id}"]`);
  if (!calendarButton) {
    connectorPath.setAttribute("d", "");
    return;
  }

  const buttonRect = calendarButton.getBoundingClientRect();
  const entryRect = activeEntry.getBoundingClientRect();
  const listRect = timelineList.getBoundingClientRect();
  const layoutRect = timelineLayout.getBoundingClientRect();
  const width = timelineLayout.clientWidth;
  const height = timelineLayout.clientHeight;

  connector.setAttribute("width", String(width));
  connector.setAttribute("height", String(height));
  connector.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const startX = buttonRect.left - layoutRect.left + buttonRect.width / 2;
  const startY = buttonRect.top - layoutRect.top + buttonRect.height / 2;
  const endX = listRect.left - layoutRect.left;
  const endY = entryRect.top - layoutRect.top + 20;

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
    updateConnector();
  });
}

dateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const entry = document.getElementById(button.dataset.target);
    if (!entry) return;
    selectionLockUntil = Date.now() + 900;
    setActiveEntry(entry);
    entry.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  });
});

activeEntry?.classList.add("active");
setActiveMonth(activeEntry);
buttonsFor(activeEntry).forEach((button) => {
  button.classList.add("active");
  button.setAttribute("aria-current", "date");
});

window.addEventListener("scroll", requestTimelineUpdate, { passive: true });
window.addEventListener("resize", requestTimelineUpdate);
if (timelineLayout) {
  new ResizeObserver(requestTimelineUpdate).observe(timelineLayout);
}
requestTimelineUpdate();

document.querySelectorAll(".mini-month[data-month]").forEach((month) => {
  const monthNumber = Number(month.dataset.month);
  month.querySelectorAll("button[data-target]").forEach((button) => {
    button.type = "button";
    button.setAttribute("aria-label", `2026年${monthNumber}月${button.textContent.trim()}日の活動を見る`);
  });
});

const carouselRows = [...document.querySelectorAll("[data-carousel]")];
const carouselButtons = [...document.querySelectorAll("[data-carousel-direction]")];

function moveCarousels(direction) {
  const multiplier = direction === "previous" ? -1 : 1;
  carouselRows.forEach((row, index) => {
    const distance = Math.max(280, row.clientWidth * 0.72) * multiplier;
    row.scrollBy({
      left: index % 2 === 0 ? distance : distance * 0.85,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  });
}

carouselButtons.forEach((button) => {
  button.addEventListener("click", () => moveCarousels(button.dataset.carouselDirection));
});

carouselRows.forEach((row) => {
  row.tabIndex = 0;
  row.setAttribute("aria-label", "写真を横方向に閲覧");
  row.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    row.scrollBy({
      left: (event.key === "ArrowLeft" ? -1 : 1) * Math.max(240, row.clientWidth * 0.7),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  });
});
