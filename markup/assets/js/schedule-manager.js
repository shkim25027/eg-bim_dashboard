class ScheduleManager {
  constructor() {
    this.lastActiveItem = null;
    this.updateInterval = 60 * 1000;
  }

  getCurrentTimeInMinutes() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return { now, minutes };
  }

  parseTimeToMinutes(timeString) {
    const [hour, minute] = timeString.split(":").map(Number);
    return hour * 60 + minute;
  }

  /**
   * 항목의 시간 범위 가져오기 (period 기반)
   */
  getItemTimeRange(item) {
    const { start, end, period } = item.dataset;

    // period가 있으면 우선 사용
    if (period) {
      switch (period) {
        case "오전":
          return { start: 0, end: 12 * 60 - 1 }; // 00:00 ~ 11:59
        case "오후":
          return { start: 12 * 60, end: 24 * 60 }; // 12:00 ~ 23:59
        case "종일":
          return { start: 0, end: 24 * 60 }; // 00:00 ~ 23:59
        default:
          break;
      }
    }

    // period가 없으면 기존 방식 (정확한 시간)
    if (!start || !end) return null;

    return {
      start: this.parseTimeToMinutes(start),
      end: this.parseTimeToMinutes(end),
    };
  }

  determineItemStatus(timeRange, currentMinutes) {
    if (currentMinutes >= timeRange.start && currentMinutes <= timeRange.end) {
      return "active";
    }
    return currentMinutes > timeRange.end ? "completed" : "upcoming";
  }

  updateItemClasses(item, status) {
    const classMap = {
      active: { add: ["active"], remove: ["completed"] },
      completed: { add: ["completed"], remove: ["active"] },
      upcoming: { add: [], remove: ["active", "completed"] },
    };

    const { add, remove } = classMap[status];
    item.classList.remove(...remove);
    item.classList.add(...add);
  }

  updateItemState(item, currentMinutes) {
    const timeRange = this.getItemTimeRange(item);
    if (!timeRange) return false;

    const status = this.determineItemStatus(timeRange, currentMinutes);
    const isActive = status === "active";

    this.updateItemClasses(item, status);
    return isActive;
  }

  getTodayDateString(date) {
    return date.toISOString().split("T")[0];
  }

  updateCardItems(card, currentMinutes) {
    let firstActive = null;

    card.querySelectorAll(".day-list li").forEach((item) => {
      const isActive = this.updateItemState(item, currentMinutes);
      if (isActive && !firstActive) {
        firstActive = item;
      }
    });

    return firstActive;
  }

  processAllCards(todayString, currentMinutes) {
    let firstActive = null;
    let todayCard = null;

    document.querySelectorAll(".day-card").forEach((card) => {
      const isToday = card.dataset.date === todayString;
      card.classList.toggle("today", isToday);

      if (isToday) {
        todayCard = card;
        firstActive = this.updateCardItems(card, currentMinutes);
      } else {
        this.updateCardItems(card, currentMinutes);
      }
    });

    return { firstActive, todayCard };
  }

  checkSchedule(shouldScroll = false) {
    const { now, minutes: currentMinutes } = this.getCurrentTimeInMinutes();
    const todayString = this.getTodayDateString(now);
    this.processAllCards(todayString, currentMinutes);
  }

  initialize() {
    this.checkSchedule(true);
    setInterval(() => this.checkSchedule(true), this.updateInterval);
  }
}
