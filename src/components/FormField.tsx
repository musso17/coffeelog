import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  description?: string;
  children: ReactNode;
}

export const FormField = ({
  label,
  htmlFor,
  required,
  description,
  children,
}: FormFieldProps) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
      {label}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </label>
    {children}
    {description ? <p className="text-xs text-slate-500">{description}</p> : null}
  </div>
);

export default FormField;
