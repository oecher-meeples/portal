export type LegalSection = {
  id: string;
  heading: string;
  paragraphs: string[];
  links?: { label: string; href: string }[];
};
