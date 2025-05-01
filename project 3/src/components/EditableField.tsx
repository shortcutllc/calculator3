import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface EditableFieldProps {
  value: string | number;
  onChange: (value: string | number) => void;
  isEditing: boolean;
  type?: 'text' | 'number';
  prefix?: string;
  suffix?: string;
  multiline?: boolean;
  className?: string;
  originalValue?: string | number;
  showChange?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onChange,
  isEditing,
  type = 'text',
  prefix,
  suffix,
  multiline = false,
  className = '',
  originalValue,
  showChange = false
}) => {
  const [fieldValue, setFieldValue] = useState(value);
  
  useEffect(() => {
    setFieldValue(value);
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setFieldValue(newValue);
  };
  
  const handleBlur = () => {
    onChange(type === 'number' ? Number(fieldValue) : fieldValue);
  };

  const renderChangeIndicator = () => {
    if (!showChange || originalValue === undefined || originalValue === value) return null;

    const diff = Number(value) - Number(originalValue);
    const percentChange = ((Number(value) - Number(originalValue)) / Number(originalValue)) * 100;
    const isIncrease = diff > 0;
    const Icon = isIncrease ? TrendingUp : TrendingDown;

    return (
      <div className={`inline-flex items-center gap-1 ml-2 text-sm ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
        <Icon className="w-4 h-4" />
        <span>
          {isIncrease ? '+' : ''}
          {percentChange.toFixed(1)}%
        </span>
      </div>
    );
  };
  
  if (!isEditing) {
    return (
      <div className={`flex items-center ${className}`}>
        <span>
          {prefix}{value}{suffix}
        </span>
        {renderChangeIndicator()}
      </div>
    );
  }
  
  if (multiline) {
    return (
      <textarea
        value={fieldValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`px-2 py-1 border border-[#175071] rounded-md focus:outline-none focus:ring-2 focus:ring-[#175071] focus:ring-opacity-50 ${className}`}
        rows={3}
      />
    );
  }
  
  return (
    <div className="inline-flex items-center">
      {prefix && <span className="mr-1">{prefix}</span>}
      <input
        type={type}
        value={fieldValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`px-2 py-1 border border-[#175071] rounded-md focus:outline-none focus:ring-2 focus:ring-[#175071] focus:ring-opacity-50 ${type === 'number' ? 'w-24' : ''} ${className}`}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
      />
      {suffix && <span className="ml-1">{suffix}</span>}
      {renderChangeIndicator()}
    </div>
  );
};

export default EditableField;