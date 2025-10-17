import { forwardRef } from 'react';

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  value: number;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, value, className = '', ...props }, ref) => (
    <div className={className}>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ) : null}
      <input
        ref={ref}
        type="range"
        value={value}
        min={props.min ?? 0}
        max={props.max ?? 10}
        step={props.step ?? 1}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-primary-100 accent-primary-600"
        {...props}
      />
    </div>
  ),
);

Slider.displayName = 'Slider';

export default Slider;
