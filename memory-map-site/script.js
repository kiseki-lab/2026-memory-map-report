const timelineLayout = document.querySelector(".timeline-layout");
const connector = document.querySelector(".timeline-connector");
const connectorPath = connector?.querySelector("path");
const entries = [...document.querySelectorAll(".timeline-entry")];
const dateButtons = [...document.querySelectorAll("[data-target]")];
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
  const visibleMonth = Math.max(4, Math.min(7, month || 4));

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
    railButton?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
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
  const width = window.innerWidth;
  const height = window.innerHeight;

  connector.setAttribute("width", String(width));
  connector.setAttribute("height", String(height));
  connector.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const startX = buttonRect.left + buttonRect.width / 2;
  const startY = buttonRect.top + buttonRect.height / 2;
  const endX = listRect.left;
  const endY = entryRect.top + 20;

  connectorPath.setAttribute(
    "d",
    `M ${startX} ${startY} L ${endX} ${endY}`,
  );
}

function requestConnectorUpdate() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(() => {
    frameRequested = false;
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

const observer = new IntersectionObserver(
  (observedEntries) => {
    if (Date.now() < selectionLockUntil) return;

    const visible = observedEntries
      .filter((item) => item.isIntersecting)
      .sort((a, b) => Math.abs(a.boundingClientRect.top - window.innerHeight * 0.55) - Math.abs(b.boundingClientRect.top - window.innerHeight * 0.55));

    if (visible[0]) setActiveEntry(visible[0].target);
  },
  { rootMargin: "-10% 0px -30% 0px", threshold: 0 },
);

entries.forEach((entry) => observer.observe(entry));
activeEntry?.classList.add("active");
setActiveMonth(activeEntry);
buttonsFor(activeEntry).forEach((button) => {
  button.classList.add("active");
  button.setAttribute("aria-current", "date");
});

window.addEventListener("scroll", requestConnectorUpdate, { passive: true });
window.addEventListener("resize", requestConnectorUpdate);
new ResizeObserver(requestConnectorUpdate).observe(timelineLayout);
requestConnectorUpdate();
