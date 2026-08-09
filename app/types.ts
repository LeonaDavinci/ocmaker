export type ColorDef = { id: number; hex: string };

export type Item = { id: number; thumb: string | null };

export type LayerRef = { id: number; z: number };

export type Part = {
  id: number;
  name: string;
  order: number;
  /** A part may paint on several z-levels (e.g. hair front + hair back). */
  layers: LayerRef[];
  z: number;
  removable: boolean;
  colors: ColorDef[];
  defaultItemId: number | null;
  thumb: string | null;
  rules: number[];
  items: Item[];
};

export type RuleGroup = { id: number; parts: number[] };

export type MakerManifest = {
  id: number | string;
  title: string;
  creator: string;
  canvas: { w: number; h: number };
  icon: string;
  tags: string[];
  ruleGroups: RuleGroup[];
  parts: Part[];
  /** itemId -> layerId -> colorId -> image url */
  images: Record<string, Record<string, Record<string, string>>>;
  defaults: Record<string, { itmId: number; cId: number }>;
};

export type PartSelection = { itemId: number | null; colorId: number | null };
export type Selection = Record<number, PartSelection>;

export type CatalogueEntry = {
  id: string;
  slug: string;
  name: string;
  franchise: string;
  category: string;
  rank: number;
  blurb: string;
  title: string;
  creator: string;
  icon: string;
  canvas: { w: number; h: number };
  tags: string[];
  parts: number;
  items: number;
  colors: number;
  images: number;
  combinations: number;
  manifestKB: number;
};
