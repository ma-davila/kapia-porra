import type { Match } from "./schema";

export function stageLabel(m: Match): string {
  switch (m.stage) {
    case "group":
      return `Group ${m.groupLetter}`;
    case "r32":
      return "Round of 32";
    case "r16":
      return "Round of 16";
    case "qf":
      return "Quarter-final";
    case "sf":
      return "Semi-final";
    case "third":
      return "Third place";
    case "final":
      return "Final";
    default:
      return m.stage;
  }
}

export function stageShort(m: Match): string {
  switch (m.stage) {
    case "group":
      return m.groupLetter ?? "GRP";
    case "r32":
      return "R32";
    case "r16":
      return "R16";
    case "qf":
      return "QF";
    case "sf":
      return "SF";
    case "third":
      return "3RD";
    case "final":
      return "FINAL";
    default:
      return m.stage.toUpperCase();
  }
}
