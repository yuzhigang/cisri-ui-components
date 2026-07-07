import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import {
  Button,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cisri/shadcn';
import { cn } from '@cisri/core';
import { GripVertical, Plus, Redo2, Trash2, Undo2 } from 'lucide-react';
import {
  createEmptyColumn,
  type DbColumn,
  type DbColumnType,
  type DbTable,
} from '@cisri/db-schema-core';
import {
  deleteColumn,
  deepEqual,
  insertColumnBelow,
  reorderColumns,
  updateColumn,
  updateTableDescription,
  updateTableName,
  type ColumnPatch,
} from './schema-utils';

export interface DbSchemaEditorProps {
  value: DbTable;
  onChange: (value: DbTable) => void;
  onSave?: (value: DbTable) => void;
  readOnly?: boolean;
  className?: string;
}

const TYPE_OPTIONS: DbColumnType[] = [
  'varchar',
  'text',
  'integer',
  'bigint',
  'decimal',
  'boolean',
  'date',
  'timestamp',
  'uuid',
  'jsonb',
];

interface EditorState {
  history: DbTable[];
  index: number;
}

interface SortableColumnRowProps {
  column: DbColumn;
  readOnly?: boolean;
  disableDelete?: boolean;
  onUpdate: (patch: ColumnPatch) => void;
  onInsertBelow: () => void;
  onDelete: () => void;
}

function SortableColumnRow({
  column,
  readOnly,
  disableDelete,
  onUpdate,
  onInsertBelow,
  onDelete,
}: SortableColumnRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.id, disabled: readOnly });
  const displayName = column.name || '未命名';
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-50')}
    >
      <TableCell className="w-10 px-2">
        {!readOnly ? (
          <button
            type="button"
            className="flex h-7 w-7 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
            aria-label={`拖动列 ${displayName} 排序`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="pointer-events-none h-4 w-4" />
          </button>
        ) : (
          <span className="flex h-7 w-7 items-center justify-center text-muted-foreground/30">
            <GripVertical className="h-4 w-4" />
          </span>
        )}
      </TableCell>
      <TableCell>
        <Input
          aria-label={`列 ${displayName} 名称`}
          autoComplete="off"
          disabled={readOnly}
          className="h-7"
          value={column.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Select
          value={column.type}
          onValueChange={(v) => onUpdate({ type: v as DbColumnType })}
          disabled={readOnly}
        >
          <SelectTrigger aria-label={`列 ${displayName} 类型`} className="h-7 w-28 text-xs">
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
      </TableCell>
      <TableCell>
        <Checkbox
          aria-label={`列 ${displayName} 可空`}
          checked={column.nullable}
          disabled={readOnly}
          onCheckedChange={(c: boolean | 'indeterminate') => onUpdate({ nullable: c === true })}
        />
      </TableCell>
      <TableCell>
        <Checkbox
          aria-label={`列 ${displayName} 主键`}
          checked={column.primaryKey}
          disabled={readOnly}
          onCheckedChange={(c: boolean | 'indeterminate') => onUpdate({ primaryKey: c === true })}
        />
      </TableCell>
      <TableCell>
        <Checkbox
          aria-label={`列 ${displayName} 唯一`}
          checked={column.unique}
          disabled={readOnly}
          onCheckedChange={(c: boolean | 'indeterminate') => onUpdate({ unique: c === true })}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label={`列 ${displayName} 默认值`}
          autoComplete="off"
          disabled={readOnly}
          className="h-7"
          value={column.defaultValue ?? ''}
          onChange={(e) => onUpdate({ defaultValue: e.target.value || undefined })}
        />
      </TableCell>
      <TableCell>
        <Input
          aria-label={`列 ${displayName} 描述`}
          autoComplete="off"
          disabled={readOnly}
          className="h-7"
          value={column.description ?? ''}
          onChange={(e) => onUpdate({ description: e.target.value || undefined })}
        />
      </TableCell>
      <TableCell>
        {!readOnly && (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onInsertBelow}
              aria-label={`在列 ${displayName} 下方添加列`}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={disableDelete}
              onClick={onDelete}
              aria-label={`删除列 ${displayName}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export function DbSchemaEditor({
  value,
  onChange,
  onSave,
  readOnly,
  className,
}: DbSchemaEditorProps) {
  const [editorState, setEditorState] = useState<EditorState>(() => ({
    history: [value],
    index: 0,
  }));
  const table = editorState.history[editorState.index];
  const editorStateRef = useRef(editorState);
  useEffect(() => {
    editorStateRef.current = editorState;
  }, [editorState]);
  const lastEmittedRef = useRef<DbTable>(value);
  // 空表时的占位空列（稳定 id，保证占位 → 实体化时 React key 不变、输入焦点不丢）。
  const [placeholderCol] = useState<DbColumn>(() => createEmptyColumn());

  // 外部 value 变化时重置历史（若非本组件发出）。
  useEffect(() => {
    if (!deepEqual(value, lastEmittedRef.current)) {
      setEditorState({ history: [value], index: 0 });
      lastEmittedRef.current = value;
    }
  }, [value]);

  const pushSnapshot = useCallback((next: DbTable) => {
    setEditorState((prev) => {
      if (deepEqual(prev.history[prev.index], next)) return prev;
      return {
        history: [...prev.history.slice(0, prev.index + 1), next],
        index: prev.index + 1,
      };
    });
  }, []);

  const commit = useCallback(
    (next: DbTable) => {
      lastEmittedRef.current = next;
      pushSnapshot(next);
      onChange(next);
    },
    [onChange, pushSnapshot]
  );

  const canUndo = editorState.index > 0;
  const canRedo = editorState.index < editorState.history.length - 1;

  const handleUndo = useCallback(() => {
    const cur = editorStateRef.current;
    if (cur.index <= 0) return;
    const nextIndex = cur.index - 1;
    const next = cur.history[nextIndex];
    setEditorState({ ...cur, index: nextIndex });
    lastEmittedRef.current = next;
    onChange(next);
  }, [onChange]);

  const handleRedo = useCallback(() => {
    const cur = editorStateRef.current;
    if (cur.index >= cur.history.length - 1) return;
    const nextIndex = cur.index + 1;
    const next = cur.history[nextIndex];
    setEditorState({ ...cur, index: nextIndex });
    lastEmittedRef.current = next;
    onChange(next);
  }, [onChange]);

  const handleSave = useCallback(() => {
    onSave?.(table);
  }, [onSave, table]);

  // dnd-kit 拖拽排序（PointerSensor + KeyboardSensor，键盘可排序；restrictToVerticalAxis 限定纵向）。
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      commit(reorderColumns(table, String(active.id), String(over.id)));
    },
    [commit, table]
  );

  const sortableItems =
    table.columns.length > 0
      ? table.columns.map((c) => c.id)
      : readOnly
        ? []
        : [placeholderCol.id];

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card text-card-foreground',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-2">
        <div className="text-sm font-medium">数据库表编辑器</div>
        <div className="flex items-center gap-2">
          {!readOnly && onSave && (
            <Button type="button" size="sm" onClick={handleSave} className="h-7 text-xs">
              保存
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

      <div className="space-y-2 border-b border-border p-2">
        <div className="flex items-center gap-2">
          <label htmlFor="db-table-name" className="w-10 shrink-0 text-xs text-muted-foreground">
            表名
          </label>
          <Input
            id="db-table-name"
            autoComplete="off"
            disabled={readOnly}
            className="h-7"
            value={table.name}
            onChange={(e) => commit(updateTableName(table, e.target.value))}
          />
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="db-table-description"
            className="w-10 shrink-0 text-xs text-muted-foreground"
          >
            描述
          </label>
          <Input
            id="db-table-description"
            autoComplete="off"
            disabled={readOnly}
            className="h-7"
            value={table.description ?? ''}
            onChange={(e) =>
              commit(updateTableDescription(table, e.target.value || undefined))
            }
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead className="w-[20%]">名称</TableHead>
              <TableHead className="w-[12%]">类型</TableHead>
              <TableHead className="w-[8%]">可空</TableHead>
              <TableHead className="w-[8%]">主键</TableHead>
              <TableHead className="w-[8%]">唯一</TableHead>
              <TableHead className="w-[14%]">默认值</TableHead>
              <TableHead className="w-[20%]">描述</TableHead>
              <TableHead className="w-[10%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
              {table.columns.length === 0 ? (
                readOnly ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-12 text-center text-sm text-muted-foreground">
                      暂无列
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableColumnRow
                    key={placeholderCol.id}
                    column={placeholderCol}
                    disableDelete
                    onUpdate={(patch) =>
                      commit({ ...table, columns: [{ ...placeholderCol, ...patch }] })
                    }
                    onInsertBelow={() =>
                      commit(
                        insertColumnBelow({ ...table, columns: [placeholderCol] }, placeholderCol.id)
                      )
                    }
                    onDelete={() => {}}
                  />
                )
              ) : (
                table.columns.map((col) => (
                  <SortableColumnRow
                    key={col.id}
                    column={col}
                    readOnly={readOnly}
                    onUpdate={(patch) => commit(updateColumn(table, col.id, patch))}
                    onInsertBelow={() => commit(insertColumnBelow(table, col.id))}
                    onDelete={() => commit(deleteColumn(table, col.id))}
                  />
                ))
              )}
            </SortableContext>
          </TableBody>
        </Table>
      </DndContext>
    </div>
  );
}