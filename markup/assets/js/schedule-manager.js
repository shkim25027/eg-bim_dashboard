class ScheduleManager {
  constructor() {
    this.lastActiveItem = null;
    this.updateInterval = 60 * 1000; // 1분
  }

  /**
   * 현재 시간을 분 단위로 변환
   */
  getCurrentTimeInMinutes() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return { now, minutes };
  }

  /**
   * 시간 문자열(HH:MM)을 분으로 변환
   */
  parseTimeToMinutes(timeString) {
    const [hour, minute] = timeString.split(":").map(Number);
    return hour * 60 + minute;
  }

  /**
   * 항목의 시간 범위 가져오기
   */
  getItemTimeRange(item) {
    const { start, end } = item.dataset;

    if (!start || !end) return null;

    return {
      start: this.parseTimeToMinutes(start),
      end: this.parseTimeToMinutes(end),
    };
  }

  /**
   * 항목의 상태 결정 (active, completed, upcoming)
   */
  determineItemStatus(timeRange, currentMinutes) {
    if (currentMinutes >= timeRange.start && currentMinutes <= timeRange.end) {
      return "active";
    }
    return currentMinutes > timeRange.end ? "completed" : "upcoming";
  }

  /**
   * 배지 업데이트
   */
  updateBadge(item, shouldShow) {
    const existingBadge = item.querySelector(".current-time-badge");

    if (shouldShow && !existingBadge) {
      const badge = document.createElement("span");
      badge.className = "current-time-badge";
      badge.textContent = "진행중";
      item.appendChild(badge);
    } else if (!shouldShow && existingBadge) {
      existingBadge.remove();
    }
  }

  /**
   * 항목의 CSS 클래스 업데이트
   */
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

  /**
   * 개별 항목 상태 업데이트
   */
  updateItemState(item, currentMinutes) {
    const timeRange = this.getItemTimeRange(item);

    if (!timeRange) return false;

    const status = this.determineItemStatus(timeRange, currentMinutes);
    const isActive = status === "active";

    this.updateItemClasses(item, status);
    // this.updateBadge(item, isActive);

    return isActive;
  }

  /**
   * 요소로 부드럽게 스크롤
   */
  scrollToElement(container, element, offset = 20) {
    if (!element) return;

    container.scrollTo({
      top: element.offsetTop - offset,
      behavior: "smooth",
    });
  }

  /**
   * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
   */
  getTodayDateString(date) {
    return date.toISOString().split("T")[0];
  }

  /**
   * 특정 카드의 모든 항목 업데이트
   */
  updateCardItems(card, currentMinutes) {
    let firstActive = null;

    card.querySelectorAll(".day-list li").forEach((item) => {
      const isActive = this.updateItemState(item, currentMinutes);

      // 첫 번째 active 항목만 저장 (스크롤용)
      if (isActive && !firstActive) {
        firstActive = item;
      }
    });

    return firstActive;
  }

  /**
   * 모든 날짜 카드 처리
   */
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

  /**
   * 필요시 스크롤 실행
   */
  handleAutoScroll(firstActive, todayCard) {
    const weekBox = document.querySelector(".week-box");

    if (!weekBox) return;

    if (firstActive && firstActive !== this.lastActiveItem) {
      this.scrollToElement(weekBox, firstActive);
      this.lastActiveItem = firstActive;
    } else if (!firstActive && todayCard) {
      this.scrollToElement(weekBox, todayCard);
    }
  }

  /**
   * 스케줄 체크 및 업데이트
   */
  checkSchedule(shouldScroll = false) {
    const { now, minutes: currentMinutes } = this.getCurrentTimeInMinutes();
    const todayString = this.getTodayDateString(now);

    const { firstActive, todayCard } = this.processAllCards(
      todayString,
      currentMinutes
    );

    if (shouldScroll) {
      this.handleAutoScroll(firstActive, todayCard);
    }
  }

  /**
   * 초기화 및 주기적 업데이트 시작
   */
  initialize() {
    // 초기 실행
    this.checkSchedule(true);

    // 주기적 업데이트
    setInterval(() => this.checkSchedule(true), this.updateInterval);
  }
}
