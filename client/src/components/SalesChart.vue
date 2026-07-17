<script setup>
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const props = defineProps({ points: { type: Array, default: () => [] } });

const chartData = computed(() => ({
  labels: props.points.map((p) =>
    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(p.date))
  ),
  datasets: [
    {
      data: props.points.map((p) => p.total),
      borderColor: '#f97316',
      backgroundColor: (ctx) => {
        const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
        g.addColorStop(0, 'rgba(249,115,22,0.25)');
        g.addColorStop(1, 'rgba(249,115,22,0)');
        return g;
      },
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#f97316',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      borderWidth: 2.5,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(ctx.parsed.y),
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
    y: {
      grid: { color: 'rgba(148,163,184,0.15)' },
      ticks: {
        color: '#9ca3af',
        font: { size: 11 },
        callback: (v) => (v >= 1000000 ? `${v / 1000000}jt` : v),
      },
    },
  },
};
</script>

<template>
  <div class="h-64">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
