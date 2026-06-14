import {
  getAuthorLikeChart,
  getPhotoLikeChart,
} from "@/services/historicLikesService";
import type { LikeBucket, PhotoData } from "@/types";
import { ChartNoAxesColumn, Table2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type AnalyticsPreviewProps = {
  selectedPhoto: PhotoData;
  setSelectedPhoto: (selectedPhoto: PhotoData | null) => void;
};

type ChartState = {
  authorBuckets: LikeBucket[];
  photoBuckets: LikeBucket[];
};

type ViewMode = "charts" | "tables";

const emptyChartState: ChartState = {
  authorBuckets: [],
  photoBuckets: [],
};

const AnalyticsPreview = ({
  selectedPhoto,
  setSelectedPhoto,
}: AnalyticsPreviewProps) => {
  const [chartState, setChartState] = useState<ChartState>(emptyChartState);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("charts");
  const historicAuthorTotals = accumulatedLikes(chartState.authorBuckets);
  const historicPhotoTotals = accumulatedLikes(chartState.photoBuckets);
  const historicMaxValue = getMaxYAxisValue([
    ...historicAuthorTotals,
    ...historicPhotoTotals,
  ]);
  useEffect(() => {
    setLoading(true);
    setChartState(emptyChartState);

    async function loadCharts() {
      setChartState(await loadChartState(selectedPhoto));
      setLoading(false);
    }

    loadCharts();
  }, [selectedPhoto.authorUserId, selectedPhoto.id]);

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-white dark:bg-black">
      <img
        className="fixed inset-0 h-full w-full object-cover opacity-25 dark:opacity-35"
        src={selectedPhoto.large}
        alt={selectedPhoto.title}
      />
      <div className="fixed inset-0 bg-white/72 dark:bg-black/68" />
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-16">
        {loading && (
          <div className="text-center text-sm text-muted-foreground">
            Loading analytics...
          </div>
        )}

        {!loading && (
          <div className="grid gap-10">
            {viewMode === "charts" && (
              <AnalyticsCharts
                historicMaxValue={historicMaxValue}
                historicAuthorValues={historicAuthorTotals}
                historicPhotoValues={historicPhotoTotals}
                selectedPhoto={selectedPhoto}
              />
            )}

            {viewMode === "tables" && (
              <AnalyticsTables
                chartState={chartState}
                selectedPhoto={selectedPhoto}
              />
            )}
          </div>
        )}
      </div>
      <div className="fixed top-5 right-5 z-30 grid gap-3">
        <button
          type="button"
          aria-label="Close analytics"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-4xl font-bold text-black opacity-40 transition-opacity hover:opacity-100"
          onClick={() => setSelectedPhoto(null)}
        >
          <span className="-translate-y-0.5">×</span>
        </button>
        <ViewModeButton
          label="Show charts"
          selected={viewMode === "charts"}
          onClick={() => setViewMode("charts")}
        >
          <ChartNoAxesColumn className="h-5 w-5" />
        </ViewModeButton>
        <ViewModeButton
          label="Show tables"
          selected={viewMode === "tables"}
          onClick={() => setViewMode("tables")}
        >
          <Table2 className="h-5 w-5" />
        </ViewModeButton>
      </div>
    </div>
  );
};

async function loadChartState(selectedPhoto: PhotoData): Promise<ChartState> {
  const historicBuckets = await loadHistoricBuckets(selectedPhoto);

  return {
    authorBuckets: historicBuckets.authorBuckets,
    photoBuckets: historicBuckets.photoBuckets,
  };
}

async function loadHistoricBuckets(selectedPhoto: PhotoData) {
  const [authorBuckets, photoBuckets] = await Promise.all([
    getAuthorLikeChart(selectedPhoto.authorUserId),
    getPhotoLikeChart(selectedPhoto.id),
  ]);

  return { authorBuckets, photoBuckets };
}

function ViewModeButton({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-opacity ${
        selected
          ? "border-black bg-black text-white opacity-90 dark:border-white dark:bg-white dark:text-black"
          : "border-black/20 bg-white/90 text-black opacity-45 hover:opacity-100 dark:border-white/20"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function AnalyticsCharts({
  historicMaxValue,
  historicAuthorValues,
  historicPhotoValues,
  selectedPhoto,
}: {
  historicMaxValue: number;
  historicAuthorValues: number[];
  historicPhotoValues: number[];
  selectedPhoto: PhotoData;
}) {
  return (
    <>
      <div className="grid gap-12 lg:grid-cols-2">
        <HistoricLineChart
          title={`Author: ${selectedPhoto.authorNickname ?? selectedPhoto.authorUserId}`}
          values={historicAuthorValues}
          maxValue={historicMaxValue}
        />
        <HistoricLineChart
          title={`Image: ${selectedPhoto.title}`}
          values={historicPhotoValues}
          maxValue={historicMaxValue}
        />
      </div>
    </>
  );
}

function AnalyticsTables({
  chartState,
  selectedPhoto,
}: {
  chartState: ChartState;
  selectedPhoto: PhotoData;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <HistoricDataTable
        title={`Author: ${selectedPhoto.authorNickname ?? selectedPhoto.authorUserId}`}
        buckets={chartState.authorBuckets}
      />
      <HistoricDataTable
        title={`Image: ${selectedPhoto.title}`}
        buckets={chartState.photoBuckets}
      />
    </div>
  );
}

function HistoricDataTable({
  title,
  buckets,
}: {
  title: string;
  buckets: LikeBucket[];
}) {
  const totals = accumulatedLikes(buckets);

  return (
    <DataTable
      title={title}
      headers={["Point", "Likes", "Total"]}
      rows={buckets.map((bucket, index) => [
        index + 1,
        Math.round(bucket.likes),
        totals[index],
      ])}
    />
  );
}

function DataTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <section className="min-w-0">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="overflow-hidden border border-black/10 bg-white/72 shadow-sm dark:border-white/10 dark:bg-black/45">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/[0.04] text-left dark:border-white/10 dark:bg-white/[0.06]">
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-black/5 last:border-b-0 dark:border-white/5"
              >
                {row.map((value, columnIndex) => (
                  <td key={columnIndex} className="px-4 py-2.5">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HistoricLineChart({
  title,
  values,
  maxValue,
}: {
  title: string;
  values: number[];
  maxValue: number;
}) {
  return (
    <LineChart
      title={title}
      values={values}
      height={360}
      color="rgb(125 211 252)"
      maxValue={maxValue}
    />
  );
}

function LineChart({
  title,
  values,
  height,
  color,
  maxValue,
}: {
  title: string;
  values: number[];
  height: number;
  color: string;
  maxValue: number;
}) {
  const ticks = getYAxis(maxValue);
  const chart = { width: 640, height, left: 42, right: 16, top: 18, bottom: 34 };
  const plotWidth = chart.width - chart.left - chart.right;
  const plotHeight = chart.height - chart.top - chart.bottom;
  const points = values.map((value, index) => {
    const x =
      chart.left +
      (values.length <= 1
        ? plotWidth
        : (index / (values.length - 1)) * plotWidth);
    const y = chart.top + plotHeight - (value / maxValue) * plotHeight;

    return { x, y };
  });
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <section className="min-w-0">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <svg
        className="h-auto w-full overflow-visible text-foreground"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label={title}
      >
        <line
          x1={chart.left}
          x2={chart.left}
          y1={chart.top}
          y2={chart.top + plotHeight}
          stroke="currentColor"
          opacity="0.75"
        />
        <line
          x1={chart.left}
          x2={chart.left + plotWidth}
          y1={chart.top + plotHeight}
          y2={chart.top + plotHeight}
          stroke="currentColor"
          opacity="0.75"
        />
        {ticks.map((tick) => {
          const y = chart.top + plotHeight - (tick / maxValue) * plotHeight;
          return (
            <text
              key={tick}
              x={chart.left - 12}
              y={y + 4}
              textAnchor="end"
              className="fill-current text-xs"
              opacity="0.7"
            >
              {tick}
            </text>
          );
        })}
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={color}
            opacity="0.88"
          />
        ))}
      </svg>
    </section>
  );
}

function getYAxis(maxValue: number) {
  const step = Math.max(1, Math.ceil(maxValue / 4));
  return Array.from(
    { length: maxValue / step + 1 },
    (_, index) => index * step,
  );
}

function getMaxYAxisValue(values: number[]) {
  const highestValue = Math.max(1, ...values.map((value) => Math.max(0, value)));
  const step = Math.max(1, Math.ceil(highestValue / 4));
  return step * Math.ceil(highestValue / step);
}

function accumulatedLikes(buckets: LikeBucket[]) {
  let total = 0;

  return buckets.map((bucket) => {
    total = Math.max(0, total + Math.round(bucket.likes));
    return total;
  });
}

export default AnalyticsPreview;
