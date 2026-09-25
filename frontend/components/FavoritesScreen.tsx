"use client";

import { kindLabel } from "@/lib/domain/format";
import type { FavoriteDto, ResourceKind } from "@/lib/domain/types";

import { ItemCards } from "./ItemCards";
import { SkeletonCards } from "./Skeleton";

interface FavoritesScreenProps {
  favorites?: FavoriteDto[];
  loading: boolean;
  onOpenDetail(kind: ResourceKind, id: number): void;
  onOpenEvent(id: number): void;
  onRemoveFavorite(kind: ResourceKind, id: number): void;
}

export function FavoritesScreen({ favorites, loading, onOpenDetail, onOpenEvent, onRemoveFavorite }: FavoritesScreenProps) {
  if (loading && !favorites) return <section className="screen"><h1>Избранное</h1><SkeletonCards count={3} /></section>;
  const items = favorites ?? [];

  return (
    <section className="screen">
      <div className="blockHeader">
        <div><p className="eyebrow">СОХРАНЁННОЕ</p><h1>Избранное</h1></div>
      </div>
      {items.length === 0 ? (
        <p className="emptyState">Нет сохранённых публикаций.</p>
      ) : (
        <div className="favoriteGroups">
          {(["project", "idea", "club", "event"] as ResourceKind[]).map(resource => {
            const group = items.filter(f => f.resource_type === resource);
            if (!group.length) return null;
            return (
              <section key={resource}>
                <h2>{kindLabel(resource)}</h2>
                <ItemCards
                  items={group.map(f => f.item)}
                  kind={resource}
                  favorited
                  onOpen={(item) => (resource === "event" ? onOpenEvent(item.id) : onOpenDetail(resource, item.id))}
                  onFavorite={(item) => onRemoveFavorite(resource, item.id)}
                />
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
