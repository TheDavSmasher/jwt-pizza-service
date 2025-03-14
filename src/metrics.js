const config = require('./config');
const os = require('os');

const requests = {};
const authentication = {};
const pizzas = {};

function track(endpoint) {
  return (req, res, next) => {
    updateMetric(requests, endpoint);
    next();
  };
}

function trackFail() {
  return (err, req, res, next) => {
    updateMetric(authentication, 'fail');
    next(err);
  }
}

function trackSuccess() {
  updateMetric(authentication, 'success');
}

function trackActive(active) {
  updateMetric(authentication, 'active', (active ? 1 : -1))
}

function trackPizza(metric, value) {
  updateMetric(pizzas, metric, value);
}

function trackLatency(key, time) {
  //sendMetricToGrafana(key, value, )
}

function updateMetric(metric, key, value) {
  metric[key] = (metric[key] || 0) + (value ?? 1);
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

// This will periodically send metrics to Grafana
const timer = setInterval(() => {
  Object.keys(requests).forEach((endpoint) => {
    sendMetricToGrafana('requests', requests[endpoint], { endpoint });
  });
}, 10000);

function getMetricsBody(...allMetrics) {
  const metrics = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: []
          },
        ],
      },
    ],
  };

  allMetrics.forEach((metric) => {
    metrics.resourceMetrics[0].scopeMetrics[0].metrics.push(metric);
  });

  return metrics;
}

function getSingleMetric(metricName, metricValue, attributes) {
  attributes = { ...attributes, source: config.source }

  const metric = {
    name: metricName,
    unit: '1',
    sum: {
      dataPoints: [
        {
          asInt: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [],
        },
      ],
      aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
      isMonotonic: true,
    },
  };

  Object.keys(attributes).forEach((key) => {
    metric.sum.dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  return metric;
}

function sendMetricToGrafana(metricName, metricValue, attributes) {
  const metric = getMetricsBody(getSingleMetric(metricName, metricValue, attributes));

  sendToGrafana(metric, metricName);
}

function sendToGrafana(metric, metricName) {
  fetch(`${config.url}`, {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        console.error('Failed to push metrics data to Grafana');
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = { track, trackSuccess, trackFail, trackActive, trackPizza, trackLatency };