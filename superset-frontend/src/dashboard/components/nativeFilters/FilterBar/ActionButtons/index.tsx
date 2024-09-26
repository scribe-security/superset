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
import React, { useMemo } from 'react';
import {
  css,
  DataMaskState,
  DataMaskStateWithId,
  t,
  isDefined,
  SupersetTheme,
} from '@superset-ui/core';
import Button from 'src/components/Button';
import { OPEN_FILTER_BAR_WIDTH } from 'src/dashboard/constants';
import { rgba } from 'emotion-rgba';
import { FilterBarOrientation } from 'src/dashboard/types';
import { getFilterBarTestId } from '../utils';

interface ActionButtonsProps {
  width?: number;
  onApply: () => void;
  onClearAll: () => void;
  dataMaskSelected: DataMaskState;
  dataMaskApplied: DataMaskStateWithId;
  isApplyDisabled: boolean;
  filterBarOrientation?: FilterBarOrientation;
}

const containerStyle = (theme: SupersetTheme) => css`
  display: flex;
  && > .filter-clear-all-button {
    margin-left: 0;
    &:hover {
    }
  }
`;

const verticalStyle = (theme: SupersetTheme, width: number) => css`
  flex-direction: row;
  align-items: center;
  pointer-events: none;
  position: fixed;
  z-index: 100;
  justify-content: space-between;

  // filter bar width minus 1px for border
  width: ${width - 1}px;
  top: 60px;

  padding: ${theme.gridUnit * 4}px;
  padding-top: ${theme.gridUnit * 6}px;

  // background: linear-gradient(
  //   ${rgba(theme.colors.grayscale.light5, 0)},
  //   ${theme.colors.grayscale.light5} ${theme.opacity.mediumLight}
  // );

  & > button {
    pointer-events: auto;
    width: 100%;
  }

  & > .filter-apply-button {
    //margin-: ${theme.gridUnit * 3}px;
  }
`;

const horizontalStyle = (theme: SupersetTheme) => css`
  align-items: center;
  margin-left: auto;
  text-transform: capitalize;
  && > .filter-clear-all-button {
    background-color: ${theme.colors.grayscale.light4};
    border: 1px solid ${theme.colors.grayscale.base};
    font-weight: ${theme.typography.weights.normal};
  }
  & > .filter-apply-button {
    &[disabled],
    &[disabled]:hover {
      color: ${theme.colors.grayscale.light1};
      background: ${theme.colors.grayscale.light3};
      border: 1px solid ${theme.colors.grayscale.light1};
    }
  }
`;

const ActionButtons = ({
  width = OPEN_FILTER_BAR_WIDTH,
  onApply,
  onClearAll,
  dataMaskApplied,
  dataMaskSelected,
  isApplyDisabled,
  filterBarOrientation = FilterBarOrientation.VERTICAL,
}: ActionButtonsProps) => {
  const isClearAllEnabled = useMemo(
    () =>
      Object.values(dataMaskApplied).some(
        filter =>
          isDefined(dataMaskSelected[filter.id]?.filterState?.value) ||
          (!dataMaskSelected[filter.id] &&
            isDefined(filter.filterState?.value)),
      ),
    [dataMaskApplied, dataMaskSelected],
  );
  const isVertical = filterBarOrientation === FilterBarOrientation.VERTICAL;

  return (
    <div
      css={(theme: SupersetTheme) => [
        containerStyle(theme),
        isVertical ? verticalStyle(theme, width) : horizontalStyle(theme),
      ]}
      data-test="filterbar-action-buttons"
    >
      <Button
        disabled={isApplyDisabled}
        buttonStyle="primary"
        htmlType="submit"
        buttonSize="small"
        className="filter-apply-button"
        onClick={onApply}
        {...getFilterBarTestId('apply-button')}
      >
        {t('Apply')}
      </Button>
      <Button
        disabled={!isClearAllEnabled}
        buttonStyle="secondary"
        buttonSize="small"
        className="filter-clear-all-button"
        onClick={onClearAll}
        {...getFilterBarTestId('clear-button')}
      >
        {t('Clear')}
      </Button>
    </div>
  );
};

export default ActionButtons;
