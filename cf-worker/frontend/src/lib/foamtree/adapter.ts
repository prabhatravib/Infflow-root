import { ClusterNode } from "../../types/cluster";

type FoamGroup = { id?: string; label?: string; weight?: number; groups?: FoamGroup[] };

export function toFoamTreeData(root: ClusterNode): { groups: FoamGroup[] } {
  const map = (n: ClusterNode): FoamGroup => {
    // Create display text with headline and description
    let displayText = '';
    if (n.headline && n.description) {
      // Add Unicode underline to headline
      const underlinedHeadline = addUnicodeUnderline(n.headline);
      displayText = `${underlinedHeadline}\n\n${n.description}`;
    } else if (n.headline) {
      // Add Unicode underline to headline
      const underlinedHeadline = addUnicodeUnderline(n.headline);
      displayText = underlinedHeadline;
    } else {
      displayText = n.label; // fallback to label if no headline
    }

    return {
      id: n.id,
      label: displayText,
      weight: n.weight ?? (n.items?.length || 1),
      groups: n.children?.map(map),
    };
  };
  // support both single root and forest
  return root.children ? { groups: root.children.map(map) } : { groups: [map(root)] };
}

// Function to add Unicode underline to text
function addUnicodeUnderline(text: string): string {
  // Unicode combining underline characters
  const underlineChars = [
    '\u0332', // Combining Low Line
    '\u0333', // Combining Double Low Line
    '\u033E', // Combining Double Overline
    '\u033F', // Combining Double Low Line
  ];
  
  // Use the first underline character (single underline)
  const underline = underlineChars[0];
  
  // Add underline to each character
  return text.split('').map(char => char + underline).join('');
}
