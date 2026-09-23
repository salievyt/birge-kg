"use client";

import type { ItemDto, ResourceKey, ResourceKind } from "@/lib/domain/types";

import { ItemCards } from "./ItemCards";
import { SkeletonCards } from "./Skeleton";

interface CatalogScreenProps {
  title: string;
  resource: ResourceKey;
  loading: boolean;
  items: ItemDto[];
  onItemOpen(item: ItemDto): void;
}

export function CatalogScreen({ title, resource, loading, items, onItemOpen }: CatalogScreenProps) {
  const kind: ResourceKind = resource === "events" ? "event" : resource === "ideas" ? "idea" : resource === "clubs" ? "club" : "project";

  return (
    <section className="screen">
      <p className="eyebrow">BIRGE / СООБЩЕСТВО</p>
      <h1>{title}</h1>
      {loading ? <SkeletonCards count={6} /> : <ItemCards items={items} kind={kind} onOpen={(item) => onItemOpen(item)} />}
    </section>
  );
}