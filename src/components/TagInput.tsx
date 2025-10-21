'use client';

import { useState } from 'react';

interface TagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export const TagInput = ({ values, onChange, placeholder = 'Añade un descriptor' }: TagInputProps) => {
  const [value, setValue] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setValue('');
  };

  const removeTag = (tag: string) => {
    onChange(values.filter((current) => current !== tag));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(value);
    } else if (event.key === 'Backspace' && !value) {
      removeTag(values.at(-1) ?? '');
    }
  };

  return (
    <div className="rounded-md border border-slate-300 px-2 py-2 shadow-sm focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200">
      <div className="flex flex-wrap gap-2">
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-primary-700 hover:text-primary-900"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none"
        />
      </div>
    </div>
  );
};

export default TagInput;
