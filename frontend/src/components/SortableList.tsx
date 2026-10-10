import { useRef, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableListProps<T> = {
  items: T[];
  getId: (item: T) => string;
  /** Nome do item, usado no rótulo da alça e nos avisos para leitores de tela. */
  getLabel: (item: T) => string;
  /** Recebe a lista já na nova ordem. */
  onReorder: (items: T[]) => void;
  disabled?: boolean;
  className?: string;
  itemClassName?: (item: T) => string;
  /** Renderiza o item; `handle` é a alça de arrastar, posicionada onde o item quiser. */
  children: (item: T, handle: ReactNode, index: number) => ReactNode;
};

const screenReaderInstructions = {
  draggable:
    "Para reordenar, pressione espaço ou Enter para pegar o item, use as setas para mover e pressione espaço ou Enter de novo para soltar. Esc cancela.",
};

/** Lista reordenável por arrastar (mouse ou toque) ou pelo teclado na alça ⠿. */
export default function SortableList<T>({
  items,
  getId,
  getLabel,
  onReorder,
  disabled = false,
  className,
  itemClassName,
  children,
}: SortableListProps<T>) {
  const sensors = useSensors(
    // Pequena distância mínima: um clique simples na alça não inicia o arraste.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = items.map(getId);
  // Último alvo anunciado: o arraste começa "sobre" o próprio item, o que não deve sobrescrever o aviso inicial.
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const labelOf = (id: UniqueIdentifier) => {
    const item = items.find((candidate) => getId(candidate) === id);
    return item ? `"${getLabel(item)}"` : "item";
  };
  const positionOf = (id: UniqueIdentifier | undefined) => (id === undefined ? 0 : ids.indexOf(String(id)) + 1);

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      lastOverId.current = active.id;
      return `${labelOf(active.id)} selecionado, na posição ${positionOf(active.id)} de ${ids.length}.`;
    },
    onDragOver: ({ active, over }) => {
      if (!over || over.id === lastOverId.current) return undefined;
      lastOverId.current = over.id;
      return `${labelOf(active.id)} movido para a posição ${positionOf(over.id)} de ${ids.length}.`;
    },
    onDragEnd: ({ active, over }) =>
      over ? `${labelOf(active.id)} solto na posição ${positionOf(over.id)} de ${ids.length}.` : `${labelOf(active.id)} solto.`,
    onDragCancel: ({ active }) => `Reordenação cancelada. ${labelOf(active.id)} voltou para a posição original.`,
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements, screenReaderInstructions }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <div className={className}>
          {items.map((item, index) => (
            <SortableItem
              key={getId(item)}
              id={getId(item)}
              label={getLabel(item)}
              disabled={disabled}
              className={itemClassName?.(item)}
            >
              {(handle) => children(item, handle, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

type SortableItemProps = {
  id: string;
  label: string;
  disabled: boolean;
  className?: string;
  children: (handle: ReactNode) => ReactNode;
};

function SortableItem({ id, label, disabled, className, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const handle = disabled ? null : (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="drag-handle"
      title="Arraste para reordenar"
      {...attributes}
      {...listeners}
      aria-label={`Reordenar ${label}`}
    >
      ⠿
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      className={`sortable-item${isDragging ? " dragging" : ""}${className ? ` ${className}` : ""}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {children(handle)}
    </div>
  );
}
