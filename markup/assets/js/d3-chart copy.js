/*
  D3 Super Chart Factory (Enhanced)
  Features added:
  - tooltip support
  - legend (auto)
  - theme: dark / light
  - y-axis grid line styling
  - custom easing selection
  - bar animation detailed options (delay, stagger)
  - top-rounded radius option (rounded top only)
  - pie donut support (innerRadius percent)

  Usage: pass options to constructor. See examples at the end.
*/

class D3SuperChart1 {
  constructor(options) {
    this.opt = Object.assign(
      {
        el: null,
        type: "bar", // bar | bar-h | line | pie | combo
        width: "100%",
        height: 320,
        data: [], // for bar/pie: [..]
        labels: [],
        series: [], // for multi-series line/combo: [{label, values: []}, ...]
        colors: ["#5fb3ff", "#1a73e8", "#ff9f43", "#7bd389"],
        gradient: true,
        roundedTop: false,
        topRadius: 8, // px for rounded top
        responsive: true,
        animation: true,
        duration: 900,
        padding: 0.2,
        // new options
        tooltip: true,
        legend: true,
        theme: "light", // light | dark
        gridLines: { show: true, stroke: "#e6e6e6", strokeWidth: 1 },
        easing: "cubicOut", // name mapped to d3 ease fn
        barAnimation: { stagger: 80, delay: 0 },
        donut: { enabled: false, innerRadius: 0.5 }, // innerRadius as fraction of radius
        xAxis: { show: true },
        yAxis: { show: true, grid: true },
      },
      options
    );

    this.container = d3.select(this.opt.el);
    if (this.container.empty())
      throw new Error("Container not found: " + this.opt.el);

    this._setupTheme();
    this.createSVG();
    if (this.opt.tooltip) this.createTooltip();
    this.render();
    if (this.opt.responsive) this.enableResponsive();
  }

  _setupTheme() {
    const t = this.opt.theme === "dark";
    this.colorsText = t ? "#eaeaea" : "#222";
    this.bg = t ? "#111" : "transparent";
    if (!this.opt.gridLines.stroke)
      this.opt.gridLines.stroke = t ? "#333" : "#e6e6e6";
  }

  createSVG() {
    // remove existing svg if re-init
    this.container.selectAll("svg").remove();
    this.svg = this.container
      .append("svg")
      .attr("width", this.opt.width)
      .attr("height", this.opt.height)
      .style("overflow", "visible")
      .style("background", this.bg);

    if (this.opt.gradient) this.createGradient();
  }

  enableResponsive() {
    const svg = this.svg.node();
    const resizeObserver = new ResizeObserver(() => {
      const w =
        this.container.node().clientWidth ||
        parseInt(getComputedStyle(this.container.node()).width, 10);
      svg.setAttribute("width", w);
      // re-render to reposition elements
      this.svg.selectAll("*").remove();
      if (this.opt.gradient) this.createGradient();
      this.render();
    });
    resizeObserver.observe(this.container.node());
  }

  createGradient() {
    // unique gradient id per instance to avoid collisions
    this.gradId = "d3-super-gradient-" + Math.random().toString(36).slice(2, 9);
    const defs = this.svg.append("defs");

    const grad = defs
      .append("linearGradient")
      .attr("id", this.gradId)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    grad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", this.opt.colors[0])
      .attr("stop-opacity", 1);
    grad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", this.opt.colors[1])
      .attr("stop-opacity", 1);
  }

  // tooltip as absolute positioned div
  createTooltip() {
    // remove existing
    d3.select(this.opt.el).selectAll(".d3-tooltip").remove();
    this.tooltip = d3
      .select(this.opt.el)
      .append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("padding", "6px 8px")
      .style("background", "rgba(0,0,0,0.75)")
      .style("color", "#fff")
      .style("font-size", "12px")
      .style("border-radius", "4px")
      .style("opacity", 0);
  }

  showTooltip(html, event) {
    if (!this.tooltip) return;
    const [x, y] = d3.pointer(event, document.body);
    this.tooltip
      .html(html)
      .style("left", x + 12 + "px")
      .style("top", y + 12 + "px")
      .transition()
      .duration(100)
      .style("opacity", 1);
  }
  hideTooltip() {
    if (!this.tooltip) return;
    this.tooltip.transition().duration(100).style("opacity", 0);
  }

  render() {
    switch (this.opt.type) {
      case "bar":
        this.drawBar();
        break;
      case "bar-h":
        this.drawBarH();
        break;
      case "line":
        this.drawLine();
        break;
      case "pie":
        this.drawPie();
        break;
      case "combo":
        this.drawCombo();
        break;
    }
    if (this.opt.legend) this.renderLegend();
  }

  easingFn(name) {
    const map = {
      linear: d3.easeLinear,
      quadIn: d3.easeQuadIn,
      quadOut: d3.easeQuadOut,
      cubicIn: d3.easeCubicIn,
      cubicOut: d3.easeCubicOut,
      bounce: d3.easeBounceOut,
      elastic: d3.easeElasticOut,
    };
    return map[name] || d3.easeCubicOut;
  }

  roundedTopRect(x, y, w, h, r) {
    // ensure r not larger than half width/height
    const rr = Math.min(r, w / 2, Math.abs(h));
    return `M ${x},${y + rr} a ${rr},${rr} 0 0 1 ${rr},${-rr} h ${w - rr * 2} a ${rr},${rr} 0 0 1 ${rr},${rr} v ${h - rr} h ${-w} Z`;
  }

  drawBar() {
    const o = this.opt;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const w =
      this.container.node().clientWidth || parseInt(this.svg.attr("width"), 10);
    const h = o.height;

    const x = d3
      .scaleBand()
      .domain(o.labels)
      .range([margin.left, w - margin.right])
      .padding(o.padding);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(o.data)])
      .nice()
      .range([h - margin.bottom, margin.top]);

    // grid lines
    if (o.gridLines && o.gridLines.show) {
      const gy = this.svg.append("g").attr("class", "grid-lines");
      gy.selectAll("line")
        .data(y.ticks(5))
        .enter()
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", w - margin.right)
        .attr("y1", (d) => y(d))
        .attr("y2", (d) => y(d))
        .attr("stroke", o.gridLines.stroke)
        .attr("stroke-width", o.gridLines.strokeWidth || 1)
        .attr("opacity", 0.8);
    }

    const barGroup = this.svg.append("g").attr("class", "bars");

    const fillAttr = o.gradient ? `url(#${this.gradId})` : o.colors[0];

    const bars = barGroup
      .selectAll("path.bar")
      .data(o.data)
      .enter()
      .append("path")
      .attr("class", "bar")
      .attr("fill", fillAttr)
      .attr("d", (d, i) => {
        const bx = x(o.labels[i]);
        const by = y(0);
        if (o.roundedTop)
          return this.roundedTopRect(bx, by, x.bandwidth(), 0, o.topRadius);
        return `M ${bx},${by} v 0 h ${x.bandwidth()} v 0 Z`;
      })
      .on("mousemove", (event, d, i) => {
        if (o.tooltip)
          this.showTooltip(`${o.labels[i]}: <strong>${d}</strong>`, event);
      })
      .on("mouseleave", () => this.hideTooltip());

    if (o.animation) {
      const ease = this.easingFn(o.easing);
      bars
        .transition()
        .delay((d, i) => o.barAnimation.delay + i * o.barAnimation.stagger)
        .duration(o.duration)
        .ease(ease)
        .attr("d", (d, i) => {
          const bx = x(o.labels[i]);
          const heightVal = y(0) - y(d);
          if (o.roundedTop)
            return this.roundedTopRect(
              bx,
              y(d),
              x.bandwidth(),
              heightVal,
              o.topRadius
            );
          return `M ${bx},${y(d)} v ${heightVal} h ${x.bandwidth()} v ${-heightVal} Z`;
        });
    } else {
      bars.attr("d", (d, i) => {
        const bx = x(o.labels[i]);
        const heightVal = y(0) - y(d);
        if (o.roundedTop)
          return this.roundedTopRect(
            bx,
            y(d),
            x.bandwidth(),
            heightVal,
            o.topRadius
          );
        return `M ${bx},${y(d)} v ${heightVal} h ${x.bandwidth()} v ${-heightVal} Z`;
      });
    }

    // labels above bars
    this.svg
      .selectAll("text.bar-label")
      .data(o.data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", (d, i) => x(o.labels[i]) + x.bandwidth() / 2)
      .attr("y", (d) => y(d) - 8)
      .attr("text-anchor", "middle")
      .attr("fill", this.colorsText)
      .style("font-size", "12px")
      .text((d) => d);

    // axes
    this.svg
      .append("g")
      .attr("transform", `translate(0,${h - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", this.colorsText);
    this.svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .selectAll("text")
      .attr("fill", this.colorsText);

    if (this.opt.xAxis.show !== false) {
      this.svg
        .append("g")
        .attr("transform", `translate(0,${h - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("fill", this.colorsText);
    }

    if (this.opt.yAxis.show !== false) {
      this.svg
        .append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("fill", this.colorsText);
    }

    // grid lines
    if (this.opt.yAxis.grid && this.opt.yAxis.show !== false) {
      this.svg
        .append("g")
        .attr("class", "grid-lines")
        .selectAll("line")
        .data(y.ticks(5))
        .enter()
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", w - margin.right)
        .attr("y1", (d) => y(d))
        .attr("y2", (d) => y(d))
        .attr("stroke", this.opt.gridLines.stroke)
        .attr("stroke-width", this.opt.gridLines.strokeWidth || 1)
        .attr("opacity", 0.8);
    }
  }

  drawBarH() {
    const o = this.opt;
    const margin = { top: 20, right: 20, bottom: 50, left: 80 };
    const w =
      this.container.node().clientWidth || parseInt(this.svg.attr("width"), 10);
    const h = o.height;

    const y = d3
      .scaleBand()
      .domain(o.labels)
      .range([margin.top, h - margin.bottom])
      .padding(o.padding);
    const x = d3
      .scaleLinear()
      .domain([0, d3.max(o.data)])
      .nice()
      .range([margin.left, w - margin.right]);

    // grid x lines
    if (o.gridLines && o.gridLines.show) {
      const gx = this.svg.append("g").attr("class", "grid-lines");
      gx.selectAll("line")
        .data(x.ticks(5))
        .enter()
        .append("line")
        .attr("x1", (d) => x(d))
        .attr("x2", (d) => x(d))
        .attr("y1", margin.top)
        .attr("y2", h - margin.bottom)
        .attr("stroke", o.gridLines.stroke)
        .attr("stroke-width", o.gridLines.strokeWidth || 1)
        .attr("opacity", 0.8);
    }

    const group = this.svg.append("g").attr("class", "bars-h");
    const fillAttr = o.gradient ? `url(#${this.gradId})` : o.colors[0];

    const bars = group
      .selectAll("rect")
      .data(o.data)
      .enter()
      .append("rect")
      .attr("x", x(0))
      .attr("y", (d, i) => y(o.labels[i]))
      .attr("height", y.bandwidth())
      .attr("width", 0)
      .attr("fill", fillAttr)
      .on("mousemove", (event, d, i) => {
        if (o.tooltip)
          this.showTooltip(`${o.labels[i]}: <strong>${d}</strong>`, event);
      })
      .on("mouseleave", () => this.hideTooltip());

    if (o.animation) {
      const ease = this.easingFn(o.easing);
      bars
        .transition()
        .delay((d, i) => o.barAnimation.delay + i * o.barAnimation.stagger)
        .duration(o.duration)
        .ease(ease)
        .attr("width", (d) => x(d) - x(0));
    } else bars.attr("width", (d) => x(d) - x(0));

    // value labels
    this.svg
      .selectAll("text.barh-label")
      .data(o.data)
      .enter()
      .append("text")
      .attr("x", (d) => x(d) + 6)
      .attr("y", (d, i) => y(o.labels[i]) + y.bandwidth() / 2 + 4)
      .text((d) => d)
      .attr("fill", this.colorsText)
      .style("font-size", "12px");

    this.svg
      .append("g")
      .attr("transform", `translate(0,${h - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", this.colorsText);
    this.svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .selectAll("text")
      .attr("fill", this.colorsText);
  }

  drawLine() {
    const o = this.opt;
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    const w =
      this.container.node().clientWidth || parseInt(this.svg.attr("width"), 10);
    const h = o.height;

    const yMax = d3.max(o.series.flatMap((s) => s.values));
    const x = d3
      .scalePoint()
      .domain(o.labels)
      .range([margin.left, w - margin.right]);
    const y = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([h - margin.bottom, margin.top]);

    const lineGen = d3
      .line()
      .x((d, i) => x(o.labels[i]))
      .y((d) => y(d))
      .curve(d3.curveMonotoneX);

    o.series.forEach((s, si) => {
      const path = this.svg
        .append("path")
        .datum(s.values)
        .attr("fill", "none")
        .attr("stroke", o.colors[si % o.colors.length])
        .attr("stroke-width", 3)
        .attr("d", lineGen);
      if (o.animation) {
        const len = path.node().getTotalLength();
        path
          .attr("stroke-dasharray", len + " " + len)
          .attr("stroke-dashoffset", len)
          .transition()
          .duration(o.duration)
          .ease(this.easingFn(o.easing))
          .attr("stroke-dashoffset", 0);
      }

      // points
      this.svg
        .selectAll(`circle.series-${si}`)
        .data(s.values)
        .enter()
        .append("circle")
        .attr("r", 4)
        .attr("fill", o.colors[si % o.colors.length])
        .attr("cx", (d, i) => x(o.labels[i]))
        .attr("cy", (d) => y(d))
        .on("mousemove", (event, d, i) => {
          if (o.tooltip)
            this.showTooltip(
              `${s.label || "Series " + (si + 1)}<br>${o.labels[i]}: <strong>${d}</strong>`,
              event
            );
        })
        .on("mouseleave", () => this.hideTooltip());

      // value labels near point (optional small offset)
      this.svg
        .selectAll(`text.point-label-${si}`)
        .data(s.values)
        .enter()
        .append("text")
        .attr("x", (d, i) => x(o.labels[i]))
        .attr("y", (d) => y(d) - 10)
        .attr("text-anchor", "middle")
        .attr("fill", this.colorsText)
        .style("font-size", "11px")
        .text((d) => d);
    });

    this.svg
      .append("g")
      .attr("transform", `translate(0,${h - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", this.colorsText);
    this.svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .selectAll("text")
      .attr("fill", this.colorsText);
  }

  drawPie() {
    const o = this.opt;
    const w =
      this.container.node().clientWidth || parseInt(this.svg.attr("width"), 10);
    const h = o.height;
    const r = Math.min(w, h) / 2 - 10;
    const g = this.svg
      .append("g")
      .attr("transform", `translate(${w / 2},${h / 2})`);

    const pie = d3.pie()(o.data);
    const inner =
      o.donut && o.donut.enabled ? r * (o.donut.innerRadius || 0.5) : 0;
    const arc = d3.arc().outerRadius(r).innerRadius(inner);

    const slices = g
      .selectAll("path")
      .data(pie)
      .enter()
      .append("path")
      .attr("fill", (d, i) => o.colors[i % o.colors.length])
      .attr("d", arc.startAngle(0).endAngle(0))
      .on("mousemove", (event, d, i) => {
        if (o.tooltip)
          this.showTooltip(`${o.labels[i]}: <strong>${d.data}</strong>`, event);
      })
      .on("mouseleave", () => this.hideTooltip());

    slices
      .transition()
      .duration(o.duration)
      .attrTween("d", function (d) {
        const interp = d3.interpolate(d.startAngle, d.endAngle);
        return (t) => arc({ ...d, endAngle: interp(t) });
      });

    // labels (move outward a bit for donut)
    g.selectAll("text")
      .data(pie)
      .enter()
      .append("text")
      .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("fill", this.colorsText)
      .style("font-size", "12px")
      .text(
        (d, i) => `${o.labels[i]}
${d.data}`
      );
  }

  drawCombo() {
    // combo: draw bar first (with reduced opacity) then lines overlay
    // uses o.data for bars and o.series for lines
    const o = this.opt;
    // create temporary svg layers cleared before drawing
    this.drawBar();
    // for clarity, we draw lines on top
    this.drawLine();
  }

  renderLegend() {
    const o = this.opt;
    // remove old
    this.container.selectAll(".d3-legend").remove();
    const legend = this.container
      .append("div")
      .attr("class", "d3-legend")
      .style("display", "flex")
      .style("gap", "12px")
      .style("align-items", "center")
      .style("margin", "8px 0");

    if (o.type === "line" || o.type === "combo") {
      (o.series || []).forEach((s, i) => {
        const item = legend
          .append("div")
          .style("display", "flex")
          .style("gap", "6px")
          .style("align-items", "center");
        item
          .append("span")
          .style("width", "12px")
          .style("height", "12px")
          .style("display", "inline-block")
          .style("background", o.colors[i % o.colors.length]);
        item
          .append("span")
          .text(s.label || `Series ${i + 1}`)
          .style("color", this.colorsText);
      });
    } else if (o.type === "pie") {
      o.labels.forEach((lab, i) => {
        const item = legend
          .append("div")
          .style("display", "flex")
          .style("gap", "6px")
          .style("align-items", "center");
        item
          .append("span")
          .style("width", "12px")
          .style("height", "12px")
          .style("display", "inline-block")
          .style("background", o.colors[i % o.colors.length]);
        item.append("span").text(lab).style("color", this.colorsText);
      });
    } else if (o.type === "bar" || o.type === "bar-h") {
      // single series label (if provided)
      legend
        .append("div")
        .style("display", "flex")
        .style("gap", "6px")
        .style("align-items", "center")
        .append("span")
        .text("Values")
        .style("color", this.colorsText);
    }

    // append legend above svg
    this.container
      .node()
      .insertBefore(legend.node(), this.container.node().firstChild);
  }
}

/* --------------------------- */
/* Usage Examples (quick)
/* --------------------------- */

// Vertical bar with top rounded, tooltip, legend off
// new D3SuperChart({ el: '#chart', type: 'bar', labels: ['A','B','C'], data: [30,50,20], roundedTop: true, topRadius: 10, tooltip: true, legend:false });

// Line multi-series with tooltip and legend
// new D3SuperChart({ el: '#chart', type:'line', labels:['Mon','Tue','Wed'], series:[{label:'S1', values:[10,20,15]},{label:'S2', values:[5,15,10]}], legend:true, tooltip:true, theme:'dark' });

// Pie donut
// new D3SuperChart({ el:'#chart', type:'pie', labels:['X','Y','Z'], data:[40,30,30], donut:{enabled:true, innerRadius:0.6}, legend:true });
