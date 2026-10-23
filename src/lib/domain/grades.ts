export function gradeLabel(grade: number): string {
  return grade === 0 ? "Kindergarten" : `Grade ${grade}`;
}
