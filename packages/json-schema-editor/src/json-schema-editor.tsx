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
import { cn } from '@cisri/core';
import { ChevronDown, Minus, Plus, Redo2, Trash2, Undo2 } from 'lucide-react';
import {
  type JsonSchema,
  type JsonSchemaType,
  type SchemaField,
  buildField,
  defaultChildrenForType,
  ensureAtLeastOneField,
  fieldsToSchema,
  generateSampleData,
  schemaToFields,
} from './schema-utils';

export type { JsonSchema, JsonSchemaType } from './schema-utils';

export interface JsonSchemaEditorProps {
  value: JsonSchema;
  onChange: (value: JsonSchema) => void;
  onSave?: (value: JsonSchema) => void;
  readOnly?: boolean;
  className?: string;
}

type SchemaAction =
  | { type: 'update'; id: string; patch: Partial<Pick<SchemaField, 'name' | 'type' | 'required' | 'description'>> }
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

function addSiblingAfter(
  fields: SchemaField[],
  siblingId: string
): SchemaField[] | null {
  const index = fields.findIndex((field) => field.id === siblingId);
  if (index !== -1) {
    const newField = buildField(
      `field${fields.length + 1}`,
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

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a == null ||
    b == null
  ) {
    return false;
  }
  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;
  if (aIsArray) {
    const aArr = a as unknown[];
    const bArr = b as unknown[];
    if (aArr.length !== bArr.length) return false;
    return aArr.every((item, index) => deepEqual(item, bArr[index]));
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
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
  showAdd: boolean;
  showDelete?: boolean;
  disableDelete?: boolean;
  onAdd: () => void;
  onDelete: () => void;
}

function SchemaRowActions({
  fieldName,
  showAdd,
  showDelete = true,
  disableDelete,
  onAdd,
  onDelete,
}: SchemaRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {showAdd && (
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
      )}
      {showDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={disableDelete}
          onClick={onDelete}
          aria-label={`删除字段 ${fieldName || '未命名'}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}

interface SchemaFieldRowProps {
  field: SchemaField;
  level: number;
  readOnly?: boolean;
  disableDelete?: boolean;
  dispatch: (action: SchemaAction) => void;
}

function SchemaFieldRow({ field, level, readOnly, disableDelete, dispatch }: SchemaFieldRowProps) {
  const hasChildren = field.children.length > 0;
  const displayName = field.name || '未命名';

  return (
    <>
      <TableRow className={cn(field.isRoot && 'bg-muted/30')}>
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
              disabled={readOnly || field.isArrayItem}
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
          {field.isArrayItem || field.isRoot ? null : (
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
          )}
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
          {!readOnly && !field.isRoot && (
            <SchemaRowActions
              fieldId={field.id}
              fieldName={field.name}
              showAdd={!field.isArrayItem}
              showDelete={!field.isArrayItem}
              disableDelete={disableDelete}
              onAdd={() =>
                dispatch({
                  type: 'addSibling',
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
            disableDelete={field.type === 'object' && field.children.length <= 1}
            dispatch={dispatch}
          />
        ))}
    </>
  );
}

interface EditorState {
  history: SchemaField[][];
  index: number;
}

export function JsonSchemaEditor({
  value,
  onChange,
  onSave,
  readOnly,
  className,
}: JsonSchemaEditorProps) {
  const [editorState, setEditorState] = useState<EditorState>(() => ({
    history: [ensureAtLeastOneField(schemaToFields(value))],
    index: 0,
  }));
  const fields = editorState.history[editorState.index];
  const editorStateRef = useRef(editorState);
  useEffect(() => {
    editorStateRef.current = editorState;
  }, [editorState]);

  const [viewMode, setViewMode] = useState<'json' | 'preview' | 'table'>('table');
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(value, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const isJsonEditingRef = useRef(false);
  const lastEmittedSchemaRef = useRef<JsonSchema>(value);

  const jsonString = useMemo(() => JSON.stringify(value, null, 2), [value]);

  useEffect(() => {
    if (!deepEqual(value, lastEmittedSchemaRef.current)) {
      const nextFields = ensureAtLeastOneField(schemaToFields(value));
      setEditorState({ history: [nextFields], index: 0 });
      lastEmittedSchemaRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (!isJsonEditingRef.current) {
      setJsonText(jsonString);
      setJsonError(null);
    }
  }, [jsonString]);

  useEffect(() => {
    setCopiedLabel(null);
  }, [viewMode]);

  const pushSnapshot = useCallback((nextFields: SchemaField[]) => {
    setEditorState((prev) => {
      if (deepEqual(prev.history[prev.index], nextFields)) return prev;
      return {
        history: [...prev.history.slice(0, prev.index + 1), nextFields],
        index: prev.index + 1,
      };
    });
  }, []);

  const dispatch = useCallback(
    (action: SchemaAction) => {
      const currentFields =
        editorStateRef.current.history[editorStateRef.current.index];
      const root = currentFields[0];

      if (
        root &&
        action.id === root.id &&
        (action.type === 'delete' || action.type === 'addSibling')
      ) {
        return;
      }

      let nextFields: SchemaField[];
      switch (action.type) {
        case 'update':
          nextFields = updateFieldById(currentFields, action.id, action.patch);
          break;
        case 'addSibling':
          nextFields = addSiblingAfter(currentFields, action.id) ?? currentFields;
          break;
        case 'delete':
          nextFields = deleteFieldById(currentFields, action.id);
          break;
        case 'toggleExpand':
          nextFields = toggleExpandById(currentFields, action.id);
          break;
        default:
          return;
      }
      nextFields = ensureAtLeastOneField(nextFields);
      const schema = fieldsToSchema(nextFields);
      lastEmittedSchemaRef.current = schema;
      pushSnapshot(nextFields);
      onChange(schema);
    },
    [onChange, pushSnapshot]
  );

  const canUndo = editorState.index > 0;
  const canRedo = editorState.index < editorState.history.length - 1;

  const handleUndo = useCallback(() => {
    const current = editorStateRef.current;
    if (current.index <= 0) return;
    const nextIndex = current.index - 1;
    const nextFields = current.history[nextIndex];
    const schema = fieldsToSchema(nextFields);
    setEditorState({ ...current, index: nextIndex });
    lastEmittedSchemaRef.current = schema;
    onChange(schema);
  }, [onChange]);

  const handleRedo = useCallback(() => {
    const current = editorStateRef.current;
    if (current.index >= current.history.length - 1) return;
    const nextIndex = current.index + 1;
    const nextFields = current.history[nextIndex];
    const schema = fieldsToSchema(nextFields);
    setEditorState({ ...current, index: nextIndex });
    lastEmittedSchemaRef.current = schema;
    onChange(schema);
  }, [onChange]);

  const handleSetViewMode = useCallback(
    (mode: 'json' | 'preview' | 'table') => () => {
      setViewMode(mode);
      if (mode === 'json') {
        setJsonText(jsonString);
        setJsonError(null);
      }
    },
    [jsonString]
  );

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
          const nextFields = ensureAtLeastOneField(schemaToFields(parsed as JsonSchema));
          const schema = fieldsToSchema(nextFields);
          lastEmittedSchemaRef.current = schema;
          pushSnapshot(nextFields);
          onChange(schema);
          setJsonError(null);
        } else {
          setJsonError('请输入有效的 JSON 对象。');
        }
      } catch {
        setJsonError('JSON 解析失败，请检查格式。');
      }
    },
    [onChange, pushSnapshot]
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
      let text = jsonString;
      let label = '已复制 json schema';
      if (viewMode === 'preview') {
        text = JSON.stringify(generateSampleData(value), null, 2);
        label = '已复制 json 示例';
      }
      await navigator.clipboard.writeText(text);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(null), 1500);
    } catch {
      // Ignore clipboard errors.
    }
  }, [jsonString, value, viewMode]);

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
        <div className="inline-flex items-center overflow-hidden rounded-md border border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSetViewMode('table')}
            className={cn(
              'h-7 rounded-none border-r border-border text-xs',
              viewMode === 'table' && 'bg-muted'
            )}
          >
            表格视图
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSetViewMode('json')}
            className={cn(
              'h-7 rounded-none border-r border-border text-xs',
              viewMode === 'json' && 'bg-muted'
            )}
          >
            JSON 视图
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSetViewMode('preview')}
            className={cn(
              'h-7 rounded-none text-xs',
              viewMode === 'preview' && 'bg-muted'
            )}
          >
            预览
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          {viewMode !== 'table' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 text-xs"
            >
              {copiedLabel ?? '复制'}
            </Button>
          )}
          {!readOnly && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleUndo}
                disabled={!canUndo}
                className="h-7 w-7"
                aria-label="撤销"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRedo}
                disabled={!canRedo}
                className="h-7 w-7"
                aria-label="恢复"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </>
          )}

        </div>
      </div>

      {viewMode === 'json' ? (
        <div className="space-y-2 p-2">
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
      ) : viewMode === 'preview' ? (
        <div className="p-2">
          <Textarea
            value={JSON.stringify(generateSampleData(value), null, 2)}
            readOnly
            className="min-h-[320px] font-mono text-xs"
          />
        </div>
      ) : (
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
            {fields.map((field) => (
              <SchemaFieldRow
                key={field.id}
                field={field}
                level={0}
                readOnly={readOnly}
                disableDelete={true}
                dispatch={dispatch}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
