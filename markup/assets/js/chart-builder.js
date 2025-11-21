var ChartBuilder = (function () {
  var instances = {};

  function mergeObjects(target, source) {
    var result = {};
    for (var key in target) {
      result[key] = target[key];
    }
    for (var key in source) {
      result[key] = source[key];
    }
    return result;
  }

  return {
    create: function (canvasId, optionType, customConfig, data) {
      var ctx = document.getElementById(canvasId);
      if (!ctx) {
        console.error("Canvas not found: " + canvasId);
        return null;
      }
      ctx = ctx.getContext("2d");

      customConfig = customConfig || {};

      var chartConfig = ChartOptions[optionType](customConfig);

      var datasets = [];
      for (var i = 0; i < data.datasets.length; i++) {
        var dataset = data.datasets[i];
        var style = chartConfig.datasetStyle(dataset, i);
        datasets.push(mergeObjects(dataset, style));
      }

      var chart = new Chart(ctx, {
        type: chartConfig.type,
        data: {
          labels: data.labels,
          datasets: datasets,
        },
        options: chartConfig.options,
      });

      instances[canvasId] = chart;
      return chart;
    },

    update: function (canvasId, newData) {
      var chart = instances[canvasId];
      if (!chart) {
        console.error("Chart not found: " + canvasId);
        return;
      }

      chart.data.labels = newData.labels;
      chart.data.datasets = newData.datasets;
      chart.update();
    },

    destroy: function (canvasId) {
      var chart = instances[canvasId];
      if (chart) {
        chart.destroy();
        delete instances[canvasId];
      }
    },

    get: function (canvasId) {
      return instances[canvasId];
    },
  };
})();
