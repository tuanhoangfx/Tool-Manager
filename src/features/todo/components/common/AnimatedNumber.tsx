import React from 'react';

interface AnimatedNumberProps {
  value: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = React.memo(({ value }) => {
  return (
    <span key={value} className="animate-numberFlip inline-block font-semibold">
      {value.toLocaleString()}
    </span>
  );
});

export default AnimatedNumber;
