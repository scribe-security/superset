import { type FC, type ReactNode, useEffect, useState, useRef } from 'react';
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
  text,
  absolute = true,
}) => {
  const [visible, setVisible] = useState(loading);
  const loaderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isParentLarger, setIsParentLarger] = useState(false);
  const [calculatedSize, setCalculatedSize] = useState<'sx' | undefined | 'xl'>(
    propSize,
  );
  const [hasEnoughSpace, setHasEnoughSpace] = useState(true);

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

      // Set position flag (large parent) - only if parent is twice larger than viewport
      setIsParentLarger(parentHeight > viewportHeight + 300);
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

      // Check if there's enough space
      // Only perform space check if text is present
      if (text) {
        const totalRequiredHeight = 70; // Approximate height for text + loader
        setHasEnoughSpace(
          parentHeight >= totalRequiredHeight && parentWidth >= 40,
        );
      } else {
        // Always show loader if there's no text
        setHasEnoughSpace(true);
      }
    };

    checkParentSize();
    // Add resize listener
    window.addEventListener('resize', checkParentSize);
    return () => window.removeEventListener('resize', checkParentSize);
  }, [propSize, text]);

  useEffect(() => {
    // Additional check for space after component is mounted
    if (containerRef.current && loaderRef.current && text) {
      const containerHeight = containerRef.current.offsetHeight;
      const parentHeight = loaderRef.current.parentElement?.offsetHeight || 0;

      if (containerHeight > parentHeight) {
        setHasEnoughSpace(false);
      }
    }
  }, [visible, text]);

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

  if (visible && hasEnoughSpace) {
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
          ref={containerRef}
          className="loader-container"
          style={{
            position: isParentLarger ? 'absolute' : 'relative',
            top: isParentLarger ? '120px' : '50%',
            left: '50%',
            transform: isParentLarger
              ? 'translateX(-50%)'
              : 'translate(-50%, -50%)',
            maxHeight: '100%',
            maxWidth: '100%',
          }}
        >
          {text && <div className="loader-text">{text}</div>}
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
