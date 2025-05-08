import {
  ECElementEvent,
  ECharts,
  EChartsOption,
  getInstanceByDom,
  init,
  SetOptionOpts,
  LegendComponentOption,
} from 'echarts';
import React, { CSSProperties, useEffect, useRef } from 'react';

export interface ReactEChartsProps {
  option: EChartsOption;
  width?: number;
  height?: number;
  style?: CSSProperties;
  settings?: SetOptionOpts;
  loading?: boolean;
  onNodeClick?: (info: ECElementEvent, chart: ECharts) => void;
  onLegendClick?: (info: any, chart: ECharts) => void;
  setChart: any;
  theme?: 'light' | 'dark';
}

const EChartsRenderer = ({
  option,
  width = 400,
  height = 400,
  style,
  settings,
  loading,
  onNodeClick,
  onLegendClick,
  setChart,
  theme,
}: ReactEChartsProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return; // Early return if ref is null
  
    let chart: ECharts | undefined = init(chartRef.current, theme, { renderer: 'svg' });
    setChart(chart);
  
    const resizeChart = () => chart?.resize();
    window.addEventListener('resize', resizeChart);
  
    return () => {
      chart?.dispose();
      window.removeEventListener('resize', resizeChart);
    };
  }, [theme]);
  

  useEffect(() => {
    if (chartRef.current) {
      const chart = getInstanceByDom(chartRef.current);
      chart?.off('click');
      chart?.off('legendselectchanged');

      chart?.on('click', { dataType: 'node' }, info => {
        if (chart && onNodeClick) {
          onNodeClick(info, chart);
        }
      });

      chart?.on('legendselectchanged', info => {
        if (chart && onLegendClick) {
          onLegendClick(info, chart);
        }
      });
    }
  }, [chartRef.current]);

  useEffect(() => {
    if (chartRef.current !== null) {
      const chart = getInstanceByDom(chartRef.current);

      const legends = Array.isArray(option.legend) ? option.legend : [option.legend];
      legends.forEach(l => {
        const legend = l as LegendComponentOption;
        if (legend && !Array.isArray(legend)) {
          if (!legend.textStyle) legend.textStyle = {};
          if (!legend.textStyle.rich) legend.textStyle.rich = {};
          const legendRichText = legend.textStyle.rich;

          // If no formatter is defined, create a default one
          if (!legend.formatter) {
            legend.formatter = (name: string) => {
              if (legendRichText[name] && legendRichText[name].color) {
                return `{colorBox|} {${name}|${name}}`;
              }
              return name;
            };
          }

          if (!legendRichText.colorBox) {
            legendRichText.colorBox = {
              backgroundColor: '#000',
              width: 10,
              height: 10,
              borderRadius: 2,
              align: 'center',
            };
          }
        }
      });

      chart?.setOption(option, settings);
      setChart(chart);
    }
  }, [option, settings, theme]);

  useEffect(() => {
    // Update chart
    if (chartRef.current !== null) {
      const chart = getInstanceByDom(chartRef.current);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions,no-unused-expressions
      loading === true ? chart?.showLoading() : chart?.hideLoading();
      setChart(chart);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, theme]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
};

// Export must be at the top level, not inside any block of code
export default EChartsRenderer;
