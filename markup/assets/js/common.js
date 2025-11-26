// 상수 정의
const MOBILE_BREAKPOINT = 1025;

// 전역 변수
let scrollY;
let wrap;

// 스크린 높이 계산
function syncHeight() {
  document.documentElement.style.setProperty(
    "--window-inner-height",
    `${window.innerHeight}px`
  );
}

// mobile check
function isMobile() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

// body scroll lock
function bodyLock() {
  if (!wrap) {
    console.warn("wrap element not found");
    return;
  }
  scrollY = window.scrollY;
  document.documentElement.classList.add("is-locked");
  document.documentElement.style.scrollBehavior = "auto";
  wrap.style.top = `-${scrollY}px`;
}

// body scroll unlock
function bodyUnlock() {
  document.documentElement.classList.remove("is-locked");
  if (scrollY !== undefined) {
    window.scrollTo(0, scrollY);
  }
  if (wrap) {
    wrap.style.top = "";
  }
  document.documentElement.style.scrollBehavior = "";
}

// popup open
function popOpen(id) {
  const popup = document.getElementById(id);
  if (!popup) {
    console.warn(`Popup with id "${id}" not found`);
    return;
  }
  $("#" + id).fadeIn("fast");
  bodyLock();
}

// popup close
function popClose(obj) {
  $(obj).parents(".popup").fadeOut("fast");
  bodyUnlock();
}

// 🔹 페이지 처음 로드될 때 처리
document.addEventListener("DOMContentLoaded", () => {
  wrap = document.querySelector(".wrap");
  if (!wrap) {
    console.error("Wrap element not found");
    return;
  }
  syncHeight();
});

window.addEventListener("resize", () => {
  syncHeight();
});

const rootStyle = getComputedStyle(document.documentElement);

function cssVar(name) {
  return rootStyle.getPropertyValue(name).trim();
}

function fullScreen() {
  if (!document.fullscreenElement) {
    // 전체화면이 아닐 경우 -> 전체화면으로
    document.documentElement.requestFullscreen().catch((err) => {
      console.log("전체화면 전환 실패:", err);
    });
  } else {
    // 전체화면일 경우 -> 일반 페이지로
    document.exitFullscreen().catch((err) => {
      console.log("전체화면 종료 실패:", err);
    });
  }
}
