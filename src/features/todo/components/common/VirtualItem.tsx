
import React, { useState, useRef, useEffect } from 'react';

interface VirtualItemProps {
  children: React.ReactNode;
  placeholder: React.ReactNode;
  rootRef: React.RefObject<HTMLElement | null>;
  minHeight?: number;
}

const VirtualItem: React.FC<VirtualItemProps> = ({ children, placeholder, rootRef, minHeight = 100 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // We need the root element to be available to initialize the observer
    const rootElement = rootRef.current;
    if (!rootElement) {
        return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the item is intersecting, we set it to visible.
        // We can then unobserve it to prevent further checks, as we are only lazy-loading.
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (itemRef.current) {
            observer.unobserve(itemRef.current);
          }
        }
      },
      {
        root: rootElement,
        rootMargin: '200px 0px', // Pre-load items 200px below and above the visible area of the scroll container
      }
    );

    const currentRef = itemRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [rootRef]);

  return (
    <div ref={itemRef} style={{ minHeight: isVisible ? 'auto' : minHeight }}>
      {isVisible ? children : placeholder}
    </div>
  );
};

export default VirtualItem;
