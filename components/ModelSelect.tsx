import { Field, inputClassName } from './Field';

interface Props {
  id: string;
  label: string;
  value: string;
  models: string[];
  placeholder: string;
  onChange: (value: string) => void;
  allowCustom?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export function ModelSelect({
  id,
  label,
  value,
  models,
  placeholder,
  onChange,
  allowCustom,
  disabled,
  compact,
}: Props) {
  const options = [...models];
  if (value && !options.includes(value)) options.unshift(value);

  const controlClass = compact
    ? `${inputClassName} py-1.5 text-xs`
    : inputClassName;

  return (
    <Field label={label} htmlFor={id}>
      {models.length > 0 || value ? (
        <select
          id={id}
          className={controlClass}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          className={controlClass}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={allowCustom ? 'bge-m3' : placeholder}
        />
      )}
    </Field>
  );
}
