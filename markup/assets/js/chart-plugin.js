function safeGrad(ctx, area, colors, horizontal = false) {
  // 안전하게 area가 준비되지 않았으면 단일 컬러 리턴
  if (!area || area.left === undefined || area.right === undefined) {
    return colors[0].color;
  }
  const { left, right, top, bottom } = area;

  // horizontal true => 세로 그라데이션(위->아래), 아니면 가로(왼->오)
  const g = horizontal
    ? ctx.createLinearGradient(0, top, 0, bottom)
    : ctx.createLinearGradient(left, 0, right, 0);

  colors.forEach((c) => g.addColorStop(c.stop, c.color));
  return g;
}

const hideNullPointsPlugin = {
  id: "hideNullPoints",
  beforeDatasetsDraw(chart) {
    chart.data.datasets.forEach((dataset) => {
      if (dataset.type !== "line") return;
      const data = dataset.data;
      if (!Array.isArray(data)) return;
      // ensure array radii so we can mutate per point
      if (!Array.isArray(dataset.pointRadius)) {
        dataset.pointRadius = data.map(() => dataset.pointRadius || 6);
      }
      if (!Array.isArray(dataset.pointHoverRadius)) {
        dataset.pointHoverRadius = data.map(
          () => dataset.pointHoverRadius || 8
        );
      }
      dataset.pointRadius = data.map((val, idx) =>
        val === null ? 0 : dataset.pointRadius[idx]
      );
      dataset.pointHoverRadius = data.map((val, idx) =>
        val === null ? 0 : dataset.pointHoverRadius[idx]
      );
    });
  },
};

const highlightXFactory = (label, color = cssVar("--bg-chart-highlight")) => ({
  id: `highlightX_${label}`,
  beforeDatasetsDraw(chart) {
    if (!chart.chartArea) return;
    const {
      ctx,
      chartArea,
      scales: { x },
      data,
    } = chart;
    const i = data.labels.indexOf(label);
    if (i === -1) return;
    let w = x.getPixelForValue(i + 1) - x.getPixelForValue(i);
    if (isNaN(w) && i > 0)
      w = x.getPixelForValue(i) - x.getPixelForValue(i - 1);
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(
      x.getPixelForValue(i) - w / 2,
      chartArea.top,
      w,
      chartArea.bottom - chartArea.top
    );
    ctx.restore();
  },
});

function createMixedValuePlugin(padding = 10) {
  return {
    id: "mixedValuePlugin",
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;

      // 모든 데이터 포인트의 위치와 텍스트 영역 수집
      const barPositions = [];
      const linePositions = [];
      // 모든 라인 포인트 좌표 수집
      const pointPositions = [];
      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        if (dataset.type !== "line" || !meta || !meta.data) return;

        meta.data.forEach((point, index) => {
          const value = dataset.data[index];
          // null이나 undefined일 때만 제외 (0은 포함)
          if (value === null || value === undefined) return;
          // 0일 때도 제외
          //if (value === 0) return;

          const radius = Array.isArray(dataset.pointRadius)
            ? (dataset.pointRadius[index] ?? 3)
            : (dataset.pointRadius ?? 3);

          pointPositions.push({
            x: point.x,
            y: point.y,
            radius,
          });
        });
      });

      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        if (!meta || !meta.data) return;

        meta.data.forEach((element, index) => {
          const value = dataset.data[index];
          // null이나 undefined일 때만 제외 (0은 포함)
          if (value === null || value === undefined) return;
          // 0일 때도 제외
          //if (value === 0) return;

          const textValue = String(value);
          ctx.font = "bold 1.2rem Arial";
          const textWidth = ctx.measureText(textValue).width;
          const textHeight = 20;

          // 기본 위치 설정
          let baseY;
          if (dataset.type === "bar") {
            baseY = element.y; // 막대는 막대 상단에 딱 붙여서
          } else if (dataset.type === "line") {
            baseY = element.y - padding; // 라인은 점 위에
          }

          const pos = {
            datasetIndex: i,
            elementIndex: index,
            element: element,
            value: value,
            type: dataset.type,
            x: element.x,
            y: baseY,
            originalY: baseY,
            textWidth: textWidth,
            textHeight: textHeight,
          };

          // 타입별로 분리 저장
          if (dataset.type === "bar") {
            barPositions.push(pos);
          } else if (dataset.type === "line") {
            linePositions.push(pos);
          }
        });
      });

      // 텍스트와 라인 포인트(블렛) 겹침 확인 함수
      const checkTextPointOverlap = (textPos, point) => {
        const xThreshold = 10; // 같은 x 위치로 간주
        const sameX = Math.abs(textPos.x - point.x) < xThreshold;

        if (!sameX) return false;

        const textHalfWidth = textPos.textWidth / 2;
        const textBottom = textPos.y;
        const textTop = textPos.y - 20; // 텍스트 높이
        const expandedRadius = point.radius + 3;

        const dx = Math.abs(textPos.x - point.x);
        const dy = Math.abs(textPos.y - point.y);

        // 텍스트 영역과 포인트 영역이 겹치는지 확인
        return dx < textHalfWidth + expandedRadius && dy < expandedRadius + 10;
      };

      // 겹침 여부 확인 함수 (같은 x 위치에서만 체크)
      const checkOverlapSameX = (pos1, pos2) => {
        const threshold = 25;
        const xThreshold = 10; // 같은 x로 간주하는 범위
        const sameX = Math.abs(pos1.x - pos2.x) < xThreshold;
        const yOverlap = Math.abs(pos1.y - pos2.y) < threshold;
        return sameX && yOverlap;
      };

      // 0단계: 막대 텍스트가 라인 포인트와 겹치는지 확인하고 조정 (같은 x 위치에서만)
      barPositions.forEach((barPos) => {
        pointPositions.forEach((point) => {
          if (checkTextPointOverlap(barPos, point)) {
            // 막대 텍스트를 포인트보다 위로 이동
            barPos.y = point.y - point.radius - 5;
          }
        });
      });

      // 1단계: 같은 x 위치에서 막대와 라인이 겹치는 경우만 처리
      linePositions.forEach((linePos) => {
        barPositions.forEach((barPos) => {
          if (checkOverlapSameX(linePos, barPos)) {
            // 라인을 막대보다 위로 이동
            linePos.y = barPos.y - 20;
          }
        });
      });

      // 2단계: 같은 x 위치에서 라인끼리 겹치는 경우 처리
      for (let i = 0; i < linePositions.length; i++) {
        for (let j = i + 1; j < linePositions.length; j++) {
          if (checkOverlapSameX(linePositions[i], linePositions[j])) {
            // 뒤에 있는 라인을 위로 이동
            linePositions[j].y = linePositions[i].y - 20;
          }
        }
      }

      // 3단계: 같은 x 위치에서 막대끼리 겹치는 경우 처리
      for (let i = 0; i < barPositions.length; i++) {
        for (let j = i + 1; j < barPositions.length; j++) {
          if (checkOverlapSameX(barPositions[i], barPositions[j])) {
            // 뒤에 있는 막대를 위로 이동
            barPositions[j].y = barPositions[i].y - 20;
          }
        }
      }

      // 실제 렌더링: 막대 먼저, 라인 나중에 (라인이 위에 그려지도록)
      const allPositions = [...barPositions, ...linePositions];

      allPositions.forEach((pos) => {
        const dataset = chart.data.datasets[pos.datasetIndex];

        ctx.save();
        ctx.font = "bold 1.2rem Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        const textValue = String(pos.value);

        if (dataset.type === "bar") {
          ctx.strokeStyle = "white";
          ctx.lineWidth = 3;
          ctx.fillStyle = cssVar("--chart-mixbar");
          ctx.strokeText(textValue, pos.x, pos.y);
          ctx.fillText(textValue, pos.x, pos.y);
        } else if (dataset.type === "line") {
          ctx.strokeStyle = "white";
          ctx.lineWidth = 3;
          ctx.fillStyle = cssVar("--chart-mixline");
          ctx.strokeText(textValue, pos.x, pos.y);
          ctx.fillText(textValue, pos.x, pos.y);
        }

        ctx.restore();
      });
    },
  };
}
function createMixedPointGradientPlugin(gradientColors) {
  return {
    id: "mixedPointGradient",
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (dataset.type !== "line" || !meta || !meta.data) return;
        meta.data.forEach((point, index) => {
          const { x, y } = point;
          const radius = Array.isArray(dataset.pointRadius)
            ? (dataset.pointRadius[index] ?? 3)
            : (dataset.pointRadius ?? 3);
          if (radius === 0) return;
          const gradCenterX = x - radius + 2 * radius * 0.3333;
          const gradCenterY = y - radius + 2 * radius * 0.3333;
          const outerRadius = radius * 0.7862;
          const gradient = ctx.createRadialGradient(
            gradCenterX,
            gradCenterY,
            0,
            gradCenterX,
            gradCenterY,
            outerRadius
          );
          (
            gradientColors || [
              { stop: 0.1475, color: cssVar("--bg-chart-mixbullet01") },
              { stop: 0.5805, color: cssVar("--bg-chart-mixbullet02") },
              { stop: 0.9277, color: cssVar("--bg-chart-mixbullet03") },
            ]
          ).forEach((c) => gradient.addColorStop(c.stop, c.color));
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          // drop-shadow 적용
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // 외곽선
          ctx.strokeStyle = "rgba(255,255,255)";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.restore();
        });
      });
    },
  };
}

function createPointGradientPluginWithBorder(datasetColors = {}) {
  return {
    id: "pointGradientWithBorder",
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;

      // 모든 텍스트 위치 수집
      const textPositions = [];

      // 1단계: 포인트 그리기 및 초기 텍스트 위치 수집
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta || meta.type !== "line" || meta.hidden) return;

        meta.data.forEach((point, index) => {
          if (point === undefined || dataset.data[index] === null) return;
          const { x, y } = point;
          const value = dataset.data[index];

          const radius = Array.isArray(dataset.pointRadius)
            ? (dataset.pointRadius[index] ?? 3)
            : (dataset.pointRadius ?? 3);
          if (radius === 0) return;

          // 그라데이션을 포인트 중심에서 시작
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

          const colors = datasetColors[dataset.label];
          if (colors && Array.isArray(colors)) {
            colors.forEach((c) => gradient.addColorStop(c.stop, c.color));
          } else {
            if (datasetIndex === 0) {
              gradient.addColorStop(0, cssVar("--bg-chart-line01-bullet01"));
              gradient.addColorStop(
                0.690678,
                cssVar("--bg-chart-line01-bullet02")
              );
              gradient.addColorStop(1, cssVar("--bg-chart-line01-bullet03"));
            } else if (datasetIndex === 1) {
              gradient.addColorStop(0, cssVar("--bg-chart-line02-bullet01"));
              gradient.addColorStop(
                0.690678,
                cssVar("--bg-chart-line02-bullet02")
              );
              gradient.addColorStop(1, cssVar("--bg-chart-line02-bullet03"));
            }
          }

          ctx.save();

          // 포인트 그리기
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();

          // drop-shadow 적용
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // 외곽선
          ctx.strokeStyle = "rgba(255,255,255)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();

          // 텍스트 위치 정보 저장 (null이 아니면 0도 포함)
          if (value !== null && value !== undefined) {
            ctx.font = "bold 1.2rem Arial";
            const textValue = String(value);
            const textWidth = ctx.measureText(textValue).width;

            textPositions.push({
              x: x,
              y: y - radius - 10,
              originalY: y - radius - 10,
              value: textValue,
              datasetIndex: datasetIndex,
              textWidth: textWidth,
              radius: radius,
            });
          }
        });
      });

      // 2단계: 겹침 확인 및 조정
      const checkOverlap = (pos1, pos2) => {
        const xThreshold = 10;
        const yThreshold = 25;
        const sameX = Math.abs(pos1.x - pos2.x) < xThreshold;
        const yOverlap = Math.abs(pos1.y - pos2.y) < yThreshold;
        return sameX && yOverlap;
      };

      // 겹치는 텍스트 위치 조정
      for (let i = 0; i < textPositions.length; i++) {
        for (let j = 0; j < i; j++) {
          if (checkOverlap(textPositions[i], textPositions[j])) {
            // 뒤에 있는 텍스트를 위로 이동
            textPositions[i].y = textPositions[j].y - 20;
          }
        }
      }

      // 3단계: 텍스트 렌더링
      textPositions.forEach((pos) => {
        ctx.save();
        ctx.font = "bold 1.2rem Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        // 텍스트 색상 (datasetIndex에 따라)
        if (pos.datasetIndex === 0) {
          ctx.fillStyle = cssVar("--stat-individual01") || "#7c108f";
        } else if (pos.datasetIndex === 1) {
          ctx.fillStyle = cssVar("--stat-individual02") || "#2b8f10";
        } else {
          ctx.fillStyle = "#000";
        }

        // 텍스트 외곽선 (가독성 향상)
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.strokeText(pos.value, pos.x, pos.y);
        ctx.fillText(pos.value, pos.x, pos.y);

        ctx.restore();
      });
    },
  };
}

const totalCenterPluginFactory = (labelText = "총") => ({
  id: `totalCenter_${labelText}`,
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    const meta = chart.getDatasetMeta(0);
    if (meta && meta.data && meta.data.length > 0) {
      const innerRadius = meta.data[0].innerRadius;
      if (innerRadius > 5) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius - 5, 0, Math.PI * 2);
        ctx.fillStyle = "#F5F5F0";
        ctx.fill();
      }
    }
    // 텍스트만 표시
    ctx.font = "bold 20px -apple-system, sans-serif";
    ctx.fillStyle = "#121212";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, centerX, centerY);
    ctx.restore();
  },
});

const externalLabelPlugin = {
  id: "externalLabel",
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data) return;
    const total = dataset.data.reduce((a, b) => a + b, 0);
    const labels = chart.data.labels;
    const labelHeight = 22;
    const smallThreshold = 0.05;

    // 라벨 정보 수집
    const labelInfos = meta.data.map((arc, index) => {
      const value = dataset.data[index];
      const percentage = Math.round((value / total) * 100);
      const { startAngle, endAngle, innerRadius, outerRadius } = arc;
      const midAngle = (startAngle + endAngle) / 2;
      const isSmall = value / total < smallThreshold;
      const isLeft = midAngle > Math.PI / 2 && midAngle < Math.PI * 1.5;

      const baseR = outerRadius + 15;
      const baseX = arc.x + Math.cos(midAngle) * baseR;
      const baseY = arc.y + Math.sin(midAngle) * baseR;

      return {
        index,
        value,
        percentage,
        midAngle,
        innerRadius,
        outerRadius,
        arcX: arc.x,
        arcY: arc.y,
        isSmall,
        isLeft,
        baseX,
        baseY,
        finalX: baseX,
        finalY: baseY,
        needsLine: false,
      };
    });

    // 충돌 감지 및 조정
    const placedLabels = [];

    labelInfos.forEach((info) => {
      if (!info.isSmall) {
        placedLabels.push({
          x: info.baseX,
          y: info.baseY,
          height: labelHeight,
        });
        return;
      }

      let finalY = info.baseY;
      let needsLine = false;
      let offset = 0;

      for (const placed of placedLabels) {
        const dy = Math.abs(finalY - placed.y);
        const dx = Math.abs(info.baseX - placed.x);

        if (dx < 150 && dy < labelHeight) {
          offset += labelHeight;
          needsLine = true;
        }
      }

      if (offset > 0) {
        finalY = info.baseY + offset;
        info.needsLine = true;
      }

      info.finalX = info.baseX;
      info.finalY = finalY;
      placedLabels.push({
        x: info.finalX,
        y: info.finalY,
        height: labelHeight,
      });
    });

    // 라벨 그리기
    labelInfos.forEach((info) => {
      const {
        index,
        value,
        percentage,
        midAngle,
        innerRadius,
        outerRadius,
        arcX,
        arcY,
        isLeft,
        finalX,
        finalY,
        needsLine,
      } = info;
      const sectionColor = dataset.backgroundColor[index];

      ctx.save();

      if (needsLine) {
        // 지시선 - 도넛 중앙에서 시작
        const lineStartR = (innerRadius + outerRadius) / 2;
        const lineX1 = arcX + Math.cos(midAngle) * lineStartR;
        const lineY1 = arcY + Math.sin(midAngle) * lineStartR;

        // 바깥 지점
        const lineEndR = outerRadius + 10;
        const lineX2 = arcX + Math.cos(midAngle) * lineEndR;
        const lineY2 = arcY + Math.sin(midAngle) * lineEndR;

        // 수직으로 아래로 내려가는 선
        // const textStartX = isLeft ? finalX + 5 : finalX - 5;

        // 시작점 점 (bullet)
        ctx.beginPath();
        ctx.arc(lineX1, lineY1, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#333";
        ctx.fill();

        //ctx.strokeStyle = sectionColor;
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lineX1, lineY1);
        ctx.lineTo(lineX2, lineY2);
        ctx.lineTo(lineX2, finalY); // 수직으로 아래로
        // ctx.lineTo(textStartX, finalY); // 수평으로 텍스트까지
        ctx.stroke();
      }

      // 텍스트
      ctx.textAlign = isLeft ? "right" : "left";
      ctx.textBaseline = "middle";
      ctx.font = "bold 18px -apple-system, sans-serif";
      ctx.fillStyle = sectionColor;
      ctx.fillText(
        `${labels[index]} ${value} (${percentage}%)`,
        finalX,
        finalY
      );

      ctx.restore();
    });
  },
};

// 값 표시 플러그인 (게이지 차트용 - 좁은 공간은 라인으로 외부 표시)
const gaugeValuePlugin = {
  id: "gaugeValuePlugin",
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    const total = dataset.data.slice(0, 5).reduce((a, b) => a + b, 0);
    const smallThreshold = 0.08; // 8% 이하면 라인으로 외부 표시

    ctx.save();

    // 1. 먼저 반원 아래 긴 라인 그리기
    if (meta && meta.data && meta.data.length > 0) {
      const firstArc = meta.data[0];
      const centerX = firstArc.x;
      const centerY = firstArc.y;
      const outerRadius = firstArc.outerRadius;

      // 반원보다 양쪽 12px씩 긴 라인
      const lineY = centerY;
      const lineStartX = centerX - outerRadius - 12;
      const lineEndX = centerX + outerRadius + 12;

      ctx.strokeStyle = "rgba(0, 0, 0, 0.40)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lineStartX, lineY);
      ctx.lineTo(lineEndX, lineY);
      ctx.stroke();
    }

    meta.data.forEach((arc, index) => {
      if (index >= 5) return; // 처음 5개만 (주차 데이터)

      const value = dataset.data[index];
      if (!value || value === 0) return;

      const { startAngle, endAngle, innerRadius, outerRadius } = arc;
      const midAngle = (startAngle + endAngle) / 2;
      const percentage = value / total;
      const isSmall = percentage < smallThreshold;

      if (isSmall) {
        // 좁은 공간: 블렛 + 라인 + 외부 텍스트
        const bulletR = (innerRadius + outerRadius) / 1.75;
        const bulletX = arc.x + Math.cos(midAngle) * bulletR;
        const bulletY = arc.y + Math.sin(midAngle) * bulletR;

        // 블렛 그리기 (흰색 테두리 + 검정 채우기)
        ctx.beginPath();
        ctx.arc(bulletX, bulletY, 3, 0, Math.PI * 2);

        // 흰색 테두리
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 검정 채우기
        ctx.fillStyle = "#333";
        ctx.fill();

        // 점선 끝점 (외부)
        const lineEndR = outerRadius + 20;
        const lineEndX = arc.x + Math.cos(midAngle) * lineEndR;
        const lineEndY = arc.y + Math.sin(midAngle) * lineEndR;

        // 텍스트 위치 (라인보다 더 밖)
        const textR = outerRadius + 30;
        const textX = arc.x + Math.cos(midAngle) * textR;
        const textY = arc.y + Math.sin(midAngle) * textR;

        // 라인 그리기
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]); // 점선 패턴
        ctx.beginPath();
        ctx.moveTo(bulletX, bulletY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();
        ctx.setLineDash([]); // 점선 해제

        // 텍스트 (검정 테두리 + 흰색 채우기)
        ctx.font = "bold 2rem -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 그림자 제거
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;

        // 검정 테두리
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.strokeText(value, textX, textY);

        // 흰색 채우기
        ctx.fillStyle = "#fff";
        ctx.fillText(value, textX, textY);
      } else {
        // 넓은 공간: 내부에 텍스트
        ctx.font = "bold 2rem Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const radius = (innerRadius + outerRadius) / 2;
        const x = arc.x + Math.cos(midAngle) * radius;
        const y = arc.y + Math.sin(midAngle) * radius;

        // 그림자 제거
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;

        // 검정 테두리
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.strokeText(value, x, y);

        // 흰색 채우기
        ctx.fillStyle = "#fff";
        ctx.fillText(value, x, y);
      }
    });

    ctx.restore();
  },
};
