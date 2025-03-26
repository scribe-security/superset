import React, { FC, ReactNode, useEffect, useState, useRef } from 'react';
import cx from 'classnames';
import './styles.css';

export type Background = 'transparent' | 'white';

interface Props {
  backgroundColor?: Background;
  circleClassName?: string;
  className?: string;
  classNameSVG?: string;
  text?: string | ReactNode;
  loading?: boolean;
  size?: 'sx' | 'xl';
  whiteBg?: boolean;
  absolute?: boolean;
}

const Loader: FC<Props> = ({
  backgroundColor,
  circleClassName,
  className,
  classNameSVG,
  loading,
  size: propSize,
  whiteBg,
  absolute = true,
}) => {
  const [visible, setVisible] = useState(loading);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isParentLarger, setIsParentLarger] = useState(false);
  const [calculatedSize, setCalculatedSize] = useState<'sx' | undefined | 'xl'>(
    propSize,
  );

  // Check parent size and determine positioning and sizing
  useEffect(() => {
    if (!loaderRef.current) {
      return undefined;
    }

    const checkParentSize = () => {
      const parentElement = loaderRef.current?.parentElement;
      if (!parentElement) return;

      const parentHeight = parentElement.offsetHeight || 0;
      const parentWidth = parentElement.offsetWidth || 0;
      const viewportHeight = window.innerHeight;

      // Set position flag (large parent)
      setIsParentLarger(parentHeight > viewportHeight);

      // Determine size based on parent dimensions
      if (
        parentHeight > viewportHeight - 200 ||
        parentWidth > window.innerWidth
      ) {
        setCalculatedSize('xl'); // Large parent needs large loader
      } else if (parentWidth < 40 || parentHeight < 40) {
        setCalculatedSize('sx'); // Small parent needs small loader
      } else {
        setCalculatedSize(propSize); // Use provided size prop for normal cases
      }
    };

    checkParentSize();

    // Add resize listener
    window.addEventListener('resize', checkParentSize);

    return () => window.removeEventListener('resize', checkParentSize);
  }, [propSize]);

  useEffect(() => {
    if (loading) {
      setVisible(loading);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setVisible(loading);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  if (visible) {
    return (
      <div
        ref={loaderRef}
        className={cx('sc-loader', className, calculatedSize, backgroundColor, {
          show: loading,
          whiteBg,
          absolute,
          'large-parent': isParentLarger,
        })}
      >
        <div
          className="loader-container"
          style={{
            position: 'absolute',
            top: isParentLarger ? '120px' : '50%',
            left: '50%',
            transform: isParentLarger
              ? 'translateX(-50%)'
              : 'translate(-50%, -50%)',
          }}
        >
          <svg
            className={cx('circular-loader', classNameSVG)}
            viewBox="25 25 50 50"
          >
            <circle
              className={cx('loader-path', circleClassName)}
              cx="50"
              cy="50"
              fill="none"
              r="20"
              stroke="#f24969"
              strokeWidth="4"
            />
          </svg>
        </div>
      </div>
    );
  }
  return null;
};

export default Loader;
