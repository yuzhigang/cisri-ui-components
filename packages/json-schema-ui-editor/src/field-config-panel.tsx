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
import { GripVertical } from 'lucide-react';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@cisri/shadcn';
import { cn } from '@cisri/core';
import type { JsonSchema } from '@cisri/json-schema-core';
import type { UiSchema, UiWidget } from '@cisri/json-schema-ui-core';
import { isPrimitiveField, reorderOrder, widgetsForSchema } from './ui-editor-utils';

interface SortableOrderItemProps {
  name: string;
}

function SortableOrderItem({ name }: SortableOrderItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: name });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded border border-border px-2 py-1',
        isDragging && 'opacity-50'
      )}
    >
      <button
        type="button"
        className="flex h-6 w-6 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
        aria-label={`拖动字段 ${name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="pointer-events-none h-4 w-4" />
      </button>
      <span className="text-sm">{name}</span>
    </div>
  );
}

interface OrderListProps {
  order: string[];
  onReorder: (next: string[]) => void;
}

function OrderList({ order, onReorder }: OrderListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(reorderOrder(order, String(active.id), String(over.id)));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {order.map((name) => (
            <SortableOrderItem key={name} name={name} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export interface FieldConfigPanelProps {
  schema: JsonSchema;
  uiField: UiSchema | undefined;
  onPatch: (patch: Partial<UiSchema>) => void;
}

export function FieldConfigPanel({ schema, uiField, onPatch }: FieldConfigPanelProps) {
  const primitive = isPrimitiveField(schema);
  const isOrderable = schema.type === 'object' && !!schema.properties;
  const widgets = widgetsForSchema(schema);
  const labelValue = typeof uiField?.['ui:label'] === 'string' ? uiField['ui:label'] : '';
  const hideLabel = uiField?.['ui:label'] === false;

  return (
    <div className="space-y-3">
      {widgets.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="ui-cfg-widget">Widget</Label>
          <Select
            value={(uiField?.['ui:widget'] as UiWidget | undefined) ?? widgets[0]}
            onValueChange={(v) => onPatch({ 'ui:widget': v as UiWidget })}
          >
            <SelectTrigger id="ui-cfg-widget" aria-label="widget">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {widgets.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="ui-cfg-label">Label</Label>
        <Input
          id="ui-cfg-label"
          autoComplete="off"
          value={labelValue}
          onChange={(e) => onPatch({ 'ui:label': e.target.value || undefined })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="ui-cfg-hide-label"
          aria-label="隐藏 label"
          checked={hideLabel}
          onCheckedChange={(c) => onPatch({ 'ui:label': c ? false : undefined })}
        />
        <Label htmlFor="ui-cfg-hide-label">隐藏 label</Label>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ui-cfg-help">Help</Label>
        <Input
          id="ui-cfg-help"
          autoComplete="off"
          value={(uiField?.['ui:help'] as string | undefined) ?? ''}
          onChange={(e) => onPatch({ 'ui:help': e.target.value || undefined })}
        />
      </div>
      {primitive && (
        <div className="space-y-1">
          <Label htmlFor="ui-cfg-placeholder">Placeholder</Label>
          <Input
            id="ui-cfg-placeholder"
            autoComplete="off"
            value={(uiField?.['ui:placeholder'] as string | undefined) ?? ''}
            onChange={(e) => onPatch({ 'ui:placeholder': e.target.value || undefined })}
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Switch
          id="ui-cfg-hidden"
          aria-label="隐藏字段"
          checked={uiField?.['ui:hidden'] === true}
          onCheckedChange={(c) => onPatch({ 'ui:hidden': c })}
        />
        <Label htmlFor="ui-cfg-hidden">隐藏字段</Label>
      </div>
      {primitive && (
        <div className="flex items-center gap-2">
          <Switch
            id="ui-cfg-disabled"
            aria-label="禁用"
            checked={uiField?.['ui:disabled'] === true}
            onCheckedChange={(c) => onPatch({ 'ui:disabled': c })}
          />
          <Label htmlFor="ui-cfg-disabled">禁用</Label>
        </div>
      )}
      {primitive && (
        <div className="flex items-center gap-2">
          <Switch
            id="ui-cfg-readonly"
            aria-label="只读"
            checked={uiField?.['ui:readonly'] === true}
            onCheckedChange={(c) => onPatch({ 'ui:readonly': c })}
          />
          <Label htmlFor="ui-cfg-readonly">只读</Label>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="ui-cfg-classnames">Class names</Label>
        <Input
          id="ui-cfg-classnames"
          autoComplete="off"
          value={(uiField?.['ui:classNames'] as string | undefined) ?? ''}
          onChange={(e) => onPatch({ 'ui:classNames': e.target.value || undefined })}
        />
      </div>
      {isOrderable && (
        <div className="space-y-1">
          <Label>字段顺序</Label>
          <OrderList
            order={(uiField?.['ui:order'] as string[] | undefined) ?? Object.keys(schema.properties!)}
            onReorder={(next) => onPatch({ 'ui:order': next })}
          />
        </div>
      )}
    </div>
  );
}