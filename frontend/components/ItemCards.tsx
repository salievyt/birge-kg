"use client";

import { Bookmark, ChevronRight } from "lucide-react";

import { itemMeta, itemTitle } from "@/lib/domain/format";
import type { ItemDto, ResourceKind } from "@/lib/domain/types";

interface ItemCardsProps {
  items: ItemDto[];
  kind?: ResourceKind | "people";
  favorited?: boolean;
  onOpen?(item: ItemDto, kind: ResourceKind | "people"): void;
  onFavorite?(item: ItemDto, kind: ResourceKind | "people"): void;
}

export function ItemCards({ items, kind, favorited, onOpen, onFavorite }: ItemCardsProps) {
  if (!items.length) return <p className="emptyState">Пока ничего нет.</p>;
  const resolveKind = (item: ItemDto): ResourceKind | "people" =>
    kind ?? (item.faculty || item.user?.username ? "people" : "project");

  return (
    <div className="cards">
      {items.map(item => {
        const itemKind = resolveKind(item);
        const openable = Boolean(onOpen && (itemKind !== "people" || item.user));
        return (
          <article className="card" key={item.id}>
            {item.image && <img className="cardMedia" src={item.image} alt="" loading="lazy" />}
            <div className="cardTop">
              <span>{itemMeta(item)}</span>
              <span>
                {(itemKind === "club" && item.is_moderated === false ? item.is_rejected ? "Отклонён" : "На модерации" : item.status_label) ||
                  (item.starts_at ? new Date(item.starts_at).toLocaleDateString("ru-RU") : "") ||
                  (item.votes !== undefined ? `★ ${item.votes}` : "")}
              </span>
            </div>
            <h3>
              {openable ? (
                <button className="cardTitle" onClick={() => onOpen?.(item, itemKind)}>
                  {itemTitle(item)} <ChevronRight size={16} aria-hidden />
                </button>
              ) : (
                itemTitle(item)
              )}
            </h3>
            <p>{item.description || item.body || item.location || item.motivation}</p>
            {item.skills && (
              <div className="tags">{item.skills.map(skill => <span className="tag" key={skill}>{skill}</span>)}</div>
            )}
            {item.needed_roles && !!item.needed_roles.length && (
              <div className="tags">{item.needed_roles.map(role => <span className="tag" key={role}>{role}</span>)}</div>
            )}
            <div className="cardFoot">
              {item.members_count !== undefined && <span className="mutedMeta">{item.members_count} в команде</span>}
              {item.attendees_count !== undefined && <span className="mutedMeta">{item.attendees_count} участников</span>}
              {onFavorite && (
                <button
                  className={`iconButton favoriteBtn ${favorited ? "isActive" : ""}`}
                  aria-label={favorited ? "Убрать из избранного" : "В избранное"}
                  onClick={() => onFavorite?.(item, itemKind)}
                >
                  <Bookmark size={16} />
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}