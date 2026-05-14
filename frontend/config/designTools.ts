export interface DesignTool {
  id: string;
  name: string;
  category: "audit" | "layout" | "visual" | "accessibility";
  description: string;
  status: "available" | "planned";
}

export const designTools: DesignTool[] = [
  {
    id: "light-theme-visual-qa",
    name: "Light Theme Visual QA",
    category: "visual",
    description: "Checks dashboard sections across desktop, tablet, and mobile breakpoints.",
    status: "available",
  },
  {
    id: "contrast-audit",
    name: "Contrast Audit",
    category: "accessibility",
    description: "Flags unreadable foreground/background combinations in key dashboard regions.",
    status: "available",
  },
  {
    id: "responsive-layout",
    name: "Responsive Layout Review",
    category: "layout",
    description: "Validates header, navigation, cards, charts, and panels for overflow or clipping.",
    status: "available",
  },
];

export default designTools;
