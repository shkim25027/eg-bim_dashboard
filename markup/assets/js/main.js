import { DashboardData } from "./data-manager.js";
import { YearlyChart } from "./chart-yearly.js";
import { MonthlyChart } from "./chart-monthly.js";
import { IndividualChart } from "./chart-individual.js";
import { SalesChart } from "./chart-sales.js";
import { ScheduleManager } from "./schedule-manager.js";

class DashboardApp {
  constructor() {
    this.dataManager = new DashboardData();
    this.charts = {};
    this.scheduleManager = null;
  }

  async init() {
    try {
      // 데이터 로드
      await this.dataManager.fetchData();

      // 차트 초기화
      this.initCharts();

      // 스케줄 관리자 초기화
      this.scheduleManager = new ScheduleManager(".main-weekly");

      // 이벤트 리스너 등록
      this.attachEventListeners();

      console.log("대시보드 초기화 완료");
    } catch (error) {
      console.error("대시보드 초기화 실패:", error);
      this.showError("데이터를 불러오는데 실패했습니다.");
    }
  }

  initCharts() {
    const yearlyData = this.dataManager.getYearlyData();
    this.charts.yearly = new YearlyChart("yearly_chart", yearlyData);

    const monthlyData = this.dataManager.getMonthlyData();
    this.charts.monthly = new MonthlyChart("weekly_chart", monthlyData);

    const kwonData = this.dataManager.getIndividualData("kwon");
    const yeomData = this.dataManager.getIndividualData("yeom");
    this.charts.individual = new IndividualChart("individual_chart", {
      kwon: kwonData,
      yeom: yeomData,
    });

    const industryData = this.dataManager.getSalesData("industry");
    const institutionData = this.dataManager.getSalesData("institution");
    this.charts.sales = new SalesChart(
      {
        industry: "industry_chart",
        institution: "institution_chart",
      },
      {
        industry: industryData,
        institution: institutionData,
      }
    );
  }

  attachEventListeners() {
    // 차트 새로고침 버튼
    document.querySelector(".refresh-btn")?.addEventListener("click", () => {
      this.refreshData();
    });

    // 윈도우 리사이즈 처리
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 250);
    });
  }

  async refreshData() {
    try {
      await this.dataManager.fetchData();

      // 모든 차트 업데이트
      Object.values(this.charts).forEach((chart) => {
        if (chart.update) {
          chart.update();
        }
      });

      console.log("데이터 새로고침 완료");
    } catch (error) {
      console.error("데이터 새로고침 실패:", error);
      this.showError("데이터를 새로고침하는데 실패했습니다.");
    }
  }

  handleResize() {
    Object.values(this.charts).forEach((chart) => {
      if (chart.resize) {
        chart.resize();
      }
    });
  }

  showError(message) {
    // 에러 메시지 표시 로직
    console.error(message);
  }
}

// 앱 초기화
document.addEventListener("DOMContentLoaded", () => {
  const app = new DashboardApp();
  app.init();
});
