import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
  draggable: "Para reordenar, use as setas para cima e para baixo. Também é possível arrastar com o mouse ou o toque.",
};

/**
 * Lista reordenável por arrastar (mouse ou toque) ou pelo teclado: com a alça ⠿ em foco, as setas movem
 * o item uma posição. O teclado não usa o sensor do dnd-kit, que rola a página em vez de mover o item
 * quando o destino está na metade de baixo da tela e só encontra o destino quando a rolagem termina.
 */
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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");
  // Alça que deve continuar com o foco depois que o item muda de lugar na lista.
  const pendingFocusId = useRef<string | null>(null);

  const ids = items.map(getId);
  const labelOf = (id: UniqueIdentifier) => {
    const item = items.find((candidate) => getId(candidate) === id);
    return item ? `"${getLabel(item)}"` : "item";
  };
  const positionOf = (id: UniqueIdentifier | undefined) => (id === undefined ? 0 : ids.indexOf(String(id)) + 1);

  useEffect(() => {
    const id = pendingFocusId.current;
    if (!id) return;
    pendingFocusId.current = null;
    const handle = containerRef.current?.querySelector<HTMLElement>(`[data-sortable-handle="${window.CSS.escape(id)}"]`);
    handle?.focus();
  }, [items]);

  // Avisos do arraste com mouse ou toque.
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${labelOf(active.id)} selecionado, na posição ${positionOf(active.id)} de ${ids.length}.`,
    onDragOver: () => undefined,
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

  const handleKeyDown = (id: string, event: KeyboardEvent<HTMLButtonElement>) => {
    const from = ids.indexOf(id);
    const targets: Record<string, number> = { ArrowUp: from - 1, ArrowDown: from + 1, Home: 0, End: ids.length - 1 };
    if (!(event.key in targets) || from < 0) return;
    event.preventDefault();

    const to = targets[event.key];
    if (to < 0 || to >= ids.length || to === from) {
      setAnnouncement(`${labelOf(id)} já está na ${from === 0 ? "primeira" : "última"} posição.`);
      return;
    }
    pendingFocusId.current = id;
    onReorder(arrayMove(items, from, to));
    setAnnouncement(`${labelOf(id)} movido para a posição ${to + 1} de ${ids.length}.`);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements, screenReaderInstructions }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <div className={className} ref={containerRef}>
          {items.map((item, index) => (
            <SortableItem
              key={getId(item)}
              id={getId(item)}
              label={getLabel(item)}
              disabled={disabled}
              className={itemClassName?.(item)}
              onKeyDown={(event) => handleKeyDown(getId(item), event)}
            >
              {(handle) => children(item, handle, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
      <div className="visually-hidden" role="status" aria-live="assertive" aria-atomic="true" data-sortable-announcer>
        {announcement}
      </div>
    </DndContext>
  );
}

type SortableItemProps = {
  id: string;
  label: string;
  disabled: boolean;
  className?: string;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  children: (handle: ReactNode) => ReactNode;
};

function SortableItem({ id, label, disabled, className, onKeyDown, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const handle = disabled ? null : (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="drag-handle"
      title="Arraste ou use as setas para reordenar"
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      data-sortable-handle={id}
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
