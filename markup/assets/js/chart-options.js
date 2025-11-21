var ChartOptions = (function () {
  // 공통 색상 정의
  var colors = {
    gradient: [
      { stop: 0, color: "#918050" },
      { stop: 0.3399, color: "#968860" },
      { stop: 0.4981, color: "#8C7D50" },
      { stop: 1, color: "#6D5A21" },
    ],
    doughnut: ["#249473", "#EC8F53", "#90C9FF", "#C1A770"],
    line: {
      gold: { line: "#918050", fill: "rgba(145,128,80,0.6)" },
      green: { line: "#249473", fill: "rgba(36,148,115,0.6)" },
      orange: { line: "#FF5C00", fill: "rgba(255,92,0,0.1)" },
    },
  };

  // 그라데이션 생성 유틸
  function createGradient(ctx, bar, colorArray, isHorizontal) {
    if (!bar || (isHorizontal ? !bar.height : !bar.width)) {
      return colorArray[0].color;
    }
    var gradient = isHorizontal
      ? ctx.createLinearGradient(0, bar.y, 0, bar.y + bar.height)
      : ctx.createLinearGradient(bar.x, 0, bar.x + bar.width, 0);

    for (var i = 0; i < colorArray.length; i++) {
      gradient.addColorStop(colorArray[i].stop, colorArray[i].color);
    }
    return gradient;
  }

  // 라벨 하이라이트 함수
  function createLabelHighlight(highlightLabel) {
    return {
      color: function (context) {
        return context.tick.label === highlightLabel
          ? "#121212"
          : "rgba(18, 18, 18, 0.60)";
      },
      font: function (context) {
        return context.tick.label === highlightLabel
          ? { weight: "bold", size: 12 }
          : { weight: "normal", size: 12 };
      },
    };
  }

  // 공통 X축 설정
  function getXAxisConfig(config) {
    var highlightLabel = config.highlightLabel || null;
    return {
      grid: { drawTicks: false },
      ticks: highlightLabel
        ? createLabelHighlight(highlightLabel)
        : {
            color: "rgba(18, 18, 18, 0.60)",
          },
      border: {
        display: true,
        dash: [3, 3],
        color: "rgba(0, 0, 0, 0.30)",
        width: 1,
      },
    };
  }

  // 공통 Y축 설정
  function getYAxisConfig(config) {
    return {
      display: config.showYAxis !== false,
      beginAtZero: true,
      suggestedMax: config.maxValue || undefined,
      grid: { color: "#eee" },
      ticks: {
        display: config.showYAxis !== false,
        maxTicksLimit: config.yTickLimit || undefined,
        color: "rgba(18, 18, 18, 0.60)",
      },
    };
  }

  return {
    colors: colors,

    // 세로 막대 차트
    column: function (config) {
      config = config || {};
      return {
        type: "bar",
        options: {
          responsive: true,
          plugins: {
            legend: {
              display:
                config.showLegend !== undefined ? config.showLegend : false,
            },
            tooltip: { enabled: config.showTooltip !== false },
          },
          scales: {
            y: getYAxisConfig(config),
            x: getXAxisConfig(config),
          },
        },
        datasetStyle: function (dataset) {
          return {
            backgroundColor: function (context) {
              var chart = context.chart;
              var meta = chart.getDatasetMeta(context.datasetIndex);
              var bar = meta.data[context.dataIndex];
              return createGradient(chart.ctx, bar, colors.gradient, false);
            },
            borderRadius: config.borderRadius || {
              topLeft: 2,
              topRight: 2,
              bottomLeft: 0,
              bottomRight: 0,
            },
            borderSkipped: false,
          };
        },
      };
    },

    // 복합 차트 (막대 + 라인)
    mixed: function (config) {
      config = config || {};
      return {
        type: "bar",
        options: {
          responsive: true,
          plugins: {
            legend: { display: config.showLegend !== false },
            tooltip: { enabled: config.showTooltip !== false },
          },
          scales: {
            y: getYAxisConfig(config),
            x: getXAxisConfig(config),
          },
        },
        datasetStyle: function (dataset, index) {
          if (dataset.type === "bar") {
            return {
              backgroundColor: function (context) {
                var chart = context.chart;
                var meta = chart.getDatasetMeta(context.datasetIndex);
                var bar = meta.data[context.dataIndex];
                return createGradient(chart.ctx, bar, colors.gradient, false);
              },
              borderRadius: {
                topLeft: 2,
                topRight: 2,
                bottomLeft: 0,
                bottomRight: 0,
              },
              borderSkipped: false,
              yAxisID: "y",
              order: 2,
            };
          } else {
            return {
              borderColor: config.lineColor || "#FF5C00",
              backgroundColor: config.lineFill || "rgba(255,92,0,0.1)",
              borderWidth: config.lineWidth || 2,
              tension: config.tension || 0,
              pointRadius: config.pointRadius || 4,
              pointHoverRadius: config.pointHoverRadius || 6,
              yAxisID: "y",
              order: 1,
            };
          }
        },
      };
    },

    // 라인 + 영역 차트
    lineArea: function (config) {
      config = config || {};
      return {
        type: "line",
        options: {
          responsive: true,
          maintainAspectRatio: true,
          interaction: {
            mode: "index",
            intersect: false,
          },
          plugins: {
            legend: { display: config.showLegend !== false },
            tooltip: { mode: "index", intersect: false },
          },
          layout: {
            padding: config.padding || {
              top: 50,
              bottom: 10,
              left: 30,
              right: 30,
            },
          },
          scales: {
            y: getYAxisConfig(config),
            x: getXAxisConfig(config),
          },
        },
        datasetStyle: function (dataset, index) {
          var colorScheme =
            [colors.line.gold, colors.line.green][index] || colors.line.gold;
          return {
            fill: true,
            backgroundColor: function (context) {
              var chart = context.chart;
              var chartArea = chart.chartArea;
              if (!chartArea) return colorScheme.fill;

              var gradient = chart.ctx.createLinearGradient(
                0,
                chartArea.top,
                0,
                chartArea.bottom
              );
              gradient.addColorStop(0, colorScheme.fill);
              gradient.addColorStop(
                0.8,
                colorScheme.fill.replace(/[\d.]+\)$/g, "0)")
              );
              return gradient;
            },
            borderColor: colorScheme.line,
            borderWidth: config.lineWidth || 2,
            tension: config.tension || 0,
            pointRadius: config.pointRadius || 4,
            pointHoverRadius: config.pointHoverRadius || 6,
            order: index === 0 ? 2 : 1,
          };
        },
      };
    },

    // 가로 막대 차트
    horizontalBar: function (config) {
      config = config || {};
      return {
        type: "bar",
        options: {
          indexAxis: "y",
          responsive: true,
          plugins: {
            legend: {
              display:
                config.showLegend !== undefined ? config.showLegend : false,
            },
            tooltip: { enabled: config.showTooltip !== false },
          },
          scales: {
            x: {
              display: false,
              beginAtZero: true,
              grid: { color: "#eee" },
              ticks: { display: false },
            },
            y: {
              grid: { drawTicks: false },
              border: { display: false },
              ticks: config.highlightLabel
                ? createLabelHighlight(config.highlightLabel)
                : {
                    color: "rgba(18, 18, 18, 0.60)",
                  },
            },
          },
        },
        datasetStyle: function (dataset) {
          return {
            backgroundColor: function (context) {
              var chart = context.chart;
              var meta = chart.getDatasetMeta(context.datasetIndex);
              var bar = meta.data[context.dataIndex];
              return createGradient(chart.ctx, bar, colors.gradient, true);
            },
            borderRadius: {
              topLeft: 0,
              topRight: 8,
              bottomLeft: 0,
              bottomRight: 8,
            },
            borderSkipped: false,
          };
        },
      };
    },

    // 도넛 차트
    doughnut: function (config) {
      config = config || {};
      return {
        type: "doughnut",
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: config.legendPosition || "right",
              labels: {
                font: { size: 14, family: "monospace" },
                padding: 15,
              },
            },
          },
          cutout: config.cutout || "60%",
          rotation: config.rotation || 145,
          layout: {
            padding: config.padding || {
              top: 40,
              bottom: 40,
              left: 40,
              right: 40,
            },
          },
        },
        datasetStyle: function (dataset) {
          return {
            backgroundColor: config.colors || colors.doughnut,
            borderWidth: config.borderWidth || 0,
            circumference: config.circumference || 360,
            rotation: config.dataRotation || 0,
          };
        },
      };
    },
  };
})();
