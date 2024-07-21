import {
  ECharts,
  EChartsOption,
  getInstanceByDom,
  init,
  SetOptionOpts,
} from "echarts";
import React, { CSSProperties, useEffect, useRef } from "react";

export interface ReactEChartsProps {
  option: EChartsOption;
  width?: number;
  height?: number;
  style?: CSSProperties;
  settings?: SetOptionOpts;
  loading?: boolean;
  onNodeClick?: any;
  theme?: "light" | "dark";
}

const EChartsRenderer = ({
  option,
  width = 400,
  height = 400,
  style,
  settings,
  loading,
  onNodeClick,
  theme,
}: ReactEChartsProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chart: ECharts | undefined;
    if (chartRef.current) {
      chart = init(chartRef.current, theme);
    }

    const resizeChart = () => {
      chart?.resize();
    };
    window.addEventListener("resize", resizeChart);

    return () => {
      chart?.dispose();
      window.removeEventListener("resize", resizeChart);
    };
  }, [theme]);

  useEffect(() => {
    // Add node click handler
    if (chartRef.current) {
      const chart = getInstanceByDom(chartRef.current);
      chart?.off("click");
      // chart?.on("click", { dataType: "node" }, () => {
      //   setTimeout(() => {
      //     console.log("restore on zoom");
      //     chart?.dispatchAction({ type: "restore" });
      //   }, 2000);
      //   // chart?.dispatchAction({ type: "restore" });
      // });
      chart?.on("click", { dataType: "node" }, (info) => {
        if (chart) {
          onNodeClick(info, chart);
        }
      });
      // chart?.updateLabelLayout();
    }
  }, [chartRef.current]);

  useEffect(() => {
    // Update chart
    if (chartRef.current !== null) {
      const chart = getInstanceByDom(chartRef.current);
      chart?.setOption(option, settings);
    }
  }, [option, settings, theme]);

  useEffect(() => {
    // Update chart
    if (chartRef.current !== null) {
      const chart = getInstanceByDom(chartRef.current);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      loading === true ? chart?.showLoading() : chart?.hideLoading();
    }
  }, [loading, theme]);

  return <div ref={chartRef} style={{ width: "100%", height: "100%" }} />;
};

export default EChartsRenderer;
