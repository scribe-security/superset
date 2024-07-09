/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import getBootstrapData from 'src/utils/getBootstrapData';
import { store } from '../views/store';
import { getDashboardPermalink as getDashboardPermalinkUtil } from '../utils/urlUtils';

const bootstrapData = getBootstrapData();

type Size = {
  width: number;
  height: number;
};

type EmbeddedSupersetApi = {
  getScrollSize: () => Size;
  getDashboardPermalink: ({ anchor }: { anchor: string }) => Promise<string>;
  getActiveTabs: () => string[];
  setActiveTabByName: ({
    tabName,
    chartTitleToScroll,
  }: {
    tabName: string;
    chartTitleToScroll?: string;
  }) => void;
  getDashboardState: () => Record<string, unknown>;
};

const getScrollSize = (): Size => ({
  width: document.body.scrollWidth,
  height: document.body.scrollHeight,
});

const getDashboardPermalink = async ({
  anchor,
}: {
  anchor: string;
}): Promise<string> => {
  const state = store?.getState();
  const { dashboardId, dataMask, activeTabs } = {
    dashboardId:
      state?.dashboardInfo?.id || bootstrapData?.embedded!.dashboard_id,
    dataMask: state?.dataMask,
    activeTabs: state.dashboardState?.activeTabs,
  };

  return getDashboardPermalinkUtil({
    dashboardId,
    dataMask,
    activeTabs,
    anchor,
  });
};

const scrollToChartTitle = (text: string) => {
  const searchElement = () => {
    const elements = document.querySelectorAll(
      '[data-test="editable-title-input"]',
    );
    let isElementFound = false;

    elements.forEach(element => {
      const elementText = element.textContent?.trim();
      if (isElementFound) return;
      if (elementText === text.trim()) {
        isElementFound = true;
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.removeEventListener('load', searchElement);
      }
    });

    if (!isElementFound) {
      console.error(`Element with text "${text}" does not exist`);
    }
  };

  if (document.readyState === 'complete') {
    // If the document is already loaded, execute immediately
    searchElement();
  } else {
    // Otherwise, wait for the window to load
    window.addEventListener('load', searchElement);
  }
};

const setActiveTabByName = ({
  tabName,
  chartTitleToScroll,
}: {
  tabName?: string;
  chartTitleToScroll?: string;
}) => {
  const tabs = document.querySelectorAll('.ant-tabs-tab');
  let isTabExist = false;
  if (tabName) {
    tabs.forEach(tab => {
      const tabNameLowerCase = tab.textContent?.toLowerCase().trim();
      if (isTabExist) return;
      if (tabNameLowerCase === tabName.toLowerCase().trim()) {
        isTabExist = true;
        (tab as HTMLElement).click();
      }
    });
    if (!isTabExist) {
      console.error(`Tab with name ${tabName} does not exist`);
    }
  }
  if (chartTitleToScroll) {
    scrollToChartTitle(chartTitleToScroll);
  }
};

const getActiveTabs = () => store?.getState()?.dashboardState?.activeTabs || [];

const getDashboardState = () => store?.getState()?.dashboardState || [];

export const embeddedApi: EmbeddedSupersetApi = {
  getScrollSize,
  getDashboardPermalink,
  getActiveTabs,
  getDashboardState,
  setActiveTabByName,
};
