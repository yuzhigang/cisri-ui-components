import type { ReactNode } from 'react';
import {
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@cisri/shadcn';
import { cn } from '@cisri/core';
import type { JsonSchema } from '@cisri/json-schema-core';
import {
  generateDefaultUiSchema,
  type UiSchema,
  type UiWidget,
} from '@cisri/json-schema-ui-core';

export interface JsonSchemaFormProps {
  schema: JsonSchema;
  uiSchema?: UiSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  onError?: (errors: string[]) => void;
  readOnly?: boolean;
  className?: string;
  renderFieldActions?: (ctx: {
    path: string[];
    uiSchema: UiSchema | undefined;
    schema: JsonSchema;
  }) => ReactNode;
}

function defaultWidget(schema: JsonSchema): UiWidget {
  if (schema.enum) return 'select';
  switch (schema.type) {
    case 'number':
    case 'integer':
      return 'updown';
    case 'boolean':
      return 'checkbox';
    case 'string':
    default:
      return 'text';
  }
}

interface FieldRendererProps {
  schema: JsonSchema;
  uiSchema: UiSchema | undefined;
  path: string[];
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  required?: boolean;
  renderFieldActions?: JsonSchemaFormProps['renderFieldActions'];
}

function FieldRenderer({
  schema,
  uiSchema,
  path,
  value,
  onChange,
  readOnly,
  required,
  renderFieldActions,
}: FieldRendererProps) {
  const widget = uiSchema?.['ui:widget'] ?? defaultWidget(schema);
  if (uiSchema?.['ui:hidden'] === true || widget === 'hidden') return null;

  const labelText =
    uiSchema?.['ui:label'] === false
      ? null
      : (uiSchema?.['ui:label'] as string | undefined) ?? schema.title ?? path[path.length - 1];
  const help = uiSchema?.['ui:help'] as string | undefined;
  const placeholder = uiSchema?.['ui:placeholder'] as string | undefined;
  const disabled = readOnly === true || uiSchema?.['ui:disabled'] === true;
  const readonly = readOnly === true || uiSchema?.['ui:readonly'] === true;
  const classNames = uiSchema?.['ui:classNames'] as string | undefined;
  const autoFocus = uiSchema?.['ui:autofocus'] === true;
  const fieldId = `jsf-${path.join('.')}`;

  // OBJECT
  if (schema.type === 'object' && schema.properties) {
    const order = (uiSchema?.['ui:order'] as string[] | undefined) ?? Object.keys(schema.properties);
    const requiredSet = new Set(schema.required ?? []);
    const obj = (value ?? {}) as Record<string, unknown>;
    return (
      <fieldset className={cn('space-y-3', classNames)}>
        {labelText && <legend className="text-sm font-medium">{labelText}</legend>}
        {order.map((name) => (
          <FieldRenderer
            key={name}
            schema={schema.properties![name]}
            uiSchema={uiSchema?.[name] as UiSchema | undefined}
            path={[...path, name]}
            value={obj[name]}
            onChange={(v) => onChange({ ...obj, [name]: v })}
            readOnly={readOnly}
            required={requiredSet.has(name)}
            renderFieldActions={renderFieldActions}
          />
        ))}
      </fieldset>
    );
  }

  // ARRAY
  if (schema.type === 'array' && schema.items) {
    const arr = Array.isArray(value) ? (value as unknown[]) : [];
    const itemUi = uiSchema?.items as UiSchema | undefined;
    return (
      <fieldset className={cn('space-y-2', classNames)}>
        {labelText && <legend className="text-sm font-medium">{labelText}</legend>}
        {arr.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <FieldRenderer
              schema={schema.items!}
              uiSchema={itemUi}
              path={[...path, String(i)]}
              value={item}
              onChange={(v) => onChange(arr.map((x, j) => (j === i ? v : x)))}
              readOnly={readOnly}
              renderFieldActions={renderFieldActions}
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange(arr.filter((_, j) => j !== i))}
                aria-label={`删除第 ${i + 1} 项`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button type="button" onClick={() => onChange([...arr, undefined])}>
            添加一项
          </button>
        )}
      </fieldset>
    );
  }

  // PRIMITIVE
  const actions = renderFieldActions?.({ path, uiSchema, schema });
  return (
    <div className={cn('space-y-1', classNames)}>
      {labelText && (
        <Label htmlFor={fieldId}>
          {labelText}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {renderPrimitive(widget, schema, fieldId, value, onChange, {
        placeholder,
        disabled,
        readonly,
        autoFocus,
      })}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {actions && <div className="mt-1">{actions}</div>}
    </div>
  );
}

interface WidgetHints {
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  autoFocus?: boolean;
}

function renderPrimitive(
  widget: UiWidget,
  _schema: JsonSchema,
  id: string,
  value: unknown,
  onChange: (v: unknown) => void,
  hints: WidgetHints
) {
  const { placeholder, disabled, readonly, autoFocus } = hints;
  switch (widget) {
    case 'textarea':
      return (
        <Textarea
          id={id}
          value={(value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readonly}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'password':
    case 'color':
    case 'date':
    case 'text':
      return (
        <Input
          id={id}
          type={widget}
          value={(value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readonly}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'updown':
      return (
        <Input
          id={id}
          type="number"
          value={(value as number | string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readonly}
          autoFocus={autoFocus}
          onChange={(e) =>
            onChange(e.target.value === '' ? undefined : Number(e.target.value))
          }
        />
      );
    case 'range':
      return (
        <Input
          id={id}
          type="range"
          value={(value as number) ?? 0}
          disabled={disabled}
          readOnly={readonly}
          autoFocus={autoFocus}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case 'checkbox':
      return (
        <Checkbox
          id={id}
          checked={value === true}
          disabled={disabled}
          autoFocus={autoFocus}
          onCheckedChange={(c) => onChange(c === true)}
        />
      );
    case 'radio': {
      const options: unknown[] = _schema.enum ? (_schema.enum as unknown[]) : [false, true];
      return (
        <div className="space-y-1">
          {options.map((opt) => (
            <label key={String(opt)} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={id}
                checked={value === opt}
                disabled={disabled}
                onChange={() => onChange(opt)}
              />
              {_schema.enum ? String(opt) : opt ? 'true' : 'false'}
            </label>
          ))}
        </div>
      );
    }
    case 'select': {
      const options = (_schema.enum ?? []) as unknown[];
      return (
        <Select
          value={value != null ? String(value) : undefined}
          disabled={disabled}
          onValueChange={(v) => {
            const opt = options.find((o) => String(o) === v);
            onChange(opt);
          }}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={String(opt)} value={String(opt)}>
                {String(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    default:
      return (
        <Input
          id={id}
          value={(value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function JsonSchemaForm({
  schema,
  uiSchema,
  value,
  onChange,
  readOnly,
  className,
  renderFieldActions,
}: JsonSchemaFormProps) {
  const effectiveUi = uiSchema ?? generateDefaultUiSchema(schema);
  return (
    <div className={cn('space-y-3', className)}>
      <FieldRenderer
        schema={schema}
        uiSchema={effectiveUi}
        path={[]}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        renderFieldActions={renderFieldActions}
      />
    </div>
  );
}