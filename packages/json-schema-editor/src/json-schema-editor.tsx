import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Textarea } from './ui/textarea';
import { cn } from '@arim/core';
import { ChevronDown, Minus, Plus, Trash2 } from 'lucide-react';

export type JsonSchemaType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'integer';

export interface JsonSchema {
  type?: JsonSchemaType;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
}

export interface JsonSchemaEditorProps {
  value: JsonSchema;
  onChange: (value: JsonSchema) => void;
  onSave?: (value: JsonSchema) => void;
  readOnly?: boolean;
  className?: string;
}

interface SchemaField {
  id: string;
  name: string;
  type: JsonSchemaType;
  required: boolean;
  description?: string;
  schema: JsonSchema;
  children: SchemaField[];
  expanded: boolean;
}

type SchemaAction =
  | { type: 'update'; id: string; patch: Partial<Pick<SchemaField, 'name' | 'type' | 'required' | 'description'>> }
  | { type: 'addChild'; id: string }
  | { type: 'addSibling'; id: string }
  | { type: 'delete'; id: string }
  | { type: 'toggleExpand'; id: string };

const TYPE_OPTIONS: JsonSchemaType[] = [
  'object',
  'array',
  'string',
  'number',
  'integer',
  'boolean',
];

let globalIdCounter = 0;

function generateId(): string {
  return `sf-${++globalIdCounter}`;
}

function defaultChildrenForType(type: JsonSchemaType): SchemaField[] {
  if (type === 'object') {
    return [buildField('字段1', { type: 'string' }, new Set())];
  }
  if (type === 'array') {
    return [buildField('元素', { type: 'string' }, new Set())];
  }
  return [];
}

function buildField(
  name: string,
  schema: JsonSchema,
  requiredSet: Set<string>
): SchemaField {
  const type = schema.type ?? 'object';
  const children: SchemaField[] = [];

  if (type === 'object' && schema.properties) {
    const childRequired = new Set(schema.required ?? []);
    for (const [childName, childSchema] of Object.entries(schema.properties)) {
      children.push(buildField(childName, childSchema, childRequired));
    }
  } else if (type === 'array' && schema.items) {
    children.push(buildField('元素', schema.items, new Set()));
  }

  return {
    id: generateId(),
    name,
    type,
    required: requiredSet.has(name),
    description: schema.description,
    schema,
    children,
    expanded: true,
  };
}

function schemaToFields(schema: JsonSchema): SchemaField[] {
  const type = schema.type ?? 'object';
  if (type !== 'object' || !schema.properties) {
    return [];
  }
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, childSchema]) =>
    buildField(name, childSchema, required)
  );
}

function fieldsToSchema(fields: SchemaField[]): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const field of fields) {
    properties[field.name] = fieldToSchema(field);
    if (field.required) required.push(field.name);
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function fieldToSchema(field: SchemaField): JsonSchema {
  const base: JsonSchema = { ...field.schema };

  if (field.type === 'object') {
    const childSchema = fieldsToSchema(field.children);
    return {
      ...base,
      type: field.type,
      description: field.description,
      properties: childSchema.properties,
      required: childSchema.required,
      items: undefined,
    };
  }

  if (field.type === 'array') {
    const itemField = field.children[0];
    return {
      ...base,
      type: field.type,
      description: field.description,
      items: itemField ? fieldToSchema(itemField) : { type: 'string' },
      properties: undefined,
      required: undefined,
    };
  }

  return {
    ...base,
    type: field.type,
    description: field.description,
    properties: undefined,
    items: undefined,
    required: undefined,
  };
}

function updateFieldById(
  fields: SchemaField[],
  id: string,
  patch: Partial<Pick<SchemaField, 'name' | 'type' | 'required' | 'description'>>
): SchemaField[] {
  return fields.map((field) => {
    if (field.id === id) {
      const next: SchemaField = { ...field, ...patch };
      if (patch.type && patch.type !== field.type) {
        next.children = defaultChildrenForType(patch.type);
      }
      return next;
    }
    if (field.children.length > 0) {
      return {
        ...field,
        children: updateFieldById(field.children, id, patch),
      };
    }
    return field;
  });
}

function addChildField(fields: SchemaField[], parentId: string): SchemaField[] {
  return fields.map((field) => {
    if (field.id === parentId) {
      const newField = buildField(
        `字段${field.children.length + 1}`,
        { type: 'string' },
        new Set()
      );
      return {
        ...field,
        expanded: true,
        children: [...field.children, newField],
      };
    }
    if (field.children.length > 0) {
      return {
        ...field,
        children: addChildField(field.children, parentId),
      };
    }
    return field;
  });
}

function addSiblingAfter(
  fields: SchemaField[],
  siblingId: string
): SchemaField[] | null {
  const index = fields.findIndex((field) => field.id === siblingId);
  if (index !== -1) {
    const newField = buildField(
      `字段${fields.length + 1}`,
      { type: 'string' },
      new Set()
    );
    const next = [...fields];
    next.splice(index + 1, 0, newField);
    return next;
  }
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].children.length > 0) {
      const updatedChildren = addSiblingAfter(fields[i].children, siblingId);
      if (updatedChildren) {
        return [
          ...fields.slice(0, i),
          { ...fields[i], children: updatedChildren },
          ...fields.slice(i + 1),
        ];
      }
    }
  }
  return null;
}

function deleteFieldById(fields: SchemaField[], id: string): SchemaField[] {
  return fields
    .filter((field) => field.id !== id)
    .map((field) => ({
      ...field,
      children: deleteFieldById(field.children, id),
    }));
}

function toggleExpandById(fields: SchemaField[], id: string): SchemaField[] {
  return fields.map((field) => {
    if (field.id === id) {
      return { ...field, expanded: !field.expanded };
    }
    if (field.children.length > 0) {
      return {
        ...field,
        children: toggleExpandById(field.children, id),
      };
    }
    return field;
  });
}

function TreeIndent({ level }: { level: number }) {
  return (
    <>
      {Array.from({ length: level }).map((_, index) => (
        <span key={index} className="inline-block w-5 shrink-0" />
      ))}
    </>
  );
}

interface SchemaTypeSelectProps {
  value: JsonSchemaType;
  'aria-label'?: string;
  disabled?: boolean;
  onChange: (value: JsonSchemaType) => void;
}

function SchemaTypeSelect({
  value,
  'aria-label': ariaLabel,
  disabled,
  onChange,
}: SchemaTypeSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as JsonSchemaType)} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className="h-7 w-28 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TYPE_OPTIONS.map((t) => (
          <SelectItem key={t} value={t} className="text-xs">
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface SchemaRowActionsProps {
  fieldId: string;
  fieldName: string;
  onAdd: () => void;
  onDelete: () => void;
}

function SchemaRowActions({
  fieldName,
  onAdd,
  onDelete,
}: SchemaRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onAdd}
        aria-label={`在字段 ${fieldName || '未命名'} 后添加行`}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onDelete}
        aria-label={`删除字段 ${fieldName || '未命名'}`}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

interface SchemaFieldRowProps {
  field: SchemaField;
  level: number;
  readOnly?: boolean;
  dispatch: (action: SchemaAction) => void;
}

function SchemaFieldRow({ field, level, readOnly, dispatch }: SchemaFieldRowProps) {
  const hasChildren = field.children.length > 0;
  const displayName = field.name || '未命名';

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center">
            <TreeIndent level={level} />
            {hasChildren ? (
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: 'toggleExpand', id: field.id })
                }
                className="mr-1 inline-flex h-3.5 w-3.5 items-center justify-center text-muted-foreground"
                aria-label={field.expanded ? '折叠' : '展开'}
              >
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    !field.expanded && '-rotate-90'
                  )}
                />
              </button>
            ) : (
              <Minus className="mr-1 h-3.5 w-3.5 text-muted-foreground/60" />
            )}
            <Input
              id={`schema-name-${field.id}`}
              name={`schema-name-${field.id}`}
              aria-label={`字段 ${displayName} 名称`}
              autoComplete="off"
              disabled={readOnly}
              className="h-7 border-transparent bg-transparent px-1 shadow-none focus-visible:bg-background disabled:opacity-100"
              value={field.name}
              onChange={(event) =>
                dispatch({
                  type: 'update',
                  id: field.id,
                  patch: { name: event.target.value },
                })
              }
            />
          </div>
        </TableCell>
        <TableCell>
          <SchemaTypeSelect
            value={field.type}
            aria-label={`字段 ${displayName} 类型`}
            disabled={readOnly}
            onChange={(value) =>
              dispatch({ type: 'update', id: field.id, patch: { type: value } })
            }
          />
        </TableCell>
        <TableCell>
          <Checkbox
            id={`schema-required-${field.id}`}
            name={`schema-required-${field.id}`}
            aria-label={`字段 ${displayName} 是否必填`}
            checked={field.required}
            disabled={readOnly}
            onCheckedChange={(checked: boolean | 'indeterminate') =>
              dispatch({
                type: 'update',
                id: field.id,
                patch: { required: checked === true },
              })
            }
          />
        </TableCell>
        <TableCell>
          <Input
            id={`schema-description-${field.id}`}
            name={`schema-description-${field.id}`}
            aria-label={`字段 ${displayName} 描述`}
            autoComplete="off"
            disabled={readOnly}
            className="h-7 border-transparent bg-transparent px-1 shadow-none focus-visible:bg-background disabled:opacity-100"
            value={field.description ?? ''}
            onChange={(event) =>
              dispatch({
                type: 'update',
                id: field.id,
                patch: { description: event.target.value },
              })
            }
          />
        </TableCell>
        <TableCell>
          {!readOnly && (
            <SchemaRowActions
              fieldId={field.id}
              fieldName={field.name}
              onAdd={() =>
                dispatch({
                  type: field.type === 'object' ? 'addChild' : 'addSibling',
                  id: field.id,
                })
              }
              onDelete={() => dispatch({ type: 'delete', id: field.id })}
            />
          )}
        </TableCell>
      </TableRow>
      {field.expanded &&
        field.children.map((child) => (
          <SchemaFieldRow
            key={child.id}
            field={child}
            level={level + 1}
            readOnly={readOnly}
            dispatch={dispatch}
          />
        ))}
    </>
  );
}

export function JsonSchemaEditor({
  value,
  onChange,
  onSave,
  readOnly,
  className,
}: JsonSchemaEditorProps) {
  const [fields, setFields] = useState<SchemaField[]>(() =>
    schemaToFields(value)
  );
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(value, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isJsonEditingRef = useRef(false);
  const prevValueRef = useRef(value);

  const jsonString = useMemo(() => JSON.stringify(value, null, 2), [value]);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setFields(schemaToFields(value));
      prevValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (!isJsonEditingRef.current) {
      setJsonText(jsonString);
      setJsonError(null);
    }
  }, [jsonString]);

  const dispatch = useCallback(
    (action: SchemaAction) => {
      let nextFields: SchemaField[];
      switch (action.type) {
        case 'update':
          nextFields = updateFieldById(fields, action.id, action.patch);
          break;
        case 'addChild':
          nextFields = addChildField(fields, action.id);
          break;
        case 'addSibling':
          nextFields = addSiblingAfter(fields, action.id) ?? fields;
          break;
        case 'delete':
          nextFields = deleteFieldById(fields, action.id);
          break;
        case 'toggleExpand':
          nextFields = toggleExpandById(fields, action.id);
          break;
        default:
          return;
      }
      setFields(nextFields);
      onChange(fieldsToSchema(nextFields));
    },
    [fields, onChange]
  );

  const handleToggleJsonEditor = useCallback(() => {
    setShowJsonEditor((prev) => {
      const next = !prev;
      if (next) {
        setJsonText(jsonString);
        setJsonError(null);
      }
      return next;
    });
  }, [jsonString]);

  const handleJsonChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = event.target.value;
      setJsonText(text);
      try {
        const parsed = JSON.parse(text);
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed)
        ) {
          onChange(parsed as JsonSchema);
          setJsonError(null);
        } else {
          setJsonError('请输入有效的 JSON 对象。');
        }
      } catch {
        setJsonError('JSON 解析失败，请检查格式。');
      }
    },
    [onChange]
  );

  const handleJsonFocus = useCallback(() => {
    isJsonEditingRef.current = true;
  }, []);

  const handleJsonBlur = useCallback(() => {
    isJsonEditingRef.current = false;
    setJsonText(jsonString);
    setJsonError(null);
  }, [jsonString]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard errors.
    }
  }, [jsonString]);

  const handleSave = useCallback(() => {
    onSave?.(value);
  }, [onSave, value]);

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card text-card-foreground',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleJsonEditor}
            className="h-7 text-xs"
          >
            {showJsonEditor ? '表格视图' : 'JSON 视图'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs"
          >
            {copied ? '已复制' : '复制'}
          </Button>
        </div>
        {!readOnly && onSave && (
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="h-7 text-xs"
          >
            保存
          </Button>
        )}
      </div>

      {showJsonEditor ? (
        <div className="p-2 space-y-2">
          <Textarea
            value={jsonText}
            onChange={readOnly ? undefined : handleJsonChange}
            onFocus={readOnly ? undefined : handleJsonFocus}
            onBlur={readOnly ? undefined : handleJsonBlur}
            readOnly={readOnly}
            placeholder="在此编辑或粘贴 JSON Schema..."
            className="min-h-[320px] font-mono text-xs"
          />
          {jsonError && (
            <p className="text-xs text-destructive">{jsonError}</p>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%]">名称</TableHead>
                <TableHead className="w-[18%]">类型</TableHead>
                <TableHead className="w-[12%]">必填</TableHead>
                <TableHead className="w-[30%]">描述</TableHead>
                <TableHead className="w-[12%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    暂无字段。
                  </TableCell>
                </TableRow>
              ) : (
                fields.map((field) => (
                  <SchemaFieldRow
                    key={field.id}
                    field={field}
                    level={0}
                    readOnly={readOnly}
                    dispatch={dispatch}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
